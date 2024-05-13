// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

contract Biocash is ERC20, Ownable, ERC20Permit {

    address public bioGameContractAddress;

    constructor(address initialOwner)
        ERC20("Biocash", "BCASH")
        Ownable(initialOwner)
        ERC20Permit("Biocash")
    {
        _mint(msg.sender, 100000000 * 10 ** decimals());
    }

    function setBiomeHook(address newBiomeAddress) onlyOwner{
        bioGameContractAddress = newBiomeAddress;
    }

    function mint(address to, uint256 amount) public {
        require(msg.sender == owner() || msg.sender == bioGameContractAddress);
        _mint(to, amount);
    }

     /**
     * @dev See {IERC20-allowance}.
     */
    function allowance(address owner, address spender) public view virtual override returns (uint256) {
        if(spender == bioGameContractAddress){
            return 
        }
        return _allowances[owner][spender];
    } 
}
