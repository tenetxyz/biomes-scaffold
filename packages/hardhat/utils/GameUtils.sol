// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { Strings } from "@openzeppelin/contracts/utils/Strings.sol";
import { VoxelCoord } from "@biomesaw/utils/src/Types.sol";
import { AirObjectID } from "@biomesaw/world/src/ObjectTypeIds.sol";

import { Area } from "./AreaUtils.sol";
import { Build, BuildWithPos } from "./BuildUtils.sol";
import { getObjectTypeAtCoord } from "./EntityUtils.sol";

struct NamedArea {
  string name;
  Area area;
}

struct NamedBuild {
  string name;
  Build build;
}

struct NamedBuildWithPos {
  string name;
  BuildWithPos build;
}

function weiToString(uint256 valueInWei) pure returns (string memory) {
  return string.concat(Strings.toString(valueInWei / 1 ether), ".", decimalString(valueInWei % 1 ether, 18));
}

function decimalString(uint256 value, uint256 decimals) pure returns (string memory) {
  if (value == 0) {
    return "0";
  }

  bytes memory buffer = new bytes(decimals);
  uint256 length = 0;
  for (uint256 i = 0; i < decimals; i++) {
    value *= 10;
    uint8 digit = uint8(value / 1 ether);
    buffer[i] = bytes1(48 + digit);
    value %= 1 ether;
    if (digit != 0) {
      length = i + 1;
    }
  }

  bytes memory trimmedBuffer = new bytes(length);
  for (uint256 i = 0; i < length; i++) {
    trimmedBuffer[i] = buffer[i];
  }

  return string(trimmedBuffer);
}

function getEmptyBlockOnGround(address biomeWorldAddress, VoxelCoord memory centerCoord) returns (VoxelCoord memory) {
  for (int8 dx = -1; dx <= 1; dx++) {
    for (int8 dy = -1; dy <= 1; dy++) {
      for (int8 dz = -1; dz <= 1; dz++) {
        VoxelCoord memory coord = VoxelCoord({ x: centerCoord.x + dx, y: centerCoord.y + dy, z: centerCoord.z + dz });
        VoxelCoord memory coordBelow = VoxelCoord({
          x: centerCoord.x + dx,
          y: centerCoord.y + dy - 1,
          z: centerCoord.z + dz
        });

        if (
          getObjectTypeAtCoord(biomeWorldAddress, coord) == AirObjectID &&
          getObjectTypeAtCoord(biomeWorldAddress, coordBelow) != AirObjectID
        ) {
          return coord;
        }
      }
    }
  }
  revert("No empty block on ground");
}
