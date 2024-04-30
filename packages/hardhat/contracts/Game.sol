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

import { IWorld } from "@biomesaw/world/src/codegen/world/IWorld.sol";
import { VoxelCoord } from "@biomesaw/utils/src/Types.sol";
import { Area, insideAreaIgnoreY } from "../utils/AreaUtils.sol";
import { hasBeforeAndAfterSystemHook, getEntityAtCoord, getEntityFromPlayer, getPosition, getIsLoggedOff, getPlayerFromEntity } from "../utils/EntityUtils.sol";

struct LeaderboardEntry {
  address player;
  bool isAlive;
  uint256 kills;
}

contract Game is IOptionalSystemHook {
  address public immutable biomeWorldAddress;

  address[] private alivePlayers;
  address[] private deadPlayers;
  address[] private disqualifiedPlayers;
  mapping(address => uint256) private numKills;
  Area private matchArea;
  bool public isGameStarted = false;
  address public gameStarter;
  uint256 public gameEndBlock;

  event GameNotif(address player, string message);

  ResourceId MoveSystemId = WorldResourceIdLib.encode({ typeId: RESOURCE_SYSTEM, namespace: "", name: "MoveSystem" });
  ResourceId HitSystemId = WorldResourceIdLib.encode({ typeId: RESOURCE_SYSTEM, namespace: "", name: "HitSystem" });
  ResourceId LogoffSystemId =
    WorldResourceIdLib.encode({ typeId: RESOURCE_SYSTEM, namespace: "", name: "LogoffSystem" });
  ResourceId MineSystemId = WorldResourceIdLib.encode({ typeId: RESOURCE_SYSTEM, namespace: "", name: "MineSystem" });

  constructor(
    address _biomeWorldAddress,
    VoxelCoord memory lowerSouthwestCorner,
    VoxelCoord memory size,
    address _gameStarter
  ) {
    biomeWorldAddress = _biomeWorldAddress;

    // Set the store address, so that when reading from MUD tables in the
    // Biomes world, we don't need to pass the store address every time.
    StoreSwitch.setStoreAddress(_biomeWorldAddress);

    matchArea.lowerSouthwestCorner = lowerSouthwestCorner;
    matchArea.size = size;

    gameStarter = _gameStarter;
  }

  // Use this modifier to restrict access to the Biomes World contract only
  // eg. for hooks that are only allowed to be called by the Biomes World contract
  modifier onlyBiomeWorld() {
    require(msg.sender == biomeWorldAddress, "Caller is not the Biomes World contract");
    _; // Continue execution
  }

  function supportsInterface(bytes4 interfaceId) external view override returns (bool) {
    return interfaceId == type(IOptionalSystemHook).interfaceId || interfaceId == type(IERC165).interfaceId;
  }

  function onRegisterHook(
    address msgSender,
    ResourceId systemId,
    uint8 enabledHooksBitmap,
    bytes32 callDataHash
  ) external override onlyBiomeWorld {
    require(!isGameStarted, "Game has already started.");
    require(getEntityFromPlayer(msgSender) != bytes32(0), "Player entity not found in Biome world");
  }

  function onUnregisterHook(
    address msgSender,
    ResourceId systemId,
    uint8 enabledHooksBitmap,
    bytes32 callDataHash
  ) external override onlyBiomeWorld {
    disqualifyPlayer(msgSender);
  }

  function onBeforeCallSystem(
    address msgSender,
    ResourceId systemId,
    bytes memory callData
  ) external override onlyBiomeWorld {}

  function onAfterCallSystem(
    address msgSender,
    ResourceId systemId,
    bytes memory callData
  ) external override onlyBiomeWorld {
    bool isRegistered = false;
    bool isAlive = false;
    for (uint i = 0; i < alivePlayers.length; i++) {
      if (alivePlayers[i] == msgSender) {
        isRegistered = true;
        isAlive = true;
        break;
      }
    }
    for (uint i = 0; i < deadPlayers.length; i++) {
      if (deadPlayers[i] == msgSender) {
        isRegistered = true;
        break;
      }
    }
    if (!isRegistered) {
      return;
    }

    if (ResourceId.unwrap(systemId) == ResourceId.unwrap(LogoffSystemId)) {
      require(!isGameStarted, "Cannot logoff during the game");
      return;
    } else if (ResourceId.unwrap(systemId) == ResourceId.unwrap(HitSystemId)) {
      Slice callDataArgs = SliceLib.getSubslice(callData, 4);
      address hitPlayer = abi.decode(callDataArgs.toBytes(), (address));

      bool isHitAlivePlayer = false;
      for (uint i = 0; i < alivePlayers.length; i++) {
        if (alivePlayers[i] == hitPlayer) {
          isHitAlivePlayer = true;
          break;
        }
      }

      if (isGameStarted && isAlive) {
        (uint256 numNewDeadPlayers, bool msgSenderDied) = updateAlivePlayers(msgSender);
        if (msgSenderDied) {
          numNewDeadPlayers -= 1;
        }
        numKills[msgSender] += numNewDeadPlayers;
      } else {
        require(!isHitAlivePlayer, "Cannot hit game players before the game starts or if you died.");
      }
    } else if (ResourceId.unwrap(systemId) == ResourceId.unwrap(MineSystemId)) {
      if (!isGameStarted || !isAlive) {
        return;
      }

      (uint256 numNewDeadPlayers, bool msgSenderDied) = updateAlivePlayers(msgSender);
      if (msgSenderDied) {
        numNewDeadPlayers -= 1;
      }
      numKills[msgSender] += numNewDeadPlayers;
    } else if (ResourceId.unwrap(systemId) == ResourceId.unwrap(MoveSystemId)) {
      if (!isGameStarted) {
        return;
      }
      bytes32 playerEntity = getEntityFromPlayer(msgSender);
      VoxelCoord memory playerPosition = getPosition(playerEntity);
      if (isAlive) {
        require(
          insideAreaIgnoreY(matchArea, playerPosition),
          "Cannot move outside the match area while the game is running"
        );
      } else {
        require(
          !insideAreaIgnoreY(matchArea, playerPosition),
          "Cannot move inside the match area while the game is running and you are dead."
        );
      }
    }
  }

  function startGame(uint256 numBlocksToEnd) external {
    require(msg.sender == gameStarter, "Only the game starter can start the game.");
    require(!isGameStarted, "Game has already started.");

    for (uint i = 0; i < alivePlayers.length; i++) {
      bytes32 playerEntity = getEntityFromPlayer(alivePlayers[i]);
      VoxelCoord memory playerPosition = getPosition(playerEntity);
      if (playerEntity == bytes32(0) || getIsLoggedOff(playerEntity) || !insideAreaIgnoreY(matchArea, playerPosition)) {
        disqualifyPlayer(alivePlayers[i]);
      }
    }

    isGameStarted = true;
    gameEndBlock = block.number + numBlocksToEnd;
  }

  function setMatchArea(VoxelCoord memory lowerSouthwestCorner, VoxelCoord memory size) external {
    require(msg.sender == gameStarter, "Only the game starter can set the match area");
    require(!isGameStarted, "Game has already started.");

    matchArea.lowerSouthwestCorner = lowerSouthwestCorner;
    matchArea.size = size;
  }

  function registerPlayer() external payable {
    require(!isGameStarted, "Game has already started.");
    require(msg.value >= 0.0015 ether, "Must send atleast minimum ETH to register");

    address player = msg.sender;
    require(
      hasBeforeAndAfterSystemHook(address(this), player, MoveSystemId),
      "The player hasn't allowed the move hook yet"
    );
    require(
      hasBeforeAndAfterSystemHook(address(this), player, HitSystemId),
      "The player hasn't allowed the hit hook yet"
    );
    require(
      hasBeforeAndAfterSystemHook(address(this), player, LogoffSystemId),
      "The player hasn't allowed the logoff hook yet"
    );
    require(
      hasBeforeAndAfterSystemHook(address(this), player, MineSystemId),
      "The player hasn't allowed the mine hook yet"
    );

    for (uint i = 0; i < alivePlayers.length; i++) {
      if (alivePlayers[i] == player) {
        revert("Player already registered");
      }
    }
    for (uint i = 0; i < deadPlayers.length; i++) {
      if (deadPlayers[i] == player) {
        revert("Player is dead");
      }
    }
    for (uint i = 0; i < disqualifiedPlayers.length; i++) {
      if (disqualifiedPlayers[i] == player) {
        revert("Player is disqualified");
      }
    }

    alivePlayers.push(player);
  }

  function updateAlivePlayers(address msgSender) internal returns (uint256, bool) {
    address[] memory newAlivePlayers = new address[](alivePlayers.length);
    uint256 numNewDeadPlayers = 0;
    bool msgSenderDied = false;
    for (uint i = 0; i < alivePlayers.length; i++) {
      bytes32 playerEntity = getEntityFromPlayer(alivePlayers[i]);
      if (playerEntity == bytes32(0)) {
        numNewDeadPlayers++;
        if (alivePlayers[i] == msgSender) {
          msgSenderDied = true;
        }
        bool markedDead = false;
        for (uint j = 0; j < deadPlayers.length; j++) {
          if (deadPlayers[j] == alivePlayers[i]) {
            markedDead = true;
            break;
          }
        }
        if (!markedDead) {
          deadPlayers.push(alivePlayers[i]);
        }
      } else {
        newAlivePlayers[i] = alivePlayers[i];
      }
    }
    if (numNewDeadPlayers > 0) {
      alivePlayers = new address[](alivePlayers.length - numNewDeadPlayers);
      uint256 alivePlayersIndex = 0;
      for (uint i = 0; i < newAlivePlayers.length; i++) {
        if (newAlivePlayers[i] != address(0)) {
          alivePlayers[alivePlayersIndex] = newAlivePlayers[i];
          alivePlayersIndex++;
        }
      }
    }
    return (numNewDeadPlayers, msgSenderDied);
  }

  function disqualifyPlayer(address player) internal {
    bool isRegistered = false;
    for (uint i = 0; i < alivePlayers.length; i++) {
      if (alivePlayers[i] == player) {
        alivePlayers[i] = alivePlayers[alivePlayers.length - 1];
        alivePlayers.pop();
        isRegistered = true;
        break; // Exit the loop once the player is found and removed
      }
    }
    for (uint i = 0; i < deadPlayers.length; i++) {
      if (deadPlayers[i] == player) {
        deadPlayers[i] = deadPlayers[deadPlayers.length - 1];
        deadPlayers.pop();
        isRegistered = true;
        break; // Exit the loop once the player is found and removed
      }
    }
    if (!isRegistered) {
      return;
    }
    for (uint i = 0; i < disqualifiedPlayers.length; i++) {
      if (disqualifiedPlayers[i] == player) {
        return;
      }
    }
    disqualifiedPlayers.push(player);
  }

  function claimRewardPool() external {
    require(isGameStarted, "Game has not started yet.");
    require(block.number > gameEndBlock, "Game has not ended yet.");
    if (alivePlayers.length == 0 && deadPlayers.length == 0) {
      resetGame();
      return;
    }

    uint256 maxKills = 0;
    for (uint i = 0; i < alivePlayers.length; i++) {
      uint256 playerKills = numKills[alivePlayers[i]];
      if (playerKills > maxKills) {
        maxKills = playerKills;
      }
    }
    for (uint i = 0; i < deadPlayers.length; i++) {
      uint256 playerKills = numKills[deadPlayers[i]];
      if (playerKills > maxKills) {
        maxKills = playerKills;
      }
    }

    address[] memory playersWithMostKills = new address[](alivePlayers.length + deadPlayers.length);
    uint256 numPlayersWithMostKills = 0;
    for (uint i = 0; i < alivePlayers.length; i++) {
      if (numKills[alivePlayers[i]] == maxKills) {
        playersWithMostKills[numPlayersWithMostKills] = alivePlayers[i];
        numPlayersWithMostKills++;
      }
    }
    for (uint i = 0; i < deadPlayers.length; i++) {
      if (numKills[deadPlayers[i]] == maxKills) {
        playersWithMostKills[numPlayersWithMostKills] = deadPlayers[i];
        numPlayersWithMostKills++;
      }
    }
    if (numPlayersWithMostKills == 0 || address(this).balance == 0) {
      resetGame();
      return;
    }

    // Divide the reward pool among the players with the most kills
    uint256 rewardPerPlayer = address(this).balance / numPlayersWithMostKills;
    for (uint i = 0; i < playersWithMostKills.length; i++) {
      if (playersWithMostKills[i] == address(0)) {
        continue;
      }
      (bool sent, ) = playersWithMostKills[i].call{ value: rewardPerPlayer }("");
      require(sent, "Failed to send Ether");
    }

    // reset the game state
    resetGame();
  }

  function resetGame() internal {
    isGameStarted = false;
    gameEndBlock = 0;
    for (uint i = 0; i < alivePlayers.length; i++) {
      numKills[alivePlayers[i]] = 0;
    }
    for (uint i = 0; i < deadPlayers.length; i++) {
      numKills[deadPlayers[i]] = 0;
    }
    for (uint i = 0; i < disqualifiedPlayers.length; i++) {
      numKills[disqualifiedPlayers[i]] = 0;
    }
    alivePlayers = new address[](0);
    deadPlayers = new address[](0);
    disqualifiedPlayers = new address[](0);
  }

  // Getters
  // ------------------------------------------------------------------------
  function getRewardPool() external view returns (uint) {
    return address(this).balance;
  }

  function getRegisteredPlayerEntityIds() external view returns (bytes32[] memory) {
    bytes32[] memory registeredPlayerEntityIds = new bytes32[](alivePlayers.length);
    for (uint i = 0; i < alivePlayers.length; i++) {
      registeredPlayerEntityIds[i] = getEntityFromPlayer(alivePlayers[i]);
    }
    return registeredPlayerEntityIds;
  }

  function getAlivePlayers() external view returns (address[] memory) {
    return alivePlayers;
  }

  function getDeadPlayers() external view returns (address[] memory) {
    return deadPlayers;
  }

  function getDisqualifiedPlayers() external view returns (address[] memory) {
    return disqualifiedPlayers;
  }

  function getMatchArea() external view returns (Area memory) {
    return matchArea;
  }

  function getKillsLeaderboard() external view returns (LeaderboardEntry[] memory) {
    LeaderboardEntry[] memory leaderboard = new LeaderboardEntry[](alivePlayers.length + deadPlayers.length);
    for (uint i = 0; i < alivePlayers.length; i++) {
      leaderboard[i] = LeaderboardEntry({ player: alivePlayers[i], kills: numKills[alivePlayers[i]], isAlive: true });
    }
    for (uint i = 0; i < deadPlayers.length; i++) {
      leaderboard[i + alivePlayers.length] = LeaderboardEntry({
        player: deadPlayers[i],
        isAlive: false,
        kills: numKills[deadPlayers[i]]
      });
    }
    return leaderboard;
  }
}
