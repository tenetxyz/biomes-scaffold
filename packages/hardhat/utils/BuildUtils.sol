// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { IWorld } from "@biomesaw/world/src/codegen/world/IWorld.sol";
import { VoxelCoord } from "@biomesaw/utils/src/Types.sol";

import { voxelCoordsAreEqual } from "@biomesaw/utils/src/VoxelCoordUtils.sol";

import { getEntityAtCoord, getObjectType } from "./EntityUtils.sol";

struct Build {
  uint8[] objectTypeIds;
  VoxelCoord[] relativePositions;
}

struct BuildWithPos {
  uint8[] objectTypeIds;
  VoxelCoord[] relativePositions;
  VoxelCoord baseWorldCoord;
}

function buildExistsInWorld(
  address biomeWorldAddress,
  Build memory buildData,
  VoxelCoord memory baseWorldCoord
) returns (bool) {
  // Go through each relative position, apply it to the base world coord, and check if the object type id matches
  for (uint256 i = 0; i < buildData.objectTypeIds.length; i++) {
    VoxelCoord memory absolutePosition = VoxelCoord({
      x: baseWorldCoord.x + buildData.relativePositions[i].x,
      y: baseWorldCoord.y + buildData.relativePositions[i].y,
      z: baseWorldCoord.z + buildData.relativePositions[i].z
    });
    bytes32 entityId = getEntityAtCoord(absolutePosition);

    uint8 objectTypeId;
    if (entityId == bytes32(0)) {
      // then it's the terrain
      objectTypeId = IWorld(biomeWorldAddress).getTerrainBlock(absolutePosition);
    } else {
      objectTypeId = getObjectType(entityId);
    }
    if (objectTypeId != buildData.objectTypeIds[i]) {
      return false;
    }
  }

  return true;
}

function buildWithPosExistsInWorld(
  address biomeWorldAddress,
  BuildWithPos memory buildData,
  VoxelCoord memory baseWorldCoord
) returns (bool) {
  if (!voxelCoordsAreEqual(buildData.baseWorldCoord, baseWorldCoord)) {
    return false;
  }
  return
    buildExistsInWorld(
      biomeWorldAddress,
      Build({ objectTypeIds: buildData.objectTypeIds, relativePositions: buildData.relativePositions }),
      baseWorldCoord
    );
}
