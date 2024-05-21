// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";

contract BedrockToken is ERC20, ERC20Permit, ERC20Votes {
  address public bedrockDaoAddress;

  constructor(address _bedrockDaoAddress) ERC20("Bedrock", "BROCK") ERC20Permit("Bedrock") {
    bedrockDaoAddress = _bedrockDaoAddress;
  }

  function setBedrockDaoAddress(address _bedrockDaoAddress) public {
    require(bedrockDaoAddress == address(0), "BedrockToken: DAO address already set");
    bedrockDaoAddress = _bedrockDaoAddress;
  }

  function mint(address to, uint256 amount) public {
    require(_msgSender() == bedrockDaoAddress, "BedrockToken: only DAO can mint");
    _mint(to, amount);
  }

  // The following functions are overrides required by Solidity.
  function _update(address from, address to, uint256 value) internal override(ERC20, ERC20Votes) {
    super._update(from, to, value);
  }

  function nonces(address owner) public view override(ERC20Permit, Nonces) returns (uint256) {
    return super.nonces(owner);
  }
}
