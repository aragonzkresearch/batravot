// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

// This is a token we use for testing our contract
contract DummyToken is ERC20, ERC20Burnable {
    uint constant _initial_supply = 1_000_000_000_000;

    constructor() ERC20("Voting Token", "VT") {
        // Mint the initial supply
        _mint(msg.sender, _initial_supply);
    }

    // Our token has 0 decimals points
    function decimals() public view virtual override returns (uint8) {
        return 0;
    }

    // We have made it possible for anyone to invoke this function
    // to mint themselves some test voting tokens and check how the protocol works
    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }
}
