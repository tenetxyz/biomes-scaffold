// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { StoreSwitch } from "@latticexyz/store/src/StoreSwitch.sol";
import { IERC165 } from "@latticexyz/store/src/IERC165.sol";

import { ObjectType } from "@biomesaw/world/src/codegen/tables/ObjectType.sol";
import { ReversePlayer } from "@biomesaw/world/src/codegen/tables/ReversePlayer.sol";
import { ChestMetadata, ChestMetadataData } from "@biomesaw/world/src/codegen/tables/ChestMetadata.sol";

import { IChestTransferHook } from "@biomesaw/world/src/prototypes/IChestTransferHook.sol";
import { PlayerObjectID } from "@biomesaw/world/src/ObjectTypeIds.sol";

// Players send it ether, and are given items in return.
contract SellChest is IChestTransferHook {
  address public immutable biomeWorldAddress;

  mapping(bytes32 => mapping(uint8 => uint256)) public sellObjectPrices;
  mapping(bytes32 => uint8[]) public sellObjectTypes;

  constructor(address _biomeWorldAddress) {
    biomeWorldAddress = _biomeWorldAddress;

    // Set the store address, so that when reading from MUD tables in the
    // Biomes world, we don't need to pass the store address every time.
    StoreSwitch.setStoreAddress(_biomeWorldAddress);
  }

  modifier onlyBiomeWorld() {
    require(msg.sender == biomeWorldAddress, "Caller is not the Biomes World contract");
    _; // Continue execution
  }

  function safeAddObjectType(bytes32 chestEntityId, uint8 sellObjectTypeId) internal {
    for (uint8 i = 0; i < sellObjectTypes[chestEntityId].length; i++) {
      if (sellObjectTypes[chestEntityId][i] == sellObjectTypeId) {
        return;
      }
    }
    sellObjectTypes[chestEntityId].push(sellObjectTypeId);
  }

  function isSelling(bytes32 chestEntityId, uint8 sellObjectTypeId) internal view returns (bool) {
    for (uint i = 0; i < sellObjectTypes[chestEntityId].length; i++) {
      if (sellObjectTypes[chestEntityId][i] == sellObjectTypeId) {
        return true;
      }
    }
    return false;
  }

  function setupSellChest(bytes32 chestEntityId, uint8 sellObjectTypeId, uint256 sellPrice) external {
    ChestMetadataData memory chestMetadata = ChestMetadata.get(chestEntityId);
    require(chestMetadata.owner == msg.sender, "Only the owner can set up the chest");

    sellObjectPrices[chestEntityId][sellObjectTypeId] = sellPrice;
    safeAddObjectType(chestEntityId, sellObjectTypeId);
  }

  function destroySellChest(bytes32 chestEntityId, uint8 sellObjectTypeId) external {
    ChestMetadataData memory chestMetadata = ChestMetadata.get(chestEntityId);
    require(chestMetadata.owner == msg.sender, "Only the owner can destroy the chest");

    sellObjectPrices[chestEntityId][sellObjectTypeId] = 0;

    uint8[] storage sellTypes = sellObjectTypes[chestEntityId];
    for (uint i = 0; i < sellTypes.length; i++) {
      if (sellTypes[i] == sellObjectTypeId) {
        sellTypes[i] = sellTypes[sellTypes.length - 1];
        sellTypes.pop();
        break;
      }
    }
  }

  function allowTransfer(
    bytes32 srcEntityId,
    bytes32 dstEntityId,
    uint8 transferObjectTypeId,
    uint16 numToTransfer,
    bytes32 toolEntityId,
    bytes memory extraData
  ) external payable onlyBiomeWorld returns (bool) {
    bool isWithdrawl = ObjectType.get(dstEntityId) == PlayerObjectID;
    if (!isWithdrawl) {
      return false;
    }
    if (!isSelling(srcEntityId, transferObjectTypeId)) {
      return false;
    }

    uint256 sellPrice = sellObjectPrices[srcEntityId][transferObjectTypeId];
    if (sellPrice == 0) {
      return true;
    }

    uint256 amountToCharge = sellPrice * numToTransfer;
    if (msg.value < amountToCharge) {
      return false;
    }
    ChestMetadataData memory chestMetadata = ChestMetadata.get(srcEntityId);
    require(chestMetadata.owner != address(0), "Chest does not exist");

    (bool sent, ) = chestMetadata.owner.call{ value: msg.value }("");
    require(sent, "Failed to send Ether");

    return true;
  }

  function supportsInterface(bytes4 interfaceId) external view override returns (bool) {
    return interfaceId == type(IChestTransferHook).interfaceId || interfaceId == type(IERC165).interfaceId;
  }
}
