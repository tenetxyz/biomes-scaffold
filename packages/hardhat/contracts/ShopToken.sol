// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ShopToken is ERC20, Ownable {
  constructor(string memory name, string memory symbol, address shopAddress) ERC20(name, symbol) Ownable(shopAddress) {}

  function mint(address to, uint256 amount) public onlyOwner {
    _mint(to, amount);
  }

  function burn(address account, uint256 value) public onlyOwner {
    _burn(account, value);
  }
}
