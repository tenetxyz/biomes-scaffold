// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { Strings } from "@openzeppelin/contracts/utils/Strings.sol";

import "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorSettings.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorStorage.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";

import { StoreSwitch } from "@latticexyz/store/src/StoreSwitch.sol";
import { IWorld } from "@biomesaw/world/src/codegen/world/IWorld.sol";
import { VoxelCoord } from "@biomesaw/utils/src/Types.sol";
import { voxelCoordsAreEqual, inSurroundingCube } from "@biomesaw/utils/src/VoxelCoordUtils.sol";

// Available utils, remove the ones you don't need
// See ObjectTypeIds.sol for all available object types
import { PlayerObjectID, AirObjectID, DirtObjectID, ChestObjectID, BedrockObjectID } from "@biomesaw/world/src/ObjectTypeIds.sol";
import { getBuildArgs, getMineArgs, getMoveArgs, getHitArgs, getDropArgs, getTransferArgs, getCraftArgs, getEquipArgs, getLoginArgs, getSpawnArgs } from "../utils/HookUtils.sol";
import { getSystemId, isSystemId, callBuild, callMine, callMove, callHit, callDrop, callTransfer, callCraft, callEquip, callUnequip, callLogin, callLogout, callSpawn, callActivate } from "../utils/DelegationUtils.sol";
import { hasBeforeAndAfterSystemHook, getObjectTypeAtCoord, getEntityAtCoord, getPosition, getObjectType, getMiningDifficulty, getStackable, getDamage, getDurability, isTool, isBlock, getEntityFromPlayer, getPlayerFromEntity, getEquipped, getHealth, getStamina, getIsLoggedOff, getLastHitTime, getInventoryTool, getInventoryObjects, getCount, getNumSlotsUsed, getNumUsesLeft } from "../utils/EntityUtils.sol";
import { Area, insideArea, insideAreaIgnoreY, getEntitiesInArea } from "../utils/AreaUtils.sol";
import { Build, BuildWithPos, buildExistsInWorld, buildWithPosExistsInWorld } from "../utils/BuildUtils.sol";
import { NamedArea, NamedBuild, NamedBuildWithPos, weiToString, getEmptyBlockOnGround } from "../utils/GameUtils.sol";

import { IBedrockToken } from "../prototypes/IBedrockToken.sol";

struct BuildJob {
  uint256 id;
  string description;
  uint256 budget;
  address builder;
  BuildWithPos build;
}

interface IBuilderTracker {
  function getBuilder(VoxelCoord memory coord) external view returns (address);
}

// Bedrock DAO Contract
contract BedrockDAO is Governor, GovernorCountingSimple, GovernorVotes {
  address public immutable biomeWorldAddress;
  IBuilderTracker public builderTrackerAddress;
  IBedrockToken public bedrockToken;

  uint256 public bedrockTokenBuyPrice = 1 ether;

  BuildJob[] public buildJobs;
  mapping(address => uint256) public commitedBedrock;
  uint256 public commitmentEndBlockNumber;

  constructor(
    address _biomeWorldAddress,
    IBuilderTracker _builderTrackerAddress,
    IBedrockToken _token,
    address[] memory commitors,
    uint256[] memory commitments
  ) Governor("MyGovernor") GovernorVotes(_token) {
    biomeWorldAddress = _biomeWorldAddress;

    // Set the store address, so that when reading from MUD tables in the
    // Biomes world, we don't need to pass the store address every time.
    StoreSwitch.setStoreAddress(_biomeWorldAddress);

    builderTrackerAddress = _builderTrackerAddress;
    bedrockToken = _token;

    for (uint256 i = 0; i < commitors.length; i++) {
      commitedBedrock[commitors[i]] = commitments[i];
    }

    // 1 day = 24*60*60 = 86400 seconds, 2 second block time = 43200 blocks
    commitmentEndBlockNumber = block.number + (43200 * 30); // 30 days
  }

  function buyBedrockTokens(uint256 amount) external payable {
    require(msg.value == amount * bedrockTokenBuyPrice, "Incorrect Ether value");
    bedrockToken.mint(_msgSender(), amount * 10 ** bedrockToken.decimals());
  }

  function claimBedrockTokens() external {
    require(block.number > commitmentEndBlockNumber, "Commitment period not over");

    address msgSender = _msgSender();
    uint256 numCommitted = commitedBedrock[msgSender];
    uint256 bedrockUsed = 0;
    uint256 numRequestedBedrock = 0;
    // find all the proposals that the user has built
    uint256 amountEarned = 0;
    for (uint256 i = 0; i < buildJobs.length; i++) {
      uint256 numBedrock = 0;
      for (uint256 j = 0; j < buildJobs[i].build.objectTypeIds.length; j++) {
        if (buildJobs[i].build.objectTypeIds[j] == BedrockObjectID) {
          numBedrock++;
        }
      }
      if (buildJobs[i].builder == msgSender) {
        bedrockUsed += numBedrock;
        amountEarned += buildJobs[i].budget;
      }
      numRequestedBedrock += numBedrock;
    }
    // min of the bedrock used and the bedrock requested
    require(bedrockUsed >= numCommitted, "Not enough bedrock used to claim yet");

    // Transfer the budget to the builder
    (bool sent, ) = msgSender.call{ value: amountEarned }("");
    require(sent, "Failed to send Ether");

    // Mint 20% of the current supply
    uint256 mintAmount = bedrockToken.totalSupply() / 5;
    bedrockToken.mint(msgSender, mintAmount);

    // Update the bedrock commitment
    commitedBedrock[msgSender] = 0;
  }

  function addBuildJob(string memory description, uint256 budget, BuildWithPos memory build) external {
    require(_msgSender() == address(this), "Only the contract can add build jobs");
    require(build.objectTypeIds.length > 0, "Build must have at least one object type");
    require(
      build.objectTypeIds.length == build.relativePositions.length,
      "Object type and relative position arrays must be the same length"
    );

    // Require not an existing build
    uint256 currentTreasury = 0;
    for (uint256 i = 0; i < buildJobs.length; i++) {
      if (buildJobs[i].builder == address(0)) {
        currentTreasury += buildJobs[i].budget;
      }
      require(!voxelCoordsAreEqual(build.baseWorldCoord, buildJobs[i].build.baseWorldCoord), "Build already exists");
    }
    require(budget > 0, "Budget must be greater than 0");
    require(currentTreasury + budget <= address(this).balance, "Not enough funds in the treasury");

    uint256 proposalId = buildJobs.length;

    buildJobs.push();
    BuildJob storage newBuildJob = buildJobs[proposalId];
    newBuildJob.id = proposalId;
    newBuildJob.description = description;
    newBuildJob.budget = budget;
    newBuildJob.builder = address(0);
    newBuildJob.build.baseWorldCoord = build.baseWorldCoord;
    newBuildJob.build.objectTypeIds = build.objectTypeIds;

    for (uint256 i = 0; i < build.objectTypeIds.length; i++) {
      newBuildJob.build.relativePositions.push();
      newBuildJob.build.relativePositions[i] = VoxelCoord({
        x: build.relativePositions[i].x,
        y: build.relativePositions[i].y,
        z: build.relativePositions[i].z
      });
    }
  }

  function submitBuild(uint256 buildJobId) external {
    require(buildJobId < buildJobs.length, "Invalid build proposal ID");
    BuildJob storage buildJob = buildJobs[buildJobId];
    require(buildJob.builder == address(0), "Build already submitted");

    // Verify the build matches the proposal
    address msgSender = _msgSender();
    require(commitedBedrock[msgSender] > 0, "Not a commited builder");

    // Go through each relative position, aplpy it to the base world coord, and check if the object type id matches
    for (uint256 i = 0; i < buildJob.build.objectTypeIds.length; i++) {
      VoxelCoord memory absolutePosition = VoxelCoord({
        x: buildJob.build.baseWorldCoord.x + buildJob.build.relativePositions[i].x,
        y: buildJob.build.baseWorldCoord.y + buildJob.build.relativePositions[i].y,
        z: buildJob.build.baseWorldCoord.z + buildJob.build.relativePositions[i].z
      });
      bytes32 entityId = getEntityAtCoord(absolutePosition);

      uint8 objectTypeId;
      if (entityId == bytes32(0)) {
        // then it's the terrain
        objectTypeId = IWorld(biomeWorldAddress).getTerrainBlock(absolutePosition);
      } else {
        objectTypeId = getObjectType(entityId);

        address builder = builderTrackerAddress.getBuilder(absolutePosition);

        require(builder == msgSender, "Builder does not match");
      }
      if (objectTypeId != buildJob.build.objectTypeIds[i]) {
        revert("Build does not match");
      }
    }

    buildJob.builder = msgSender;
  }

  function getBuildJobs() external view returns (BuildJob[] memory) {
    return buildJobs;
  }

  // The following functions are overrides required by Solidity.

  function votingDelay() public pure override returns (uint256) {
    return 0; // 0 day
  }

  function votingPeriod() public pure override returns (uint256) {
    return 150; // 1 week
  }

  function quorum(uint256 blockNumber) public pure override returns (uint256) {
    return 1e18;
  }
}
