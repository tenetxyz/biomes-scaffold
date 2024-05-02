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
import { hasBeforeAndAfterSystemHook, getEntityAtCoord, getEntityFromPlayer, getPosition, getIsLoggedOff, getPlayerFromEntity } from "../utils/EntityUtils.sol";

import { IWorld } from "@biomesaw/world/src/codegen/world/IWorld.sol";
import { VoxelCoord } from "@biomesaw/utils/src/Types.sol";

struct LeaderboardEntry {
  address player;
  uint256 balance;
}

struct PlayerBalance {
  address player;
  uint256 balance;
}

struct PlayerWithdrawal {
  address player;
  uint256 lastWithdrawal;
}

struct PlayerHitter {
  address player;
  address lastHitter;
}

contract Game is IOptionalSystemHook {
  address public immutable biomeWorldAddress;

  event GameNotif(address player, string message);

  constructor(address _biomeWorldAddress) {
    biomeWorldAddress = _biomeWorldAddress;
    StoreSwitch.setStoreAddress(_biomeWorldAddress);
  }

  address[] public players;
  mapping(address => uint256) public balance;
  mapping(address => uint256) public lastWithdrawal;
  mapping(address => address) public lastHitter;

  ResourceId HitSystemId = WorldResourceIdLib.encode({ typeId: RESOURCE_SYSTEM, namespace: "", name: "HitSystem" });
  ResourceId LogoffSystemId =
    WorldResourceIdLib.encode({ typeId: RESOURCE_SYSTEM, namespace: "", name: "LogoffSystem" });
  ResourceId SpawnSystemId = WorldResourceIdLib.encode({ typeId: RESOURCE_SYSTEM, namespace: "", name: "SpawnSystem" });

  function isPlayerRegistered(address player) public view returns (bool) {
    for (uint i = 0; i < players.length; i++) {
      if (players[i] == player) {
        return true;
      }
    }
    return false;
  }

  function removePlayer(address player) internal {
    for (uint i = 0; i < players.length; i++) {
      if (players[i] == player) {
        players[i] = players[players.length - 1];
        players.pop();
        return;
      }
    }
  }

  function registerPlayer() external payable {
    require(msg.value >= 0.0015 ether, "Must send atleast minimum ETH to register");

    address player = msg.sender;
    require(
      hasBeforeAndAfterSystemHook(address(this), player, HitSystemId),
      "The player hasn't allowed the hit hook yet"
    );
    require(
      hasBeforeAndAfterSystemHook(address(this), player, LogoffSystemId),
      "The player hasn't allowed the logoff hook yet"
    );
    require(
      hasBeforeAndAfterSystemHook(address(this), player, SpawnSystemId),
      "The player hasn't allowed the spawn hook yet"
    );

    require(!isPlayerRegistered(player), "Player is already registered");

    players.push(player);
    balance[player] = msg.value;
    lastWithdrawal[player] = block.timestamp;
    lastHitter[player] = address(0);
  }

  function withdraw() external {
    address player = msg.sender;
    require(isPlayerRegistered(player), "You are not a registered player.");
    require(lastWithdrawal[player] + 2 hours < block.timestamp, "Can't withdraw yet.");

    uint256 amount = balance[player];
    require(amount > 0, "Your balance is zero.");

    removePlayer(player);
    balance[player] = 0;
    lastWithdrawal[player] = block.timestamp;
    lastHitter[player] = address(0);

    // Safe transfer of funds
    (bool sent, ) = player.call{ value: amount }("");
    require(sent, "Failed to send Ether");
  }

  modifier onlyBiomeWorld() {
    require(msg.sender == biomeWorldAddress, "Caller is not the Biomes World contract");
    _; // Continue execution
  }

  function supportsInterface(bytes4 interfaceId) external view override returns (bool) {
    return interfaceId == type(IOptionalSystemHook).interfaceId || interfaceId == type(IERC165).interfaceId;
  }

  function onUnregisterHook(
    address msgSender,
    ResourceId systemId,
    uint8 enabledHooksBitmap,
    bytes32 callDataHash
  ) external override onlyBiomeWorld {
    uint256 playerBalance = balance[msgSender];
    address recipient = lastHitter[msgSender];
    removePlayer(msgSender);

    if (playerBalance > 0) {
      balance[msgSender] = 0;
      if (recipient == address(0)) {
        (bool sent, ) = msgSender.call{ value: playerBalance }("");
        require(sent, "Failed to send Ether");
      } else {
        balance[recipient] += playerBalance;
        lastHitter[msgSender] = address(0);
      }
    }
  }

  function onAfterCallSystem(
    address msgSender,
    ResourceId systemId,
    bytes memory callData
  ) external override onlyBiomeWorld {
    if (!isPlayerRegistered(msgSender)) {
      return;
    }

    if (ResourceId.unwrap(systemId) == ResourceId.unwrap(LogoffSystemId)) {
      require(false, "Cannot logoff when registered.");
      return;
    } else if (ResourceId.unwrap(systemId) == ResourceId.unwrap(SpawnSystemId)) {
      uint256 playerBalance = balance[msgSender];
      if (playerBalance == 0) {
        return;
      }

      address recipient = lastHitter[msgSender];
      balance[msgSender] = 0;

      removePlayer(msgSender);

      if (recipient == address(0)) {
        (bool sent, ) = msgSender.call{ value: playerBalance }("");
        require(sent, "Failed to send Ether");
      } else {
        balance[recipient] += playerBalance;
        lastHitter[msgSender] = address(0);
      }
    } else if (ResourceId.unwrap(systemId) == ResourceId.unwrap(HitSystemId)) {
      Slice callDataArgs = SliceLib.getSubslice(callData, 4);
      address hitPlayer = abi.decode(callDataArgs.toBytes(), (address));

      if (isPlayerRegistered(hitPlayer)) {
        lastHitter[hitPlayer] = msgSender;

        bytes32 hitPlayerEntity = getEntityFromPlayer(hitPlayer);
        if (hitPlayerEntity == bytes32(0)) {
          uint256 hitPlayerBalance = balance[hitPlayer];
          balance[hitPlayer] = 0;
          balance[msgSender] += hitPlayerBalance;
          removePlayer(hitPlayer);
        }
      }
    }
  }

  function getRegisteredPlayers() external view returns (address[] memory) {
    return players;
  }

  function getBalancesLeaderboard() external view returns (LeaderboardEntry[] memory) {
    LeaderboardEntry[] memory leaderboard = new LeaderboardEntry[](players.length);
    for (uint256 i = 0; i < players.length; i++) {
      leaderboard[i] = LeaderboardEntry({ player: players[i], balance: balance[players[i]] });
    }

    return leaderboard;
  }

  function getRegisteredPlayerEntityIds() external view returns (bytes32[] memory) {
    bytes32[] memory registeredPlayerEntityIds = new bytes32[](players.length);
    for (uint i = 0; i < players.length; i++) {
      registeredPlayerEntityIds[i] = getEntityFromPlayer(players[i]);
    }
    return registeredPlayerEntityIds;
  }

  function getAllBalances() public view returns (PlayerBalance[] memory playerBalances) {
    playerBalances = new PlayerBalance[](players.length);
    for (uint256 i = 0; i < players.length; i++) {
      playerBalances[i] = PlayerBalance(players[i], balance[players[i]]);
    }
  }

  function getAllLastWithdrawals() public view returns (PlayerWithdrawal[] memory playerWithdrawals) {
    playerWithdrawals = new PlayerWithdrawal[](players.length);
    for (uint256 i = 0; i < players.length; i++) {
      playerWithdrawals[i] = PlayerWithdrawal(players[i], lastWithdrawal[players[i]]);
    }
  }

  function getAllLastHitters() public view returns (PlayerHitter[] memory playerLastHitters) {
    playerLastHitters = new PlayerHitter[](players.length);
    for (uint256 i = 0; i < players.length; i++) {
      playerLastHitters[i] = PlayerHitter(players[i], lastHitter[players[i]]);
    }
  }

  //UNUSED:
  function onRegisterHook(
    address msgSender,
    ResourceId systemId,
    uint8 enabledHooksBitmap,
    bytes32 callDataHash
  ) external override onlyBiomeWorld {
    require(getEntityFromPlayer(msgSender) != bytes32(0), "Player entity not found in Biome world");
  }

  function onBeforeCallSystem(
    address msgSender,
    ResourceId systemId,
    bytes memory callData
  ) external override onlyBiomeWorld {}
}
