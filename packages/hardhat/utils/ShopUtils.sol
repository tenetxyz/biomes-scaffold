// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { VoxelCoord } from "@biomesaw/utils/src/Types.sol";

struct ShopData {
  uint8 objectTypeId;
  uint256 price;
}

struct FullShopData {
  bytes32 chestEntityId;
  ShopData buyShopData;
  ShopData sellShopData;
  uint256 balance;
  VoxelCoord location;
}
