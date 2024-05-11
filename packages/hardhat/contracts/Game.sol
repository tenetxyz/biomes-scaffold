// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { StoreSwitch } from "@latticexyz/store/src/StoreSwitch.sol";
import { ResourceId, WorldResourceIdLib, WorldResourceIdInstance } from "@latticexyz/world/src/WorldResourceId.sol";
import { Hook } from "@latticexyz/store/src/Hook.sol";
import { IERC165 } from "@latticexyz/world/src/IERC165.sol";
import { ICustomUnregisterDelegation } from "@latticexyz/world/src/ICustomUnregisterDelegation.sol";
import { IOptionalSystemHook } from "@latticexyz/world/src/IOptionalSystemHook.sol";
import { BEFORE_CALL_SYSTEM, AFTER_CALL_SYSTEM, ALL } from "@latticexyz/world/src/systemHookTypes.sol";
import { RESOURCE_SYSTEM } from "@latticexyz/world/src/worldResourceTypes.sol";
import { OptionalSystemHooks } from "@latticexyz/world/src/codegen/tables/OptionalSystemHooks.sol";
import { Build, buildExistsInWorld } from "../utils/BuildUtils.sol";
import { IWorld } from "@biomesaw/world/src/codegen/world/IWorld.sol";
import { VoxelCoord } from "@biomesaw/utils/src/Types.sol";
import { getObjectType, getEntityAtCoord, getPosition, getEntityFromPlayer, getObjectTypeAtCoord } from "../utils/EntityUtils.sol";
import { voxelCoordsAreEqual } from "@biomesaw/utils/src/VoxelCoordUtils.sol";
import { NamedBuild } from "../utils/GameUtils.sol";

struct NamePair {
  uint256 id;
  string name;
}

struct SubmissionPricePair {
  uint256 id;
  uint256 price;
}

struct BuilderList {
  uint256 id;
  address[] builderAddresses;
}

struct BlueprintPair {
  uint256 id;
  Build blueprint;
}

struct LocationPair {
  uint256 id;
  VoxelCoord[] location;
}

struct ListEntry {
  uint256 id;
  string name;
  uint256 price;
  address[] builders;
  Build blueprint;
  VoxelCoord[] locations;
}

contract Game is IOptionalSystemHook {
  address public immutable biomeWorldAddress;
  mapping(bytes32 => address) public coordHashToBuilder;

  uint256 public buildCount;
  mapping(uint256 => string) names;
  mapping(uint256 => Build) blueprints;
  mapping(uint256 => uint256) submissionPrices;
  mapping(uint256 => address[]) builders;
  mapping(uint256 => VoxelCoord[]) locations;
  mapping(address => uint256) earned;

  event GameNotif(address player, string message);

  ResourceId BuildSystemId = WorldResourceIdLib.encode({ typeId: RESOURCE_SYSTEM, namespace: "", name: "BuildSystem" });

  constructor(address _biomeWorldAddress) {
    biomeWorldAddress = _biomeWorldAddress;
    StoreSwitch.setStoreAddress(_biomeWorldAddress);
  }

  function create(
    uint8[] memory objectTypeIds,
    VoxelCoord[] memory relativePositions,
    uint256 submissionPrice,
    string memory name
  ) public {
    require(objectTypeIds.length > 0, "AddBuild: Must specify at least one object type ID.");
    require(
      objectTypeIds.length == relativePositions.length,
      "AddBuild: Number of object type IDs must match number of relative position."
    );
    require(
      voxelCoordsAreEqual(relativePositions[0], VoxelCoord({ x: 0, y: 0, z: 0 })),
      "AddBuild: First relative position must be (0, 0, 0)."
    );
    require(bytes(name).length > 0, "AddBuild: Must specify a name.");
    require(submissionPrice > 0, "AddBuild: Must specify a submission price.");

    buildCount++;

    Build storage newBuild = blueprints[buildCount];
    for (uint i = 0; i < objectTypeIds.length; ++i) {
      newBuild.objectTypeIds.push(objectTypeIds[i]);
    }
    for (uint i = 0; i < relativePositions.length; ++i) {
      newBuild.relativePositions.push(
        VoxelCoord({ x: relativePositions[i].x, y: relativePositions[i].y, z: relativePositions[i].z })
      );
    }

    submissionPrices[buildCount] = submissionPrice;
    names[buildCount] = name;
  }

  function submitBuilding(uint256 buildingId, VoxelCoord memory baseWorldCoord) external payable {
    require(buildingId <= buildCount, "Invalid building ID");
    Build memory blueprint = blueprints[buildingId];
    uint256 submissionPrice = submissionPrices[buildingId];
    VoxelCoord[] memory existingBuildLocations = locations[buildingId];
    address[] memory buildersAtId = builders[buildingId];

    address msgSender = msg.sender;
    require(msg.value == submissionPrice, "Incorrect submission price.");

    for (uint i = 0; i < existingBuildLocations.length; ++i) {
      if (voxelCoordsAreEqual(existingBuildLocations[i], baseWorldCoord)) {
        revert("Location already exists");
      }
    }

    // Go through each relative position, apply it to the base world coord, and check if the object type id matches
    for (uint256 i = 0; i < blueprint.objectTypeIds.length; i++) {
      VoxelCoord memory absolutePosition = VoxelCoord({
        x: baseWorldCoord.x + blueprint.relativePositions[i].x,
        y: baseWorldCoord.y + blueprint.relativePositions[i].y,
        z: baseWorldCoord.z + blueprint.relativePositions[i].z
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
      if (objectTypeId != blueprint.objectTypeIds[i]) {
        revert("Build does not match.");
      }
    }

    uint256 count = buildersAtId.length;

    builders[buildingId].push(msgSender);
    locations[buildingId].push(baseWorldCoord);

    if (count > 0) {
      uint256 splitAmount = msg.value / count;
      uint256 totalDistributed = splitAmount * count;
      uint256 remainder = msg.value - totalDistributed;

      for (uint256 i = 0; i < count; i++) {
        earned[buildersAtId[i]] += splitAmount;
        (bool sent, ) = buildersAtId[i].call{ value: splitAmount }("");
        require(sent, "Failed to send submission price to builder");
      }

      if (remainder > 0) {
        (bool sent, ) = msgSender.call{ value: remainder }("");
        require(sent, "Failed to refund remainder");
      }
    } else {
      earned[msgSender] += msg.value;
      (bool sent, ) = msgSender.call{ value: msg.value }("");
      require(sent, "Failed to send submission price back to initial builder");
    }
  }

  function deleteBuilding(uint256 buildingId, uint256 n) internal {
    require(n < builders[buildingId].length, "Invalid index");
    require(n < locations[buildingId].length, "Invalid index");

    uint256 lastBuilderIndex = builders[buildingId].length - 1;
    uint256 lastLocationIndex = locations[buildingId].length - 1;

    // Move the last element to the index `n` and then remove the last element for builders
    builders[buildingId][n] = builders[buildingId][lastBuilderIndex];
    builders[buildingId].pop();

    // Move the last element to the index `n` and then remove the last element for locations
    locations[buildingId][n] = locations[buildingId][lastLocationIndex];
    locations[buildingId].pop();
  }

  function challengeBuilding(uint256 buildingId, uint256 n) public {
    require(buildingId <= buildCount, "Invalid building ID");
    Build memory blueprint = blueprints[buildingId];
    require(n < locations[buildingId].length, "Invalid index");
    VoxelCoord memory baseWorldCoord = locations[buildingId][n];

    bool doesMatch = true;

    // Go through each relative position, apply it to the base world coord, and check if the object type id matches
    for (uint256 i = 0; i < blueprint.objectTypeIds.length; i++) {
      VoxelCoord memory absolutePosition = VoxelCoord({
        x: baseWorldCoord.x + blueprint.relativePositions[i].x,
        y: baseWorldCoord.y + blueprint.relativePositions[i].y,
        z: baseWorldCoord.z + blueprint.relativePositions[i].z
      });
      bytes32 entityId = getEntityAtCoord(absolutePosition);

      uint8 objectTypeId;
      if (entityId == bytes32(0)) {
        // then it's the terrain
        objectTypeId = IWorld(biomeWorldAddress).getTerrainBlock(absolutePosition);
      } else {
        objectTypeId = getObjectType(entityId);
      }
      if (objectTypeId != blueprint.objectTypeIds[i]) {
        doesMatch = false;
        break;
      }
    }

    if (!doesMatch) {
      deleteBuilding(buildingId, n);
    }
  }

  modifier onlyBiomeWorld() {
    require(msg.sender == biomeWorldAddress, "Caller is not the Biomes World contract");
    _; // Continue execution
  }

  function onAfterCallSystem(
    address msgSender,
    ResourceId systemId,
    bytes memory callData
  ) external override onlyBiomeWorld {
    if (ResourceId.unwrap(systemId) == ResourceId.unwrap(BuildSystemId)) {
      Slice callDataArgs = SliceLib.getSubslice(callData, 4);
      (, VoxelCoord memory coord) = abi.decode(callDataArgs.toBytes(), (uint8, VoxelCoord));
      coordHashToBuilder[getCoordHash(coord)] = msgSender;
    }
  }

  //EXTRA STUFF:

  function supportsInterface(bytes4 interfaceId) external view override returns (bool) {
    return interfaceId == type(IOptionalSystemHook).interfaceId || interfaceId == type(IERC165).interfaceId;
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

  //GETTERS:

  function getAllNames() public view returns (NamePair[] memory) {
    NamePair[] memory pairs = new NamePair[](buildCount);
    for (uint256 i = 1; i <= buildCount; i++) {
      pairs[i - 1] = NamePair(i, names[i]);
    }
    return pairs;
  }

  function getAllSubmissionPrices() public view returns (SubmissionPricePair[] memory) {
    SubmissionPricePair[] memory pairs = new SubmissionPricePair[](buildCount);
    for (uint256 i = 1; i <= buildCount; i++) {
      pairs[i - 1] = SubmissionPricePair(i, submissionPrices[i]);
    }
    return pairs;
  }

  function getAllBuilders() public view returns (BuilderList[] memory) {
    BuilderList[] memory buildersList = new BuilderList[](buildCount);
    for (uint256 i = 1; i <= buildCount; i++) {
      buildersList[i - 1] = BuilderList(i, builders[i]);
    }
    return buildersList;
  }

  function getAllLocations() public view returns (LocationPair[] memory) {
    LocationPair[] memory locationPair = new LocationPair[](buildCount);
    for (uint256 i = 1; i <= buildCount; i++) {
      locationPair[i - 1] = LocationPair(i, locations[i]);
    }
    return locationPair;
  }

  function getAllBlueprints() public view returns (BlueprintPair[] memory) {
    BlueprintPair[] memory blueprintPairs = new BlueprintPair[](buildCount);
    for (uint256 i = 1; i <= buildCount; i++) {
      blueprintPairs[i - 1] = BlueprintPair(i, blueprints[i]);
    }
    return blueprintPairs;
  }

  function getList() public view returns (ListEntry[] memory) {
    ListEntry[] memory entries = new ListEntry[](buildCount);
    for (uint256 i = 1; i <= buildCount; i++) {
      entries[i - 1] = ListEntry({
        id: i,
        name: names[i],
        price: submissionPrices[i],
        builders: builders[i],
        blueprint: blueprints[i],
        locations: locations[i]
      });
    }
    return entries;
  }

  // Getter for retrieving the balance of a specific address
  function getEarned() public view returns (uint256) {
    return earned[msg.sender];
  }

  function getDisplayName() external view returns (string memory) {
    return "Build A Nomics";
  }

  function getBuilds() external view returns (NamedBuild[] memory) {
    NamedBuild[] memory builds = new NamedBuild[](buildCount);
    for (uint256 i = 1; i <= buildCount; i++) {
      builds[i - 1] = NamedBuild({ name: names[i], build: blueprints[i] });
    }
    return builds;
  }
}
