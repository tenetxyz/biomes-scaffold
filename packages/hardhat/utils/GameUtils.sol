// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { VoxelCoord } from "@biomesaw/utils/src/Types.sol";

import { Area } from "./AreaUtils.sol";
import { Build, BuildWithPos } from "./BuildUtils.sol";
import { getObjectTypeAtCoord } from "./EntityUtils.sol";

enum GameState {
    Waiting,
    Countdown,
    Active,
    Finished,
}

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

function getEmptyBlockOnGround(
  address biomeWorldAddress,
  VoxelCoord memory centerCoord
) internal returns (VoxelCoord memory) {
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
