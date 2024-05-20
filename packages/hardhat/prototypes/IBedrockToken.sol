// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

interface IBedrockToken is ERC20 {
  function mint(address to, uint256 amount) external;
}
