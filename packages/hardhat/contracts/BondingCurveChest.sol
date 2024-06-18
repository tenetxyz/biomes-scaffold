// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { StoreSwitch } from "@latticexyz/store/src/StoreSwitch.sol";
import { IERC165 } from "@latticexyz/store/src/IERC165.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

import { ChestMetadata, ChestMetadataData } from "@biomesaw/world/src/codegen/tables/ChestMetadata.sol";

import { IChestTransferHook } from "@biomesaw/world/src/prototypes/IChestTransferHook.sol";
import { PlayerObjectID } from "@biomesaw/world/src/ObjectTypeIds.sol";

import { getObjectType, getDurability, getNumUsesLeft, getPlayerFromEntity, getPosition, getCount } from "../utils/EntityUtils.sol";
import { ShopData, FullShopData } from "../utils/ShopUtils.sol";

import { IShopToken } from "./IShopToken.sol";

// Players send it items, and are given a token in return.
// Players send it token, and are given items in return.
// Price is determined by a bonding curve.
contract BondingCurveChest is IChestTransferHook, Ownable {
  address public immutable biomeWorldAddress;

  // Note: for now, we only support shops buying/selling one type of object.
  mapping(bytes32 => ShopData) private buyShopData;
  mapping(bytes32 => ShopData) private sellShopData;
  mapping(address => bytes32[]) private ownedChests;

  mapping(uint8 => address) private objectToToken;

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

  function updateObjectToToken(uint8 objectTypeId, address tokenAddress) external onlyOwner {
    objectToToken[objectTypeId] = tokenAddress;
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
    ChestMetadataData memory chestMetadata = ChestMetadata.get(chestEntityId);
    buyShopData[chestEntityId] = ShopData({ objectTypeId: 0, price: 0 });
    sellShopData[chestEntityId] = ShopData({ objectTypeId: 0, price: 0 });
    safeAddOwnedChest(chestMetadata.owner, chestEntityId);
  }

  function onHookRemoved(bytes32 chestEntityId) external onlyBiomeWorld {
    ChestMetadataData memory chestMetadata = ChestMetadata.get(chestEntityId);
    buyShopData[chestEntityId] = ShopData({ objectTypeId: 0, price: 0 });
    sellShopData[chestEntityId] = ShopData({ objectTypeId: 0, price: 0 });
    removeOwnedChest(chestMetadata.owner, chestEntityId);
  }

  function setupChest(bytes32 chestEntityId, uint8 objectTypeId) external {
    ChestMetadataData memory chestMetadata = ChestMetadata.get(chestEntityId);
    require(chestMetadata.owner == msg.sender, "Only the owner can set up the chest");

    buyShopData[chestEntityId] = ShopData({ objectTypeId: objectTypeId, price: 0 });
    sellShopData[chestEntityId] = ShopData({ objectTypeId: objectTypeId, price: 0 });

    require(objectToToken[objectTypeId] != address(0), "Token not set up");

    safeAddOwnedChest(chestMetadata.owner, chestEntityId);
  }

  function destroyChest(bytes32 chestEntityId, uint8 objectTypeId) external {
    ChestMetadataData memory chestMetadata = ChestMetadata.get(chestEntityId);
    require(chestMetadata.owner == msg.sender, "Only the owner can destroy the chest");
    require(buyShopData[chestEntityId].objectTypeId == objectTypeId, "Chest is not set up");
    require(sellShopData[chestEntityId].objectTypeId == objectTypeId, "Chest is not set up");

    buyShopData[chestEntityId] = ShopData({ objectTypeId: 0, price: 0 });
    sellShopData[chestEntityId] = ShopData({ objectTypeId: 0, price: 0 });
    removeOwnedChest(msg.sender, chestEntityId);
  }

  function blocksToTokens(uint16 supply, uint16 transferAmount) internal pure returns (uint256) {
    // Constant that adjusts the base rate of tokens per block
    uint256 k = 10 * 10 ** 18;

    // Constant that controls how the reward rate decreases as the chest fills up
    // uint256 alpha = 0.001;

    // Map supply to the range of 0 -- 10x10^10
    uint256 scaledSupply = (supply * 10 ** 10) / 1188;

    return (k * transferAmount) / (1 + (supply / 1000));
  }

  function allowTransfer(
    bytes32 srcEntityId,
    bytes32 dstEntityId,
    uint8 transferObjectTypeId,
    uint16 numToTransfer,
    bytes32 toolEntityId,
    bytes memory extraData
  ) external payable onlyBiomeWorld returns (bool) {
    bool isDeposit = getObjectType(srcEntityId) == PlayerObjectID;
    bytes32 chestEntityId = isDeposit ? dstEntityId : srcEntityId;
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

    ChestMetadataData memory chestMetadata = ChestMetadata.get(chestEntityId);
    require(chestMetadata.owner != address(0), "Chest does not exist");
    uint16 currentSupplyInChest = getCount(chestEntityId, transferObjectTypeId);

    address tokenAddress = objectToToken[transferObjectTypeId];
    require(tokenAddress != address(0), "Token not set up");
    address player = getPlayerFromEntity(isDeposit ? srcEntityId : dstEntityId);
    require(player != address(0), "Player does not exist");

    uint256 blockTokens = blocksToTokens(currentSupplyInChest, numToTransfer);

    if (isDeposit) {
      IShopToken(tokenAddress).mint(player, blockTokens);
    } else {
      // Note: ERC20 will check if the player has enough tokens
      IShopToken(tokenAddress).burn(player, blockTokens);
    }

    return true;
  }

  function supportsInterface(bytes4 interfaceId) external view override returns (bool) {
    return interfaceId == type(IChestTransferHook).interfaceId || interfaceId == type(IERC165).interfaceId;
  }

  function getBuyShopData(bytes32 chestEntityId) public view returns (ShopData memory) {
    ShopData memory buyData = buyShopData[chestEntityId];
    buyData.price = blocksToTokens(getCount(chestEntityId, buyData.objectTypeId), 1);
    return buyData;
  }

  function getSellShopData(bytes32 chestEntityId) public view returns (ShopData memory) {
    ShopData memory sellData = sellShopData[chestEntityId];
    sellData.price = blocksToTokens(getCount(chestEntityId, sellData.objectTypeId), 1);
    return sellData;
  }

  function getOwnedChests(address player) external view returns (bytes32[] memory) {
    return ownedChests[player];
  }

  function getFullShopData(bytes32 chestEntityId) public view returns (FullShopData memory) {
    return
      FullShopData({
        chestEntityId: chestEntityId,
        buyShopData: getBuyShopData(chestEntityId),
        sellShopData: getSellShopData(chestEntityId),
        balance: 0,
        location: getPosition(chestEntityId)
      });
  }

  function getFullShopData(address player) external view returns (FullShopData[] memory) {
    bytes32[] memory chestEntityIds = ownedChests[player];
    FullShopData[] memory fullShopData = new FullShopData[](chestEntityIds.length);

    for (uint i = 0; i < chestEntityIds.length; i++) {
      bytes32 chestEntityId = chestEntityIds[i];
      ChestMetadataData memory chestMetadata = ChestMetadata.get(chestEntityId);
      fullShopData[i] = getFullShopData(chestEntityId);
    }

    return fullShopData;
  }

  function getTokens() external view returns (address[] memory) {
    address[] memory tokens = new address[](256);
    uint16 numTokens = 0;
    for (uint16 i = 0; i < 256; i++) {
      address token = objectToToken[uint8(i)];
      if (token != address(0)) {
        tokens[numTokens] = token;
        numTokens++;
      }
    }
    address[] memory result = new address[](numTokens);
    for (uint16 i = 0; i < numTokens; i++) {
      result[i] = tokens[i];
    }
    return result;
  }
}
