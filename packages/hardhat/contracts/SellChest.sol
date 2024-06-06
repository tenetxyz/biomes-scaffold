// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { StoreSwitch } from "@latticexyz/store/src/StoreSwitch.sol";
import { IERC165 } from "@latticexyz/store/src/IERC165.sol";

import { ChestMetadata, ChestMetadataData } from "@biomesaw/world/src/codegen/tables/ChestMetadata.sol";

import { IChestTransferHook } from "@biomesaw/world/src/prototypes/IChestTransferHook.sol";
import { PlayerObjectID } from "@biomesaw/world/src/ObjectTypeIds.sol";

import { getObjectType, getDurability, getNumUsesLeft, getPlayerFromEntity } from "../utils/EntityUtils.sol";
import { ShopData, FullShopData } from "../utils/ShopUtils.sol";

// Players send it ether, and are given items in return.
contract SellChest is IChestTransferHook {
  address public immutable biomeWorldAddress;

  // Note: for now, we only support shops selling one type of object.
  mapping(bytes32 => ShopData) private shopData;
  mapping(address => bytes32[]) private ownedChests;

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

  function safeAddOwnedChest(address player, bytes32 chestEntityId) internal {
    for (uint i = 0; i < ownedChests[player].length; i++) {
      if (ownedChests[player][i] == chestEntityId) {
        return;
      }
    }
    ownedChests[player].push(chestEntityId);
  }

  function removeOwnedChest(address player, bytes32 chestEntityId) internal {
    bytes32[] storage chests = ownedChests[player];
    for (uint i = 0; i < chests.length; i++) {
      if (chests[i] == chestEntityId) {
        chests[i] = chests[chests.length - 1];
        chests.pop();
        return;
      }
    }
  }

  function onHookSet(bytes32 chestEntityId) external onlyBiomeWorld {
    shopData[chestEntityId] = ShopData({ objectTypeId: 0, price: 0 });
  }

  function setupSellChest(bytes32 chestEntityId, uint8 sellObjectTypeId, uint256 sellPrice) external {
    ChestMetadataData memory chestMetadata = ChestMetadata.get(chestEntityId);
    require(chestMetadata.owner == msg.sender, "Only the owner can set up the chest");

    shopData[chestEntityId] = ShopData({ objectTypeId: sellObjectTypeId, price: sellPrice });
    safeAddOwnedChest(msg.sender, chestEntityId);
  }

  function destroySellChest(bytes32 chestEntityId, uint8 sellObjectTypeId) external {
    ChestMetadataData memory chestMetadata = ChestMetadata.get(chestEntityId);
    require(chestMetadata.owner == msg.sender, "Only the owner can destroy the chest");

    shopData[chestEntityId] = ShopData({ objectTypeId: 0, price: 0 });
    removeOwnedChest(msg.sender, chestEntityId);
  }

  function removeMinedChest(address player, bytes32 chestEntityId) external {
    ChestMetadataData memory chestMetadata = ChestMetadata.get(chestEntityId);
    require(chestMetadata.owner != player, "The player still owns the chest");
    removeOwnedChest(player, chestEntityId);
  }

  function allowTransfer(
    bytes32 srcEntityId,
    bytes32 dstEntityId,
    uint8 transferObjectTypeId,
    uint16 numToTransfer,
    bytes32 toolEntityId,
    bytes memory extraData
  ) external payable onlyBiomeWorld returns (bool) {
    bool isWithdrawl = getObjectType(dstEntityId) == PlayerObjectID;
    if (!isWithdrawl) {
      return false;
    }
    ShopData storage chestShopData = shopData[srcEntityId];
    if (chestShopData.objectTypeId != transferObjectTypeId) {
      return false;
    }
    if (toolEntityId != bytes32(0)) {
      require(
        getNumUsesLeft(toolEntityId) == getDurability(chestShopData.objectTypeId),
        "Tool must have full durability"
      );
    }

    uint256 sellPrice = chestShopData.price;
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

  function getShopData(bytes32 chestEntityId) external view returns (ShopData memory) {
    return shopData[chestEntityId];
  }

  function getFullShopData(address player) external view returns (FullShopData[] memory) {
    bytes32[] memory chests = ownedChests[player];
    FullShopData[] memory fullShopData = new FullShopData[](chests.length);
    for (uint i = 0; i < chests.length; i++) {
      ShopData memory shop = shopData[chests[i]];
      ChestMetadataData memory chestMetadata = ChestMetadata.get(chests[i]);
      fullShopData[i] = FullShopData({
        chestEntityId: chests[i],
        shopData: shop,
        balance: 0,
        isSetup: chestMetadata.owner == player && chestMetadata.onTransferHook == address(this)
      });
    }
    return fullShopData;
  }
}
