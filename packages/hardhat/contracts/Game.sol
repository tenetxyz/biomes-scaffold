// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { Strings } from "@openzeppelin/contracts/utils/Strings.sol";
import { StoreSwitch } from "@latticexyz/store/src/StoreSwitch.sol";
import { ResourceId, WorldResourceIdLib, WorldResourceIdInstance } from "@latticexyz/world/src/WorldResourceId.sol";
import { Hook } from "@latticexyz/store/src/Hook.sol";
import { IERC165 } from "@latticexyz/world/src/IERC165.sol";
import { ICustomUnregisterDelegation } from "@latticexyz/world/src/ICustomUnregisterDelegation.sol";
import { IOptionalSystemHook } from "@latticexyz/world/src/IOptionalSystemHook.sol";
import { BEFORE_CALL_SYSTEM, AFTER_CALL_SYSTEM, ALL } from "@latticexyz/world/src/systemHookTypes.sol";
import { RESOURCE_SYSTEM } from "@latticexyz/world/src/worldResourceTypes.sol";
import { OptionalSystemHooks } from "@latticexyz/world/src/codegen/tables/OptionalSystemHooks.sol";

import { IWorld } from "@biomesaw/world/src/codegen/world/IWorld.sol";
import { IDropSystem } from "@biomesaw/world/src/codegen/world/IDropSystem.sol";
import { VoxelCoord } from "@biomesaw/utils/src/Types.sol";
import { Build, buildExistsInWorld } from "../utils/BuildUtils.sol";
import { ObjectTypeMetadata } from "@biomesaw/world/src/codegen/tables/ObjectTypeMetadata.sol";
import { AirObjectID } from "@biomesaw/world/src/ObjectTypeIds.sol";
import { getObjectType, getEntityAtCoord, getPosition, getEntityFromPlayer, getObjectTypeAtCoord } from "../utils/EntityUtils.sol";
import { voxelCoordsAreEqual } from "@biomesaw/utils/src/VoxelCoordUtils.sol";
import { decodeCallData } from "../utils/HookUtils.sol";

import { NamedBuild, getEmptyBlockOnGround } from "../utils/GameUtils.sol";

contract Game is ICustomUnregisterDelegation, IOptionalSystemHook {
  address public immutable biomeWorldAddress;

  address public delegatorAddress;

  address[] public allowedItemDrops;
  mapping(bytes32 => address) public coordHashToBuilder;

  Build private build;

  ResourceId BuildSystemId = WorldResourceIdLib.encode({ typeId: RESOURCE_SYSTEM, namespace: "", name: "BuildSystem" });
  ResourceId DropSystemId = WorldResourceIdLib.encode({ typeId: RESOURCE_SYSTEM, namespace: "", name: "DropSystem" });

  event GameNotif(address player, string message);

  constructor(address _biomeWorldAddress, address _delegatorAddress) {
    biomeWorldAddress = _biomeWorldAddress;

    // Set the store address, so that when reading from MUD tables in the
    // Biomes world, we don't need to pass the store address every time.
    StoreSwitch.setStoreAddress(_biomeWorldAddress);

    delegatorAddress = _delegatorAddress;
  }

  // Use this modifier to restrict access to the Biomes World contract only
  // eg. for hooks that are only allowed to be called by the Biomes World contract
  modifier onlyBiomeWorld() {
    require(msg.sender == biomeWorldAddress, "Caller is not the Biomes World contract");
    _; // Continue execution
  }

  function supportsInterface(bytes4 interfaceId) external view override returns (bool) {
    return
      interfaceId == type(ICustomUnregisterDelegation).interfaceId ||
      interfaceId == type(IOptionalSystemHook).interfaceId ||
      interfaceId == type(IERC165).interfaceId;
  }

  function canUnregister(address delegator) external override onlyBiomeWorld returns (bool) {
    return allowedItemDrops.length == 0;
  }

  function onRegisterHook(
    address msgSender,
    ResourceId systemId,
    uint8 enabledHooksBitmap,
    bytes32 callDataHash
  ) external override onlyBiomeWorld {}

  function onUnregisterHook(
    address msgSender,
    ResourceId systemId,
    uint8 enabledHooksBitmap,
    bytes32 callDataHash
  ) external override onlyBiomeWorld {}

  function onBeforeCallSystem(
    address msgSender,
    ResourceId systemId,
    bytes memory callData
  ) external override onlyBiomeWorld {}

  function getCoordHash(VoxelCoord memory coord) internal pure returns (bytes32) {
    return bytes32(keccak256(abi.encode(coord.x, coord.y, coord.z)));
  }

  function onAfterCallSystem(
    address msgSender,
    ResourceId systemId,
    bytes memory callData
  ) external override onlyBiomeWorld {
    if (ResourceId.unwrap(systemId) == ResourceId.unwrap(BuildSystemId)) {
      (, bytes memory callDataArgs) = decodeCallData(callData);
      (, VoxelCoord memory coord) = abi.decode(callDataArgs, (uint8, VoxelCoord));
      coordHashToBuilder[getCoordHash(coord)] = msgSender;
    }
  }

  function setBuild(uint8[] memory objectTypeIds, VoxelCoord[] memory relativePositions) external {
    require(msg.sender == delegatorAddress, "Only delegator can add build");
    require(objectTypeIds.length > 0, "AddBuild: Must specify at least one object type ID");
    require(
      objectTypeIds.length == relativePositions.length,
      "AddBuild: Number of object type IDs must match number of relative positions"
    );
    require(
      voxelCoordsAreEqual(relativePositions[0], VoxelCoord({ x: 0, y: 0, z: 0 })),
      "AddBuild: First relative position must be (0, 0, 0)"
    );
    require(build.objectTypeIds.length == 0, "Logo build already set");

    for (uint i = 0; i < objectTypeIds.length; ++i) {
      build.objectTypeIds.push(objectTypeIds[i]);
    }
    for (uint i = 0; i < relativePositions.length; ++i) {
      build.relativePositions.push(
        VoxelCoord({ x: relativePositions[i].x, y: relativePositions[i].y, z: relativePositions[i].z })
      );
    }
  }

  function matchBuild(VoxelCoord memory baseWorldCoord) external {
    require(build.objectTypeIds.length > 0, "Logo build not set");

    address msgSender = msg.sender;

    // Go through each relative position, aplpy it to the base world coord, and check if the object type id matches
    for (uint256 i = 0; i < build.objectTypeIds.length; i++) {
      VoxelCoord memory absolutePosition = VoxelCoord({
        x: baseWorldCoord.x + build.relativePositions[i].x,
        y: baseWorldCoord.y + build.relativePositions[i].y,
        z: baseWorldCoord.z + build.relativePositions[i].z
      });
      bytes32 entityId = getEntityAtCoord(absolutePosition);

      uint8 objectTypeId;
      if (entityId == bytes32(0)) {
        // then it's the terrain
        objectTypeId = IWorld(biomeWorldAddress).getTerrainBlock(absolutePosition);
      } else {
        objectTypeId = getObjectType(entityId);

        address builder = coordHashToBuilder[getCoordHash(absolutePosition)];
        require(builder == msgSender, "Builder does not match");
      }
      if (objectTypeId != build.objectTypeIds[i]) {
        revert("Build does not match");
      }
    }

    // Add user to allowed item drops, if not already added
    bool isAllowed = false;
    for (uint i = 0; i < allowedItemDrops.length; i++) {
      if (allowedItemDrops[i] == msgSender) {
        isAllowed = true;
        break;
      }
    }
    require(!isAllowed, "Already allowed to drop items");
    allowedItemDrops.push(msgSender);

    emit GameNotif(delegatorAddress, "A new player has been added to allowed item drops");
  }

  function dropItem(bytes32 toolEntityId) external {
    address msgSender = msg.sender;
    bool isAllowed = false;
    for (uint i = 0; i < allowedItemDrops.length; i++) {
      if (allowedItemDrops[i] == msgSender) {
        allowedItemDrops[i] = allowedItemDrops[allowedItemDrops.length - 1];
        allowedItemDrops.pop();
        isAllowed = true;
        break;
      }
    }
    require(isAllowed, "Not allowed to drop items");

    bytes32 playerEntityId = getEntityFromPlayer(delegatorAddress);
    require(playerEntityId != bytes32(0), "Player entity not found");
    VoxelCoord memory playerPosition = getPosition(playerEntityId);
    VoxelCoord memory dropCoord = getEmptyBlockOnGround(biomeWorldAddress, playerPosition);

    bytes memory dropCallData = abi.encodeCall(IDropSystem.dropTool, (toolEntityId, dropCoord));

    IWorld(biomeWorldAddress).callFrom(delegatorAddress, DropSystemId, dropCallData);

    emit GameNotif(delegatorAddress, "Item dropped");
  }

  // Getters
  // ------------------------------------------------------------------------
  function getBuild() external view returns (Build memory) {
    return build;
  }

  function getAllowedItemDrops() external view returns (address[] memory) {
    return allowedItemDrops;
  }

  function getBuilds() external view returns (NamedBuild[] memory) {
    NamedBuild[] memory builds = new NamedBuild[](1);
    builds[0] = NamedBuild({ name: "Logo", build: build });
    return builds;
  }

  function getDisplayName() external view returns (string memory) {
    return "Build For Drops";
  }

  function getStatus() external view returns (string memory) {
    if (msg.sender == delegatorAddress) {
      if (build.objectTypeIds.length == 0) {
        return "Build not set yet. Please set the build.";
      }

      if (allowedItemDrops.length == 0) {
        return "No players have been submitted matching builds. Please wait.";
      }

      return string.concat("Build set. ", Strings.toString(allowedItemDrops.length), " players allowed to drop items.");
    } else {
      if (build.objectTypeIds.length == 0) {
        return "Build not set yet. Please wait.";
      }

      bool isAllowed = false;
      for (uint i = 0; i < allowedItemDrops.length; i++) {
        if (allowedItemDrops[i] == msg.sender) {
          isAllowed = true;
          break;
        }
      }
      if (isAllowed) {
        return "Allowed to drop items!";
      } else {
        return "Not allowed to drop items. Build and submit to be allowed.";
      }
    }
  }

  function getUnregisterMessage() external view returns (string memory) {
    if (msg.sender == delegatorAddress && allowedItemDrops.length > 0) {
      return
        string.concat(
          "You cannot unregister until all ",
          Strings.toString(allowedItemDrops.length),
          " players have used their allowed item drops."
        );
    }

    return "";
  }
}
