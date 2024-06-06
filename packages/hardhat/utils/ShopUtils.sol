// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

struct ShopData {
  uint8 objectTypeId;
  uint256 price;
}

struct FullShopData {
  bytes32 chestEntityId;
  ShopData shopData;
  uint256 balance;
  bool isOwned;
}
