// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// This is a token we use for testing our contract
contract DummyToken is ERC20 {
    uint constant _initial_supply = 1_000_000_000_000;

    constructor() ERC20("DummyToken", "DT") {
        // Mint the initial supply
        _mint(msg.sender, _initial_supply);
    }

    // Our token has 0 decimals points
    function decimals() public view virtual override returns (uint8) {
        return 0;
    }
}
