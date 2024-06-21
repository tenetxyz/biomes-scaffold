// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { StoreSwitch } from "@latticexyz/store/src/StoreSwitch.sol";
import { IERC165 } from "@latticexyz/store/src/IERC165.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

import { IChip } from "@biomesaw/world/src/prototypes/IChip.sol";
import { PlayerObjectID } from "@biomesaw/world/src/ObjectTypeIds.sol";

import { getObjectType, getDurability, getNumUsesLeft, getPlayerFromEntity, getPosition } from "../utils/EntityUtils.sol";
import { ShopData, FullShopData } from "../utils/ShopUtils.sol";

// Players send it ether, and are given items in return.
contract SellChest is IChip, Ownable {
  address public immutable biomeWorldAddress;

  // Note: for now, we only support shops selling one type of object.
  mapping(bytes32 => ShopData) private shopData;
  mapping(bytes32 => address) private chestOwner;
  mapping(address => bytes32[]) private ownedChests;

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

  function onAttached(bytes32 playerEntityId, bytes32 chestEntityId) external onlyBiomeWorld {
    shopData[chestEntityId] = ShopData({ objectTypeId: 0, price: 0 });

    address owner = getPlayerFromEntity(playerEntityId);
    chestOwner[chestEntityId] = owner;
    safeAddOwnedChest(owner, chestEntityId);
  }

  function onDetached(bytes32 playerEntityId, bytes32 chestEntityId) external onlyBiomeWorld {
    address previousOwner = chestOwner[chestEntityId];
    shopData[chestEntityId] = ShopData({ objectTypeId: 0, price: 0 });

    removeOwnedChest(previousOwner, chestEntityId);
    chestOwner[chestEntityId] = address(0);
  }

  function onPowered(bytes32 playerEntityId, bytes32 entityId, uint16 numBattery) external onlyBiomeWorld {}

  function onChipHit(bytes32 playerEntityId, bytes32 entityId) external onlyBiomeWorld {}

  function setupSellChest(bytes32 chestEntityId, uint8 sellObjectTypeId, uint256 sellPrice) external {
    address owner = chestOwner[chestEntityId];
    require(owner == msg.sender, "Only the owner can set up the chest");

    shopData[chestEntityId] = ShopData({ objectTypeId: sellObjectTypeId, price: sellPrice });
  }

  function destroySellChest(bytes32 chestEntityId, uint8 sellObjectTypeId) external {
    address owner = chestOwner[chestEntityId];
    require(owner == msg.sender, "Only the owner can destroy the chest");

    shopData[chestEntityId] = ShopData({ objectTypeId: 0, price: 0 });
  }

  function onTransfer(
    bytes32 srcEntityId,
    bytes32 dstEntityId,
    uint8 transferObjectTypeId,
    uint16 numToTransfer,
    bytes32 toolEntityId,
    bytes memory extraData
  ) external payable onlyBiomeWorld returns (bool) {
    bool isDeposit = getObjectType(srcEntityId) == PlayerObjectID;
    bytes32 chestEntityId = isDeposit ? dstEntityId : srcEntityId;
    address owner = chestOwner[chestEntityId];
    require(owner != address(0), "Chest does not exist");
    address player = getPlayerFromEntity(isDeposit ? srcEntityId : dstEntityId);
    if (player == owner) {
      return true;
    }
    if (isDeposit) {
      return false;
    }
    ShopData storage chestShopData = shopData[chestEntityId];
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
    uint256 fee = (amountToCharge * 1) / 100; // 1% fee
    require(msg.value >= amountToCharge + fee, "Insufficient Ether sent");

    (bool sent, ) = owner.call{ value: amountToCharge }("");
    require(sent, "Failed to send Ether");

    return true;
  }

  function withdrawFees() external onlyOwner {
    (bool sent, ) = owner().call{ value: address(this).balance }("");
    require(sent, "Failed to send Ether");
  }

  function supportsInterface(bytes4 interfaceId) external view override returns (bool) {
    return interfaceId == type(IChip).interfaceId || interfaceId == type(IERC165).interfaceId;
  }

  function getShopData(bytes32 chestEntityId) external view returns (ShopData memory) {
    return shopData[chestEntityId];
  }

  function getFullShopData(bytes32 chestEntityId) external view returns (FullShopData memory) {
    address owner = chestOwner[chestEntityId];

    return
      FullShopData({
        chestEntityId: chestEntityId,
        buyShopData: ShopData({ objectTypeId: 0, price: 0 }),
        sellShopData: shopData[chestEntityId],
        balance: 0,
        location: getPosition(chestEntityId)
      });
  }

  function getFullShopData(address player) external view returns (FullShopData[] memory) {
    bytes32[] memory chestEntityIds = ownedChests[player];
    FullShopData[] memory fullShopData = new FullShopData[](chestEntityIds.length);
    for (uint i = 0; i < chestEntityIds.length; i++) {
      bytes32 chestEntityId = chestEntityIds[i];
      address owner = chestOwner[chestEntityId];
      fullShopData[i] = FullShopData({
        chestEntityId: chestEntityId,
        buyShopData: ShopData({ objectTypeId: 0, price: 0 }),
        sellShopData: shopData[chestEntityId],
        balance: 0,
        location: getPosition(chestEntityId)
      });
    }
    return fullShopData;
  }

  function getOwner(bytes32 chestEntityId) external view returns (address) {
    return chestOwner[chestEntityId];
  }
}
