// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { StoreSwitch } from "@latticexyz/store/src/StoreSwitch.sol";
import { IERC165 } from "@latticexyz/store/src/IERC165.sol";

import { ObjectType } from "@biomesaw/world/src/codegen/tables/ObjectType.sol";
import { ReversePlayer } from "@biomesaw/world/src/codegen/tables/ReversePlayer.sol";
import { ChestMetadata, ChestMetadataData } from "@biomesaw/world/src/codegen/tables/ChestMetadata.sol";

import { IChestTransferHook } from "@biomesaw/world/src/prototypes/IChestTransferHook.sol";
import { PlayerObjectID } from "@biomesaw/world/src/ObjectTypeIds.sol";

// Players send it items, and are given Ether in return.
contract BuyChest is IChestTransferHook {
  address public immutable biomeWorldAddress;

  mapping(bytes32 => mapping(uint8 => uint256)) public buyObjectPrices;
  mapping(bytes32 => mapping(uint8 => uint256)) public buyObjectBalances;
  mapping(bytes32 => uint8[]) public buyObjectTypes;

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

  function safeAddObjectType(bytes32 chestEntityId, uint8 buyObjectTypeId) internal {
    for (uint8 i = 0; i < buyObjectTypes[chestEntityId].length; i++) {
      if (buyObjectTypes[chestEntityId][i] == buyObjectTypeId) {
        return;
      }
    }
    buyObjectTypes[chestEntityId].push(buyObjectTypeId);
  }

  function isBuying(bytes32 chestEntityId, uint8 buyObjectTypeId) internal view returns (bool) {
    for (uint i = 0; i < buyObjectTypes[chestEntityId].length; i++) {
      if (buyObjectTypes[chestEntityId][i] == buyObjectTypeId) {
        return true;
      }
    }
    return false;
  }

  function setupBuyChest(bytes32 chestEntityId, uint8 buyObjectTypeId, uint256 buyPrice) external payable {
    ChestMetadataData memory chestMetadata = ChestMetadata.get(chestEntityId);
    require(chestMetadata.owner == msg.sender, "Only the owner can set up the chest");
    require(buyObjectBalances[chestEntityId][buyObjectTypeId] == 0, "Chest already has a balance");

    buyObjectPrices[chestEntityId][buyObjectTypeId] = buyPrice;
    buyObjectBalances[chestEntityId][buyObjectTypeId] = msg.value;

    safeAddObjectType(chestEntityId, buyObjectTypeId);
  }

  function changeBuyPrice(bytes32 chestEntityId, uint8 buyObjectTypeId, uint256 newPrice) external {
    ChestMetadataData memory chestMetadata = ChestMetadata.get(chestEntityId);
    require(chestMetadata.owner == msg.sender, "Only the owner can change the price");
    require(buyObjectBalances[chestEntityId][buyObjectTypeId] > 0, "Chest has no balance");

    buyObjectPrices[chestEntityId][buyObjectTypeId] = newPrice;
  }

  function refillBuyChestBalance(bytes32 chestEntityId, uint8 buyObjectTypeId) external payable {
    ChestMetadataData memory chestMetadata = ChestMetadata.get(chestEntityId);
    require(chestMetadata.owner == msg.sender, "Only the owner can refill the chest");
    require(buyObjectPrices[chestEntityId][buyObjectTypeId] > 0, "Chest has no price");

    buyObjectBalances[chestEntityId][buyObjectTypeId] += msg.value;
  }

  function withdrawBuyChestBalance(bytes32 chestEntityId, uint8 buyObjectTypeId, uint256 amount) public {
    ChestMetadataData memory chestMetadata = ChestMetadata.get(chestEntityId);
    require(chestMetadata.owner == msg.sender, "Only the owner can withdraw from the chest");

    require(buyObjectBalances[chestEntityId][buyObjectTypeId] >= amount, "Insufficient balance");
    buyObjectBalances[chestEntityId][buyObjectTypeId] -= amount;

    (bool sent, ) = msg.sender.call{ value: amount }("");
    require(sent, "Failed to send Ether");
  }

  function destroyBuyChest(bytes32 chestEntityId, uint8 buyObjectTypeId) external {
    ChestMetadataData memory chestMetadata = ChestMetadata.get(chestEntityId);
    require(chestMetadata.owner == msg.sender, "Only the owner can destroy the chest");

    withdrawBuyChestBalance(chestEntityId, buyObjectTypeId, buyObjectBalances[chestEntityId][buyObjectTypeId]);
    buyObjectPrices[chestEntityId][buyObjectTypeId] = 0;

    uint8[] storage buyTypes = buyObjectTypes[chestEntityId];
    for (uint i = 0; i < buyTypes.length; i++) {
      if (buyTypes[i] == buyObjectTypeId) {
        buyTypes[i] = buyTypes[buyTypes.length - 1];
        buyTypes.pop();
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
    bool isDeposit = ObjectType.get(srcEntityId) == PlayerObjectID;
    if (!isDeposit) {
      return false;
    }
    if (!isBuying(dstEntityId, transferObjectTypeId)) {
      return false;
    }

    uint256 buyPrice = buyObjectPrices[dstEntityId][transferObjectTypeId];
    if (buyPrice == 0) {
      return true;
    }

    uint256 amountToPay = numToTransfer * buyPrice;
    // Check if there is enough balance in the chest
    uint256 balance = buyObjectBalances[dstEntityId][transferObjectTypeId];
    if (balance < amountToPay) {
      return false;
    }

    address player = ReversePlayer.get(srcEntityId);
    (bool sent, ) = player.call{ value: amountToPay }("");
    require(sent, "Failed to send Ether");

    buyObjectBalances[dstEntityId][transferObjectTypeId] -= amountToPay;

    return true;
  }

  function supportsInterface(bytes4 interfaceId) external view override returns (bool) {
    return interfaceId == type(IChestTransferHook).interfaceId || interfaceId == type(IERC165).interfaceId;
  }
}
