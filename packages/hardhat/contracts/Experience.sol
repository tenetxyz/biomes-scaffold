// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { Strings } from "@openzeppelin/contracts/utils/Strings.sol";
import { StoreSwitch } from "@latticexyz/store/src/StoreSwitch.sol";
import { ResourceId, WorldResourceIdLib, WorldResourceIdInstance } from "@latticexyz/world/src/WorldResourceId.sol";
import { Hook } from "@latticexyz/store/src/Hook.sol";
import { IERC165 } from "@latticexyz/world/src/IERC165.sol";
import { ICustomUnregisterDelegation } from "@latticexyz/world/src/ICustomUnregisterDelegation.sol";
import { IOptionalSystemHook } from "@latticexyz/world/src/IOptionalSystemHook.sol";
import { BEFORE_CALL_SYSTEM, AFTER_CALL_SYSTEM, ALL } from "@latticexyz/world/src/systemHookTypes.sol";
import { RESOURCE_SYSTEM } from "@latticexyz/world/src/worldResourceTypes.sol";
import { OptionalSystemHooks } from "@latticexyz/world/src/codegen/tables/OptionalSystemHooks.sol";

import { IWorld } from "@biomesaw/world/src/codegen/world/IWorld.sol";
import { VoxelCoord } from "@biomesaw/utils/src/Types.sol";
import { voxelCoordsAreEqual, inSurroundingCube } from "@biomesaw/utils/src/VoxelCoordUtils.sol";

// Available utils, remove the ones you don't need
// See ObjectTypeIds.sol for all available object types
import { PlayerObjectID, AirObjectID, DirtObjectID, ChestObjectID } from "@biomesaw/world/src/ObjectTypeIds.sol";
import { getBuildArgs, getMineArgs, getMoveArgs, getHitArgs, getDropArgs, getTransferArgs, getCraftArgs, getEquipArgs, getLoginArgs, getSpawnArgs } from "../utils/HookUtils.sol";
import { getSystemId, isSystemId, callBuild, callMine, callMove, callHit, callDrop, callTransfer, callCraft, callEquip, callUnequip, callLogin, callLogout, callSpawn, callActivate } from "../utils/DelegationUtils.sol";
import { hasBeforeAndAfterSystemHook, getObjectTypeAtCoord, getEntityAtCoord, getPosition, getObjectType, getMiningDifficulty, getStackable, getDamage, getDurability, isTool, isBlock, getEntityFromPlayer, getPlayerFromEntity, getEquipped, getHealth, getStamina, getIsLoggedOff, getLastHitTime, getInventoryTool, getInventoryObjects, getCount, getNumSlotsUsed, getNumUsesLeft } from "../utils/EntityUtils.sol";
import { Area, insideArea, insideAreaIgnoreY, getEntitiesInArea } from "../utils/AreaUtils.sol";
import { Build, BuildWithPos, buildExistsInWorld, buildWithPosExistsInWorld } from "../utils/BuildUtils.sol";
import { NamedArea, NamedBuild, NamedBuildWithPos, weiToString, getEmptyBlockOnGround } from "../utils/GameUtils.sol";

contract Experience is ICustomUnregisterDelegation, IOptionalSystemHook {
  address public immutable biomeWorldAddress;

  // Event to show a notification in the Biomes World
  event GameNotif(address player, string message);

  address public guardAddress;
  VoxelCoord public vaultChestCoord;

  // Track who put what in the vault chest
  mapping(bytes32 => address) public vaultChestToolOwners;
  mapping(address => mapping(uint8 => uint16)) public vaultChestObjectCounts;

  constructor(address _biomeWorldAddress, address _guardAddress) {
    biomeWorldAddress = _biomeWorldAddress;

    // Set the store address, so that when reading from MUD tables in the
    // Biomes world, we don't need to pass the store address every time.
    StoreSwitch.setStoreAddress(_biomeWorldAddress);

    guardAddress = _guardAddress;
  }

  // Use this modifier to restrict access to the Biomes World contract only
  // eg. for hooks that are only allowed to be called by the Biomes World contract
  modifier onlyBiomeWorld() {
    require(msg.sender == biomeWorldAddress, "Caller is not the Biomes World contract");
    _; // Continue execution
  }

  function setVaultChestCoord(VoxelCoord memory _vaultChestCoord) external {
    require(msg.sender == guardAddress, "Only the guard can set the vault chest coord");
    vaultChestCoord = _vaultChestCoord;
  }

  function supportsInterface(bytes4 interfaceId) external view override returns (bool) {
    return
      interfaceId == type(ICustomUnregisterDelegation).interfaceId ||
      interfaceId == type(IOptionalSystemHook).interfaceId ||
      interfaceId == type(IERC165).interfaceId;
  }

  function canUnregister(address delegator) external override onlyBiomeWorld returns (bool) {
    bytes32 vaultChestEntityId = getEntityAtCoord(vaultChestCoord);
    if (vaultChestEntityId != bytes32(0) && getNumSlotsUsed(vaultChestEntityId) > 0) {
      return false;
    }

    return true;
  }

  // Deposit into vault chest
  function onAfterCallSystem(
    address msgSender,
    ResourceId systemId,
    bytes memory callData
  ) external override onlyBiomeWorld {
    if (isSystemId(systemId, "TransferSystem")) {
      bytes32 vaultChestEntityId = getEntityAtCoord(vaultChestCoord);

      (
        bytes32 srcEntityId,
        bytes32 dstEntityId,
        uint8 transferObjectTypeId,
        uint16 numToTransfer,
        bytes32 toolEntityId
      ) = getTransferArgs(callData);
      // Check if dstEntityId is a chest that is beside the guard
      require(srcEntityId != vaultChestEntityId, "You can't transfer from the vault chest");
      require(dstEntityId != vaultChestEntityId, "You can't transfer to the vault chest");
      uint8 dstObjectType = getObjectType(dstEntityId);
      if (dstObjectType != ChestObjectID) {
        return;
      }
      bytes32 guardEntityId = getEntityFromPlayer(guardAddress);
      if (guardEntityId == bytes32(0)) {
        return;
      }
      VoxelCoord memory guardCoord = getPosition(guardEntityId);
      VoxelCoord memory dstCoord = getPosition(dstEntityId);
      if (inSurroundingCube(dstCoord, 1, guardCoord)) {
        if (vaultChestEntityId == bytes32(0)) {
          emit GameNotif(msgSender, "The vault chest is missing");
          return;
        }

        // Note: we don't check if the inventory of the guard or chest is full here
        // as the tansfer call will fail if the inventory is full

        // Transfer the items to the guard
        callTransfer(
          biomeWorldAddress,
          guardAddress,
          dstEntityId,
          guardEntityId,
          transferObjectTypeId,
          numToTransfer,
          toolEntityId
        );

        // Then, transfer the items to the vault chest
        callTransfer(
          biomeWorldAddress,
          guardAddress,
          guardEntityId,
          vaultChestEntityId,
          transferObjectTypeId,
          numToTransfer,
          toolEntityId
        );

        // Update the vault chest tool owners and object counts
        if (toolEntityId != bytes32(0)) {
          vaultChestToolOwners[toolEntityId] = msgSender;
        }

        vaultChestObjectCounts[msgSender][transferObjectTypeId] += numToTransfer;

        emit GameNotif(msgSender, "Items transferred to the vault chest");
      }
    }
  }

  function withdraw(uint8 objectTypeId, uint16 numToWithdraw, bytes32 withdrawChestEntityId) external {
    require(withdrawChestEntityId != bytes32(0), "The withdrawl chest is missing");
    bytes32 vaultChestEntityId = getEntityAtCoord(vaultChestCoord);
    require(withdrawChestEntityId != bytes32(0), "The vault chest is missing");
    bytes32 guardEntityId = getEntityFromPlayer(guardAddress);
    require(guardEntityId != bytes32(0), "The guard is missing");
    VoxelCoord memory guardCoord = getPosition(guardEntityId);
    VoxelCoord memory withdrawChestCoord = getPosition(withdrawChestEntityId);
    require(inSurroundingCube(withdrawChestCoord, 1, guardCoord), "The withdrawl chest is not beside the guard");
    require(!isTool(objectTypeId), "Use the withdrawTool function to withdraw tools");

    // Check if the player owns the items in the vault chest
    address player = msg.sender;
    require(
      vaultChestObjectCounts[player][objectTypeId] >= numToWithdraw,
      "You don't have enough items in the vault chest"
    );

    // Transfer the items to the guard
    callTransfer(
      biomeWorldAddress,
      guardAddress,
      vaultChestEntityId,
      guardEntityId,
      objectTypeId,
      numToWithdraw,
      bytes32(0)
    );

    // Then, transfer the items to the withdrawl chest
    callTransfer(
      biomeWorldAddress,
      guardAddress,
      guardEntityId,
      withdrawChestEntityId,
      objectTypeId,
      numToWithdraw,
      bytes32(0)
    );

    // Update the vault chest object counts
    vaultChestObjectCounts[player][objectTypeId] -= numToWithdraw;
  }

  function withdrawTool(bytes32 toolEntityId, bytes32 withdrawChestEntityId) external {
    require(withdrawChestEntityId != bytes32(0), "The withdrawl chest is missing");
    bytes32 vaultChestEntityId = getEntityAtCoord(vaultChestCoord);
    require(withdrawChestEntityId != bytes32(0), "The vault chest is missing");
    bytes32 guardEntityId = getEntityFromPlayer(guardAddress);
    require(guardEntityId != bytes32(0), "The guard is missing");
    VoxelCoord memory guardCoord = getPosition(guardEntityId);
    VoxelCoord memory withdrawChestCoord = getPosition(withdrawChestEntityId);
    require(inSurroundingCube(withdrawChestCoord, 1, guardCoord), "The withdrawl chest is not beside the guard");

    uint8 objectTypeId = getObjectType(toolEntityId);
    require(objectTypeId != uint8(0), "The tool is missing");
    require(isTool(objectTypeId), "The entity is not a tool");
    uint16 numToWithdraw = 1;

    // Check if the player owns the items in the vault chest
    address player = msg.sender;
    require(
      vaultChestObjectCounts[player][objectTypeId] >= numToWithdraw,
      "You don't have enough items in the vault chest"
    );
    require(vaultChestToolOwners[toolEntityId] == player, "You don't own the tool");

    // Transfer the items to the guard
    callTransfer(
      biomeWorldAddress,
      guardAddress,
      vaultChestEntityId,
      guardEntityId,
      objectTypeId,
      numToWithdraw,
      toolEntityId
    );

    // Then, transfer the items to the withdrawl chest
    callTransfer(
      biomeWorldAddress,
      guardAddress,
      guardEntityId,
      withdrawChestEntityId,
      objectTypeId,
      numToWithdraw,
      toolEntityId
    );

    // Update the vault chest object counts
    vaultChestObjectCounts[player][objectTypeId] -= numToWithdraw;
    vaultChestToolOwners[toolEntityId] = address(0);
  }

  function getDisplayName() external view returns (string memory) {
    return "Guard Service";
  }

  function getNumItemsInVaultChest() public view returns (uint256) {
    uint256 numItemsInVaultChest = 0;
    for (uint16 i = 0; i < 256; i++) {
      numItemsInVaultChest += vaultChestObjectCounts[msg.sender][uint8(i)];
    }
    return numItemsInVaultChest;
  }

  function getStatus() external view returns (string memory) {
    bytes32 guardEntityId = getEntityFromPlayer(guardAddress);
    if (guardEntityId == bytes32(0)) {
      return "ALERT: Guard is dead!";
    }

    return string.concat("You have ", Strings.toString(getNumItemsInVaultChest()), " items in the vault chest");
  }

  function onRegisterHook(
    address msgSender,
    ResourceId systemId,
    uint8 enabledHooksBitmap,
    bytes32 callDataHash
  ) external override onlyBiomeWorld {}

  function onUnregisterHook(
    address msgSender,
    ResourceId systemId,
    uint8 enabledHooksBitmap,
    bytes32 callDataHash
  ) external override onlyBiomeWorld {}

  function onBeforeCallSystem(
    address msgSender,
    ResourceId systemId,
    bytes memory callData
  ) external override onlyBiomeWorld {}
}
