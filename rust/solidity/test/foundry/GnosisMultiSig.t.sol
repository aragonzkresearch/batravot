pragma solidity ^0.8.0;

import "forge-std/Test.sol";

import "./Voters.sol";
import "./GnosisMultiSig.sol";

contract GnosisMultiSigTest is Test {

    Voters votersDB = new Voters();
    GnosisMultiSig smallGnosisMultiSig; // GnosisMultiSigWallet with 5 owners
    GnosisMultiSig mediumGnosisMultiSig; // GnosisMultiSigWallet with 25 owners
    GnosisMultiSig largeGnosisMultiSig; // GnosisMultiSigWallet with 100 owners
    GnosisMultiSig hugeGnosisMultiSig; // GnosisMultiSigWallet with 500 owners

    address[500] public voters;

    function setUp() public {
        for (uint i = 0; i < voters.length; i++) {
            voters[i] = address(votersDB.voters(i));
        }

        address[] memory smallOwners = new address[](5);
        for (uint i = 0; i < 5; i++) {
            smallOwners[i] = voters[i];
        }

        address[] memory mediumOwners = new address[](25);
        for (uint i = 0; i < 25; i++) {
            mediumOwners[i] = voters[i];
        }

        address[] memory largeOwners = new address[](100);
        for (uint i = 0; i < 100; i++) {
            largeOwners[i] = voters[i];
        }

        address[] memory hugeOwners = new address[](500);
        for (uint i = 0; i < 500; i++) {
            hugeOwners[i] = voters[i];
        }

        // For each we require full participation
        smallGnosisMultiSig = new GnosisMultiSig(smallOwners, 5);
        mediumGnosisMultiSig = new GnosisMultiSig(mediumOwners, 25);
        largeGnosisMultiSig = new GnosisMultiSig(largeOwners, 100);
        hugeGnosisMultiSig = new GnosisMultiSig(hugeOwners, 500);

        // Add a transaction for each of the multisigs
        address destination = address(this);
        uint value = 0;
        bytes memory data = new bytes(0);

        vm.startPrank(voters[0]); // The moment we submit a transaction, we also confirm it with the first voter
        smallGnosisMultiSig.submitTransaction(destination, value, data);
        mediumGnosisMultiSig.submitTransaction(destination, value, data);
        largeGnosisMultiSig.submitTransaction(destination, value, data);
        hugeGnosisMultiSig.submitTransaction(destination, value, data);
        vm.stopPrank();
    }

    // Benchmarks for GnosisMultiSigWallet to compare with MultiSigBatRaVot

    function testBenchmarkAddingNewOwner() public {
        vm.prank(address(smallGnosisMultiSig)); // We force the action to happen by impersonating the contract
        smallGnosisMultiSig.addOwner(voters[5]);
    }

    function testBenchmarkOneConfirmationSmall() public {
        vm.prank(address(voters[1]));
        smallGnosisMultiSig.confirmTransaction(0);
    }

    function testBenchmarkOneConfirmationMedium() public {
        vm.prank(address(voters[1]));
        mediumGnosisMultiSig.confirmTransaction(0);
    }

    function testBenchmarkOneConfirmationLarge() public {
        vm.prank(address(voters[1]));
        largeGnosisMultiSig.confirmTransaction(0);
    }

    function testBenchmarkOneConfirmationHuge() public {
        vm.prank(address(voters[1]));
        hugeGnosisMultiSig.confirmTransaction(0);
    }

    // Note that we do not need to test the other confirmations, because they are all the same
    // It is sufficient for us to then multiply the time by the number of confirmations
    // As it scales linearly
}