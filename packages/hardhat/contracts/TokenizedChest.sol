// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { StoreSwitch } from "@latticexyz/store/src/StoreSwitch.sol";
import { IERC165 } from "@latticexyz/store/src/IERC165.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

import { IChip } from "@biomesaw/world/src/prototypes/IChip.sol";
import { PlayerObjectID } from "@biomesaw/world/src/ObjectTypeIds.sol";
import { MAX_CHEST_INVENTORY_SLOTS } from "@biomesaw/world/src/Constants.sol";

import { getObjectType, getDurability, getNumUsesLeft, getPlayerFromEntity, getPosition, getCount, getStackable } from "../utils/EntityUtils.sol";
import { ShopData, FullShopData } from "../utils/ShopUtils.sol";

import { IShopToken } from "./IShopToken.sol";

// Players send it items, and are given a token in return.
// Players send it token, and are given items in return.
// Price is based on block supply.
contract TokenizedChest is IChip, Ownable {
  address public immutable biomeWorldAddress;

  // Note: for now, we only support shops buying/selling one type of object.
  mapping(bytes32 => ShopData) private buyShopData;
  mapping(bytes32 => ShopData) private sellShopData;
  mapping(bytes32 => address) private chestOwner;
  mapping(address => bytes32[]) private ownedChests;

  mapping(uint8 => address) private objectToToken;
  mapping(uint8 => uint256) private totalObjectSupply;

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

  function onAttached(bytes32 playerEntityId, bytes32 chestEntityId) external onlyBiomeWorld {
    address owner = getPlayerFromEntity(playerEntityId);
    chestOwner[chestEntityId] = owner;

    buyShopData[chestEntityId] = ShopData({ objectTypeId: 0, price: 0 });
    sellShopData[chestEntityId] = ShopData({ objectTypeId: 0, price: 0 });
    safeAddOwnedChest(owner, chestEntityId);
  }

  function onDetached(bytes32 playerEntityId, bytes32 chestEntityId) external onlyBiomeWorld {
    address previousOwner = chestOwner[chestEntityId];

    require(buyShopData[chestEntityId].objectTypeId == sellShopData[chestEntityId].objectTypeId, "Chest is not set up");
    if (buyShopData[chestEntityId].objectTypeId != 0) {
      uint16 currentSupplyInChest = getCount(chestEntityId, buyShopData[chestEntityId].objectTypeId);
      totalObjectSupply[buyShopData[chestEntityId].objectTypeId] -= currentSupplyInChest;
    }

    buyShopData[chestEntityId] = ShopData({ objectTypeId: 0, price: 0 });
    sellShopData[chestEntityId] = ShopData({ objectTypeId: 0, price: 0 });

    removeOwnedChest(previousOwner, chestEntityId);
    chestOwner[chestEntityId] = address(0);
  }

  function onPowered(bytes32 playerEntityId, bytes32 entityId, uint16 numBattery) external onlyBiomeWorld {}

  function onChipHit(bytes32 playerEntityId, bytes32 entityId) external onlyBiomeWorld {}

  function setupChest(bytes32 chestEntityId, uint8 objectTypeId) external {
    address owner = chestOwner[chestEntityId];
    require(owner == msg.sender, "Only the owner can set up the chest");

    buyShopData[chestEntityId] = ShopData({ objectTypeId: objectTypeId, price: 0 });
    sellShopData[chestEntityId] = ShopData({ objectTypeId: objectTypeId, price: 0 });

    require(objectToToken[objectTypeId] != address(0), "Token not set up");
  }

  function destroyChest(bytes32 chestEntityId, uint8 objectTypeId) external {
    address owner = chestOwner[chestEntityId];
    require(owner == msg.sender, "Only the owner can destroy the chest");
    require(buyShopData[chestEntityId].objectTypeId == objectTypeId, "Chest is not set up");
    require(sellShopData[chestEntityId].objectTypeId == objectTypeId, "Chest is not set up");

    uint16 currentSupplyInChest = getCount(chestEntityId, objectTypeId);
    totalObjectSupply[objectTypeId] -= currentSupplyInChest;

    buyShopData[chestEntityId] = ShopData({ objectTypeId: 0, price: 0 });
    sellShopData[chestEntityId] = ShopData({ objectTypeId: 0, price: 0 });
  }

  function blocksToTokens(
    uint256 totalTokenSupply,
    uint256 supply,
    uint8 transferObjectTypeId,
    uint16 transferAmount,
    bool isDeposit
  ) internal view returns (uint256) {
    // Cumulatively sum the supply as it increases
    uint256 tokens = 0;
    for (uint16 i = 0; i < transferAmount; i++) {
      uint256 tokenIncrease = 0;
      if (supply == 0) {
        tokenIncrease = 1 * 10 ** 18;
      } else {
        tokenIncrease = totalTokenSupply / supply;
      }
      tokens += tokenIncrease;

      if (isDeposit) {
        supply++;
        totalTokenSupply += tokenIncrease;
      } else {
        if (supply > 0) {
          supply--;
        }
        if (totalTokenSupply > tokenIncrease) {
          totalTokenSupply -= tokenIncrease;
        } else {
          totalTokenSupply = 0;
        }
      }
    }

    return tokens;
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
    {
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
    }

    address owner = chestOwner[chestEntityId];
    require(owner != address(0), "Chest does not exist");

    address tokenAddress = objectToToken[transferObjectTypeId];
    require(tokenAddress != address(0), "Token not set up");
    uint256 tokenSupply = IShopToken(tokenAddress).totalSupply();
    address player = getPlayerFromEntity(isDeposit ? srcEntityId : dstEntityId);
    require(player != address(0), "Player does not exist");

    uint256 blockTokens = blocksToTokens(
      tokenSupply,
      totalObjectSupply[transferObjectTypeId],
      transferObjectTypeId,
      numToTransfer,
      isDeposit
    );

    if (isDeposit) {
      totalObjectSupply[transferObjectTypeId] += numToTransfer;
    } else {
      totalObjectSupply[transferObjectTypeId] -= numToTransfer;
    }

    if (isDeposit) {
      IShopToken(tokenAddress).mint(player, blockTokens);
    } else {
      // Note: ERC20 will check if the player has enough tokens
      IShopToken(tokenAddress).burn(player, blockTokens);
    }

    return true;
  }

  function supportsInterface(bytes4 interfaceId) external view override returns (bool) {
    return interfaceId == type(IChip).interfaceId || interfaceId == type(IERC165).interfaceId;
  }

  function getBuyShopData(bytes32 chestEntityId) public view returns (ShopData memory) {
    ShopData memory buyData = buyShopData[chestEntityId];
    address token = objectToToken[buyData.objectTypeId];
    buyData.price = blocksToTokens(
      IShopToken(token).totalSupply(),
      totalObjectSupply[buyData.objectTypeId],
      buyData.objectTypeId,
      1,
      true
    );
    return buyData;
  }

  function getSellShopData(bytes32 chestEntityId) public view returns (ShopData memory) {
    ShopData memory sellData = sellShopData[chestEntityId];
    address token = objectToToken[sellData.objectTypeId];
    sellData.price = blocksToTokens(
      IShopToken(token).totalSupply(),
      totalObjectSupply[sellData.objectTypeId],
      sellData.objectTypeId,
      1,
      false
    );
    return sellData;
  }

  function getOwnedChests(address player) external view returns (bytes32[] memory) {
    return ownedChests[player];
  }

  function getObjectSupply(uint8 objectTypeId) public view returns (uint256) {
    return totalObjectSupply[objectTypeId];
  }

  function getObjectTokenSupply(uint8 objectTypeId) public view returns (uint256) {
    return IShopToken(objectToToken[objectTypeId]).totalSupply();
  }

  function getObjectAndTokenSupply(uint8 objectTypeId) external view returns (uint256, uint256) {
    return (getObjectSupply(objectTypeId), getObjectTokenSupply(objectTypeId));
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
      address owner = chestOwner[chestEntityId];
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

  function getOwner(bytes32 chestEntityId) external view returns (address) {
    return chestOwner[chestEntityId];
  }
}
