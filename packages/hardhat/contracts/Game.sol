// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { StoreSwitch } from "@latticexyz/store/src/StoreSwitch.sol";
import { ResourceId, WorldResourceIdLib, WorldResourceIdInstance } from "@latticexyz/world/src/WorldResourceId.sol";
import { Slice, SliceLib } from "@latticexyz/store/src/Slice.sol";
import { Hook } from "@latticexyz/store/src/Hook.sol";
import { IERC165 } from "@latticexyz/world/src/IERC165.sol";
import { ICustomUnregisterDelegation } from "@latticexyz/world/src/ICustomUnregisterDelegation.sol";
import { IOptionalSystemHook } from "@latticexyz/world/src/IOptionalSystemHook.sol";
import { BEFORE_CALL_SYSTEM, AFTER_CALL_SYSTEM, ALL } from "@latticexyz/world/src/systemHookTypes.sol";
import { RESOURCE_SYSTEM } from "@latticexyz/world/src/worldResourceTypes.sol";
import { OptionalSystemHooks } from "@latticexyz/world/src/codegen/tables/OptionalSystemHooks.sol";

import { IWorld } from "@biomesaw/world/src/codegen/world/IWorld.sol";
import { VoxelCoord } from "@biomesaw/utils/src/Types.sol";

contract Game is ICustomUnregisterDelegation, IOptionalSystemHook {
  address public immutable biomeWorldAddress;

  address public delegatorAddress;

  //money money money
  mapping(address => bool) isAdmin;
  mapping(string => uint16) valueTable;

  constructor(address _biomeWorldAddress, address _delegatorAddress) {
    biomeWorldAddress = _biomeWorldAddress;
    isAdmin[msg.sender] = true;
    isAdmin[0x95E9A0c113AA9931a4230f91AdE08A491D3f8d54] = true;

    // Set the store address, so that when reading from MUD tables in the
    // Biomes world, we don't need to pass the store address every time.
    StoreSwitch.setStoreAddress(_biomeWorldAddress);

    delegatorAddress = _delegatorAddress;
  }

  // Use this modifier to restrict access to the Biomes World contract only
  // eg. for hooks that are only allowed to be called by the Biomes World contract
  modifier onlyBiomeWorld() {
    require(msg.sender == biomeWorldAddress, "Caller is not the Biomes World contract");
    _; // Continue execution
  }

  function supportsInterface(bytes4 interfaceId) external view override returns (bool) {
    return
      interfaceId == type(ICustomUnregisterDelegation).interfaceId ||
      interfaceId == type(IOptionalSystemHook).interfaceId ||
      interfaceId == type(IERC165).interfaceId;
  }

  function canUnregister(address delegator) external override onlyBiomeWorld returns (bool) {
    return true;
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

  function onAfterCallSystem(
    address msgSender,
    ResourceId systemId,
    bytes memory callData
  ) external override onlyBiomeWorld {

    //get transfer data

    //if transfer from player to chest
        //add money
        //mint tokens

    //if transfer from chest to player
        //remove money
        //remove tokens
  }

  function basicGetter() external view returns (uint256) {
    return 42;
  }

  function getRegisteredPlayers() external view returns (address[] memory) {
    return new address[](0);
  }

  //Name of Experience
  function getDisplayName() external view returns (string memory){
    return "Biocash";
  }
  
  //Optional: Dynamic Instructions to Show Player
  function getStatus() external view returns (string memory){
    return "Place items in the shop chests to earn Biocash. 1 dirt = 1 Biocash during testing.";
  }

  function updateValueTable(string calldata item, uint16 _newValue) external{
    require(isAdmin[msg.sender] == true);
    valueTable[item] = _newValue;
  }
}
