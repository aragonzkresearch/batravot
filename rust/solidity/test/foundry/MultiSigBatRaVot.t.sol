// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "../../contracts/MultiSigBatRaVot.sol";

contract MultiSigBatRaVotTest is Test {
    MultiSigBatRaVot public batravot;

    function setUp() public {
        batravot = new MultiSigBatRaVot();
    }

    function testInitialElectionCounter() public {
        assertEq(batravot.electionCount(), 0);
    }
}
