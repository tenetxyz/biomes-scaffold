// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { StoreSwitch } from "@latticexyz/store/src/StoreSwitch.sol";
import { IERC165 } from "@latticexyz/store/src/IERC165.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

import { IChip } from "@biomesaw/world/src/prototypes/IChip.sol";
import { PlayerObjectID } from "@biomesaw/world/src/ObjectTypeIds.sol";

import { getObjectType, getDurability, getNumUsesLeft, getPlayerFromEntity, getPosition } from "../utils/EntityUtils.sol";
import { ShopData, FullShopData } from "../utils/ShopUtils.sol";

// Only the owner can transfer items in and out of the chest.
contract OwnedChest is IChip, Ownable {
  address public immutable biomeWorldAddress;

  mapping(bytes32 => address) private chestOwner;

  constructor(address _biomeWorldAddress) Ownable(msg.sender) {
    biomeWorldAddress = _biomeWorldAddress;

    // Set the store address, so that when reading from MUD tables in the
    // Biomes world, we don't need to pass the store address every time.
    StoreSwitch.setStoreAddress(_biomeWorldAddress);
  }

  modifier onlyBiomeWorld() {
    require(msg.sender == biomeWorldAddress, "Caller is not the Biomes World contract");
    _; // Continue execution
  }

  function onAttached(bytes32 playerEntityId, bytes32 chestEntityId) external onlyBiomeWorld {
    address owner = getPlayerFromEntity(playerEntityId);
    chestOwner[chestEntityId] = owner;
  }

  function onDetached(bytes32 playerEntityId, bytes32 chestEntityId) external onlyBiomeWorld {
    chestOwner[chestEntityId] = address(0);
  }

  function onPowered(bytes32 playerEntityId, bytes32 entityId, uint16 numBattery) external onlyBiomeWorld {}

  function onChipHit(bytes32 playerEntityId, bytes32 entityId) external onlyBiomeWorld {}

  function onTransfer(
    bytes32 srcEntityId,
    bytes32 dstEntityId,
    uint8 transferObjectTypeId,
    uint16 numToTransfer,
    bytes32 toolEntityId,
    bytes memory extraData
  ) external payable onlyBiomeWorld returns (bool) {
    bytes32 playerEntityId = getObjectType(srcEntityId) == PlayerObjectID ? srcEntityId : dstEntityId;
    bytes32 chestEntityId = playerEntityId == srcEntityId ? dstEntityId : srcEntityId;
    address owner = chestOwner[chestEntityId];
    address player = getPlayerFromEntity(playerEntityId);
    if (player == owner) {
      return true;
    }

    return false;
  }

  function supportsInterface(bytes4 interfaceId) external view override returns (bool) {
    return interfaceId == type(IChip).interfaceId || interfaceId == type(IERC165).interfaceId;
  }

  function getOwner(bytes32 chestEntityId) external view returns (address) {
    return chestOwner[chestEntityId];
  }
}
