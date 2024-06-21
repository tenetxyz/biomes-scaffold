// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { StoreSwitch } from "@latticexyz/store/src/StoreSwitch.sol";
import { IERC165 } from "@latticexyz/store/src/IERC165.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

import { IChip } from "@biomesaw/world/src/prototypes/IChip.sol";
import { PlayerObjectID } from "@biomesaw/world/src/ObjectTypeIds.sol";

import { getObjectType, getDurability, getNumUsesLeft, getPlayerFromEntity, getPosition } from "../utils/EntityUtils.sol";
import { ShopData, FullShopData } from "../utils/ShopUtils.sol";

// Players send it items, and are given Ether in return.
// Players send it ether, and are given items in return.
contract BuySellChest is IChip, Ownable {
  address public immutable biomeWorldAddress;

  // Note: for now, we only support shops buying/selling one type of object.
  mapping(bytes32 => ShopData) private buyShopData;
  mapping(bytes32 => ShopData) private sellShopData;
  mapping(address => mapping(bytes32 => uint256)) private balances;
  mapping(bytes32 => address) private chestOwner;
  mapping(address => bytes32[]) private ownedChests;
  uint256 public totalFees;

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
    address owner = getPlayerFromEntity(playerEntityId);
    chestOwner[chestEntityId] = owner;

    buyShopData[chestEntityId] = ShopData({ objectTypeId: 0, price: 0 });
    sellShopData[chestEntityId] = ShopData({ objectTypeId: 0, price: 0 });

    uint256 currentBalance = balances[owner][chestEntityId];
    if (currentBalance > 0) {
      doWithdraw(owner, chestEntityId, currentBalance);
    }
    safeAddOwnedChest(owner, chestEntityId);
  }

  function onDetached(bytes32 playerEntityId, bytes32 chestEntityId) external onlyBiomeWorld {
    address previousOwner = chestOwner[chestEntityId];
    buyShopData[chestEntityId] = ShopData({ objectTypeId: 0, price: 0 });
    sellShopData[chestEntityId] = ShopData({ objectTypeId: 0, price: 0 });

    uint256 currentBalance = balances[previousOwner][chestEntityId];
    if (currentBalance > 0) {
      doWithdraw(previousOwner, chestEntityId, currentBalance);
    }
    removeOwnedChest(previousOwner, chestEntityId);

    chestOwner[chestEntityId] = address(0);
  }

  function onPowered(bytes32 playerEntityId, bytes32 entityId, uint16 numBattery) external onlyBiomeWorld {}

  function onChipHit(bytes32 playerEntityId, bytes32 entityId) external onlyBiomeWorld {}

  function setupChest(bytes32 chestEntityId, uint8 objectTypeId, uint256 buyPrice, uint256 sellPrice) external payable {
    address owner = chestOwner[chestEntityId];
    require(owner == msg.sender, "Only the owner can set up the chest");
    require(balances[owner][chestEntityId] == 0, "Chest already has a balance");

    buyShopData[chestEntityId] = ShopData({ objectTypeId: objectTypeId, price: buyPrice });
    sellShopData[chestEntityId] = ShopData({ objectTypeId: objectTypeId, price: sellPrice });

    balances[owner][chestEntityId] = msg.value;
  }

  function changeBuyPrice(bytes32 chestEntityId, uint8 buyObjectTypeId, uint256 newPrice) external {
    address owner = chestOwner[chestEntityId];
    require(owner == msg.sender, "Only the owner can change the price");
    require(buyShopData[chestEntityId].objectTypeId == buyObjectTypeId, "Chest is not set up");

    buyShopData[chestEntityId].price = newPrice;
  }

  function changeSellPrice(bytes32 chestEntityId, uint8 sellObjectTypeId, uint256 newPrice) external {
    address owner = chestOwner[chestEntityId];
    require(owner == msg.sender, "Only the owner can change the price");
    require(sellShopData[chestEntityId].objectTypeId == sellObjectTypeId, "Chest is not set up");

    sellShopData[chestEntityId].price = newPrice;
  }

  function refillBuyChestBalance(bytes32 chestEntityId, uint8 buyObjectTypeId) external payable {
    address owner = chestOwner[chestEntityId];
    require(owner == msg.sender, "Only the owner can refill the chest");
    require(buyShopData[chestEntityId].objectTypeId == buyObjectTypeId, "Chest is not set up");

    balances[owner][chestEntityId] += msg.value;
    safeAddOwnedChest(owner, chestEntityId);
  }

  function withdrawBuyChestBalance(bytes32 chestEntityId, uint256 amount) public {
    doWithdraw(msg.sender, chestEntityId, amount);
  }

  function doWithdraw(address player, bytes32 chestEntityId, uint256 amount) internal {
    require(amount > 0, "Amount must be greater than 0");
    require(balances[player][chestEntityId] >= amount, "Insufficient balance");
    balances[player][chestEntityId] -= amount;

    (bool sent, ) = player.call{ value: amount }("");
    require(sent, "Failed to send Ether");
  }

  function destroyChest(bytes32 chestEntityId, uint8 objectTypeId) external {
    address owner = chestOwner[chestEntityId];
    require(owner == msg.sender, "Only the owner can destroy the chest");
    require(buyShopData[chestEntityId].objectTypeId == objectTypeId, "Chest is not set up");
    require(sellShopData[chestEntityId].objectTypeId == objectTypeId, "Chest is not set up");

    if (balances[owner][chestEntityId] > 0) {
      withdrawBuyChestBalance(chestEntityId, balances[owner][chestEntityId]);
    }

    buyShopData[chestEntityId] = ShopData({ objectTypeId: 0, price: 0 });
    sellShopData[chestEntityId] = ShopData({ objectTypeId: 0, price: 0 });
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

    ShopData storage chestShopData = isDeposit ? buyShopData[chestEntityId] : sellShopData[chestEntityId];
    if (chestShopData.objectTypeId != transferObjectTypeId) {
      return false;
    }
    if (toolEntityId != bytes32(0)) {
      require(
        getNumUsesLeft(toolEntityId) == getDurability(chestShopData.objectTypeId),
        "Tool must have full durability"
      );
    }

    uint256 shopPrice = chestShopData.price;
    if (shopPrice == 0) {
      return true;
    }

    uint256 shopTotalPrice = numToTransfer * shopPrice;
    uint256 fee = (shopTotalPrice * 1) / 100; // 1% fee

    if (isDeposit) {
      // Check if there is enough balance in the chest
      uint256 balance = balances[owner][chestEntityId];
      require(balance >= shopTotalPrice + fee, "Insufficient balance in chest");

      balances[owner][chestEntityId] -= shopTotalPrice + fee;
      totalFees += fee;

      (bool sent, ) = player.call{ value: shopTotalPrice }("");
      require(sent, "Failed to send Ether");
    } else {
      require(msg.value >= shopTotalPrice + fee, "Insufficient Ether sent");

      (bool sent, ) = owner.call{ value: shopTotalPrice }("");
      require(sent, "Failed to send Ether");
    }

    return true;
  }

  function withdrawFees() external onlyOwner {
    uint256 withdrawAmount = totalFees;
    totalFees = 0;
    (bool sent, ) = owner().call{ value: withdrawAmount }("");
    require(sent, "Failed to send Ether");
  }

  function supportsInterface(bytes4 interfaceId) external view override returns (bool) {
    return interfaceId == type(IChip).interfaceId || interfaceId == type(IERC165).interfaceId;
  }

  function getBuyShopData(bytes32 chestEntityId) external view returns (ShopData memory) {
    return buyShopData[chestEntityId];
  }

  function getSellShopData(bytes32 chestEntityId) external view returns (ShopData memory) {
    return sellShopData[chestEntityId];
  }

  function getOwnedChests(address player) external view returns (bytes32[] memory) {
    return ownedChests[player];
  }

  function getBalance(address player, bytes32 chestEntityId) external view returns (uint256) {
    return balances[player][chestEntityId];
  }

  function getFullShopData(bytes32 chestEntityId) external view returns (FullShopData memory) {
    address owner = chestOwner[chestEntityId];
    return
      FullShopData({
        chestEntityId: chestEntityId,
        buyShopData: buyShopData[chestEntityId],
        sellShopData: sellShopData[chestEntityId],
        balance: balances[owner][chestEntityId],
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
        buyShopData: buyShopData[chestEntityId],
        sellShopData: sellShopData[chestEntityId],
        balance: balances[player][chestEntityId],
        location: getPosition(chestEntityId)
      });
    }

    return fullShopData;
  }
}
