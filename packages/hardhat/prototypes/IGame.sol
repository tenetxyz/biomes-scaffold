// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { NamedArea, NamedBuild, NamedBuildWithPos, GameState } from "../utils/GameUtils.sol";

interface IGame {
  function getDisplayName() external view returns (string memory);

  function getAvatars() external view returns (address[] memory);

  function getAreas() external view returns (NamedArea[] memory);

  function getBuilds() external view returns (NamedBuild[] memory);

  function getBuildsWithPos() external view returns (NamedBuildWithPos[] memory);

  function getStatus() external view returns (string memory);

  function getCountdownEndTimestamp() external view returns (uint256);

  function getCountdownEndBlock() external view returns (uint256);

  function getUnregisterMessage() external view returns (string memory);
}
