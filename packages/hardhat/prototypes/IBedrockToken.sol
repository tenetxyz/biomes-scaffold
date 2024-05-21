// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import "@openzeppelin/contracts/governance/utils/IVotes.sol";

interface IBedrockToken is IERC20, IERC20Permit, IVotes {
  function decimals() external view returns (uint8);

  function mint(address to, uint256 amount) external;
}
