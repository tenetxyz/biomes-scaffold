// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { StoreSwitch } from "@latticexyz/store/src/StoreSwitch.sol";
import { IERC165 } from "@latticexyz/store/src/IERC165.sol";

import { ObjectType } from "@biomesaw/world/src/codegen/tables/ObjectType.sol";
import { ReversePlayer } from "@biomesaw/world/src/codegen/tables/ReversePlayer.sol";
import { ChestMetadata, ChestMetadataData } from "@biomesaw/world/src/codegen/tables/ChestMetadata.sol";

import { IChestTransferHook } from "@biomesaw/world/src/prototypes/IChestTransferHook.sol";
import { PlayerObjectID } from "@biomesaw/world/src/ObjectTypeIds.sol";

struct ShopData {
  uint8 objectTypeId;
  uint256 price;
}

// Players send it items, and are given Ether in return.
contract BuyChest is IChestTransferHook {
  address public immutable biomeWorldAddress;

  // Note: for now, we only support shops buying one type of object.
  mapping(bytes32 => ShopData) private shopData;
  mapping(address => mapping(bytes32 => uint256)) private balances;
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

  function setupBuyChest(bytes32 chestEntityId, uint8 buyObjectTypeId, uint256 buyPrice) external payable {
    ChestMetadataData memory chestMetadata = ChestMetadata.get(chestEntityId);
    require(chestMetadata.owner == msg.sender, "Only the owner can set up the chest");
    require(balances[chestMetadata.owner][chestEntityId] == 0, "Chest already has a balance");

    shopData[chestEntityId] = ShopData({ objectTypeId: buyObjectTypeId, price: buyPrice });
    balances[chestMetadata.owner][chestEntityId] = msg.value;
    safeAddOwnedChest(chestMetadata.owner, chestEntityId);
  }

  function changeBuyPrice(
    bytes32 chestEntityId,
    uint8 buyObjectTypeId,
    uint256 newPrice,
    uint256 withdrawAmount
  ) external payable {
    ChestMetadataData memory chestMetadata = ChestMetadata.get(chestEntityId);
    require(chestMetadata.owner == msg.sender, "Only the owner can change the price");
    require(shopData[chestEntityId].objectTypeId == buyObjectTypeId, "Chest is not set up");

    shopData[chestEntityId].price = newPrice;

    balances[chestMetadata.owner][chestEntityId] += msg.value;

    withdrawBuyChestBalance(chestEntityId, withdrawAmount);
  }

  function refillBuyChestBalance(bytes32 chestEntityId, uint8 buyObjectTypeId) public payable {
    ChestMetadataData memory chestMetadata = ChestMetadata.get(chestEntityId);
    require(chestMetadata.owner == msg.sender, "Only the owner can refill the chest");
    require(shopData[chestEntityId].objectTypeId == buyObjectTypeId, "Chest is not set up");

    balances[chestMetadata.owner][chestEntityId] += msg.value;
  }

  function withdrawBuyChestBalance(bytes32 chestEntityId, uint256 amount) public {
    // Note: We don't read ChestMetadataData here because the chest may have been destroyed.
    require(balances[msg.sender][chestEntityId] >= amount, "Insufficient balance");
    balances[msg.sender][chestEntityId] -= amount;

    if (balances[msg.sender][chestEntityId] == 0) {
      removeOwnedChest(msg.sender, chestEntityId);
    }

    (bool sent, ) = msg.sender.call{ value: amount }("");
    require(sent, "Failed to send Ether");
  }

  function destroyBuyChest(bytes32 chestEntityId, uint8 buyObjectTypeId) external {
    ChestMetadataData memory chestMetadata = ChestMetadata.get(chestEntityId);
    require(chestMetadata.owner == msg.sender, "Only the owner can destroy the chest");
    require(shopData[chestEntityId].objectTypeId == buyObjectTypeId, "Chest is not set up");

    withdrawBuyChestBalance(chestEntityId, balances[chestMetadata.owner][chestEntityId]);
    shopData[chestEntityId] = ShopData({ objectTypeId: 0, price: 0 });
  }

  function allowTransfer(
    bytes32 srcEntityId,
    bytes32 dstEntityId,
    uint8 transferObjectTypeId,
    uint16 numToTransfer,
    bytes32 toolEntityId,
    bytes memory extraData
  ) external payable onlyBiomeWorld returns (bool) {
    {
      bool isDeposit = ObjectType.get(srcEntityId) == PlayerObjectID;
      if (!isDeposit) {
        return false;
      }
    }

    ShopData storage chestShopData = shopData[dstEntityId];
    if (chestShopData.objectTypeId != transferObjectTypeId) {
      return false;
    }

    uint256 buyPrice = chestShopData.price;
    if (buyPrice == 0) {
      return true;
    }

    uint256 amountToPay = numToTransfer * buyPrice;

    // Check if there is enough balance in the chest
    ChestMetadataData memory chestMetadata = ChestMetadata.get(dstEntityId);
    uint256 balance = balances[chestMetadata.owner][dstEntityId];
    if (balance < amountToPay) {
      return false;
    }

    balances[chestMetadata.owner][dstEntityId] -= amountToPay;

    address player = ReversePlayer.get(srcEntityId);
    (bool sent, ) = player.call{ value: amountToPay }("");
    require(sent, "Failed to send Ether");

    return true;
  }

  function supportsInterface(bytes4 interfaceId) external view override returns (bool) {
    return interfaceId == type(IChestTransferHook).interfaceId || interfaceId == type(IERC165).interfaceId;
  }

  function getShopData(bytes32 chestEntityId) external view returns (ShopData memory) {
    return shopData[chestEntityId];
  }

  function getOwnedChests(address player) external view returns (bytes32[] memory) {
    return ownedChests[player];
  }

  function getBalance(address player, bytes32 chestEntityId) external view returns (uint256) {
    return balances[player][chestEntityId];
  }
}
