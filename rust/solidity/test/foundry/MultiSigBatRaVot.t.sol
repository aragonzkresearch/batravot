// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";

import "../../contracts/MultiSigBatRaVot.sol";
import "../../contracts/BN254.sol";
import "./Voters.sol";

contract MultiSigBatRaVotTest is Test {
    MultiSigBatRaVot public batravot = new MultiSigBatRaVot();
    Voters votersDB = new Voters();

    address[500] public voters;
    uint256[2][500] public pks;
    uint256[3][500] public sigs;

    function setUp() public {

        // Start a single new election with 1000 votes required
        // This will be the default election for all tests
        // And due to the size of the election, it will be never passed
        batravot.createElection("Default Election", 1000, [0x0ecea7b5c4498cd0d8ca3476f658757889c6cd9fa090b9f8ab778c73f95c40f3, 0x025f96216182512c444d1c7c2db6735c8775e1532bbb4e27abea471863958cee], [0x26c998e960e017b48f9438b0c33423ba591dc57a029ffa64edb96d4489390024, 0x196b543d6cc72af733d548abe7a411b59d80e4f19e9b2140a09462aa28c2fa82, 0x2821f5a3184125ee6ceb3bce02281f89b77bcc13c7caa7f61f7d1baa0a189925, 0x2455513663623b50458a9e96d2dceb3216a07ac64e878e9805cce6515bbb66e9]);

        // Register 500 voters and copy their public keys and signatures to the test contract to save gas
        for (uint256 i = 0; i < 500; i++) {
            voters[i] = votersDB.voters(i);
            pks[i][0] = votersDB.pks(i, 0);
            pks[i][1] = votersDB.pks(i, 1);
            sigs[i][0] = votersDB.sigs(i, 0);
            sigs[i][1] = votersDB.sigs(i, 1);
            sigs[i][2] = votersDB.sigs(i, 2);

            vm.prank(voters[i]);
            batravot.registerVoter(pks[i], sigs[i]);
        }




    }

    function testInitialElectionCounter() public {
        assertEq(batravot.electionCount(), 1); // Should be 1 as we created one election in the setup
    }

    // Next we have a series of benchmark tests.
    // Their purpose is to measure the gas cost of running the multisig

    function testBenchmarkCreateElection() public {
        // Create a new election
        batravot.createElection("Test Election", 2, [0x0ecea7b5c4498cd0d8ca3476f658757889c6cd9fa090b9f8ab778c73f95c40f3, 0x025f96216182512c444d1c7c2db6735c8775e1532bbb4e27abea471863958cee], [0x26c998e960e017b48f9438b0c33423ba591dc57a029ffa64edb96d4489390024, 0x196b543d6cc72af733d548abe7a411b59d80e4f19e9b2140a09462aa28c2fa82, 0x2821f5a3184125ee6ceb3bce02281f89b77bcc13c7caa7f61f7d1baa0a189925, 0x2455513663623b50458a9e96d2dceb3216a07ac64e878e9805cce6515bbb66e9]);
    }

    function testBenchmarkRegisterVoter() public {
        // Register a voter
        vm.prank(0x48D5F0b15c8Fd0F25B8aaEd22b567F8CD3fc0ac2);
        batravot.registerVoter([0x2c73fd312a9c3b5c2ab57c5fc12b4a1ad08b245a86ecb1744bb672da676a9b23, 0x0a9f46d4388aa89ec81ef2bfc538996d9d2c0d85d0ed6a56e4655b2ba0443de7], [0x041ce74518c3b01010d18e4b0cea31d91f37c86ac5ef48a012a2402c8f6db283, 0x2d8c135bd7cb2f2a17c0e71cb91bcd3f63b817cda17a9ebcae0e768070b09022, 0x2f98d237f86fb22e37fc0ee9349f3ed9d3e491016c464c991625c7013994ba70]);
        // Get voter public key from the contract
        (uint256 x, uint256 y) = batravot.census(0x48D5F0b15c8Fd0F25B8aaEd22b567F8CD3fc0ac2);
        // Check that both are not 0
        assertFalse(x == 0);
        assertFalse(y == 0);
    }


    function testBenchmarkSingleVoteElection() public {
        // Create a slice of voters with 1 voters
        address[] memory local_voters = new address[](1);
        for (uint256 i = 0; i < 1; i++) {
            local_voters[i] = voters[i];
        }

        batravot.submitVotesWithProof(0, local_voters, [0x01b6998011a8a862564ebdeaaaf055708dbe5236da1d6727b959d0c62b477c71, 0x25abcbd699cefeb30e544c5a8fa8d997e25846c373632b487ee04284baad511a]);
    }

    function testBenchmarkTwoVoteElection() public {
        // Create a slice of voters with 2 voters
        address[] memory local_voters = new address[](2);
        for (uint256 i = 0; i < 2; i++) {
            local_voters[i] = voters[i];
        }

        batravot.submitVotesWithProof(0, local_voters, [0x0a8c6cee1991ae7dcf180964562e1fa8cab1518af05cadcb7fbbb5932faf4fed,0x02c7245cd8aea23ea62beda8a704a3b9950d3ce7c05db474f1a104c084e965da]);
    }

    function testBenchmarkThreeVoteElection() public {
        // Create a slice of voters with 3 voters
        address[] memory local_voters = new address[](3);
        for (uint256 i = 0; i < 3; i++) {
            local_voters[i] = voters[i];
        }

        batravot.submitVotesWithProof(0, local_voters,
            [0x14970c2d5fe97828fc1a8f0adc9832d1048a3d64b7fde6497a9ac3fd60100bfb,0x27b197a24937ef9b34921d5cfe24ba48a328a8330b104eee8a1c60f2337d4759]
        );
    }

    function testBenchmarkFourVoteElection() public {
        // Create a slice of voters with 4 voters
        address[] memory local_voters = new address[](4);
        for (uint256 i = 0; i < 4; i++) {
            local_voters[i] = voters[i];
        }

        batravot.submitVotesWithProof(0, local_voters,
            [0x0c6ec41930f4a7f781582b50b3c08d50aec51623de2a834a2b3f2ac0ab76c6f3,0x0b725159e5a523aff89bace3bcbb4b9b3544244618b4323ead50f55c32a270aa]
        );
    }

    function testBenchmarkFiveVoteElection() public {
        // Create a slice of voters with 5 voters
        address[] memory local_voters = new address[](5);
        for (uint256 i = 0; i < 5; i++) {
            local_voters[i] = voters[i];
        }

        batravot.submitVotesWithProof(0, local_voters,
            [0x1132cb5a5e7c5d1774ec2910c39b3807f9af72c52e205c25e201e8263d4c8af9,0x1fc110cfe707f9b3cc60b9ffe384fd747a586824d1780baad4544fb8851f19b0]
        );
    }

    // 8 voters
    function testBenchmarkEightVoteElection() public {
        // Create a slice of voters with 8 voters
        address[] memory local_voters = new address[](8);
        for (uint256 i = 0; i < 8; i++) {
            local_voters[i] = voters[i];
        }

        batravot.submitVotesWithProof(0, local_voters,
            [0x2efb2dc4a841cfa8d6c4ff956fb84eeff8dd10392f37f8b585953a579a15be60,0x17d69741563cd6611eba74dab0a1806faa26173067e2457f8a86e391a51dee01]
        );
    }

    // 10 voters
    function testBenchmarkTenVoteElection() public {
        // Create a slice of voters with 10 voters
        address[] memory local_voters = new address[](10);
        for (uint256 i = 0; i < 10; i++) {
            local_voters[i] = voters[i];
        }

        batravot.submitVotesWithProof(0, local_voters,
            [0x055ebd8f99f1e7a756a81a2af0a514689e92749375e5368334c1a765cd06dd7c,0x23d7a6076f3ab9234e7bc14489e1b5db922dde44a28081b939737b407b5b03b9]

        );
    }

    // 15 voters
    function testBenchmarkFifteenVoteElection() public {
        // Create a slice of voters with 15 voters
        address[] memory local_voters = new address[](15);
        for (uint256 i = 0; i < 15; i++) {
            local_voters[i] = voters[i];
        }

        batravot.submitVotesWithProof(0, local_voters,
            [0x24374298f01215a22c3e1d77f6dd516ee47752fd00ccfddf1799fcd2fad7c85e,0x0a8334955828d237ed3792feaf165a13c8e8ca40ef7f62b9633cdaf82a9635e8]
        );
    }

    // 25 voters
    function testBenchmarkTwentyFiveVoteElection() public {
        // Create a slice of voters with 25 voters
        address[] memory local_voters = new address[](25);
        for (uint256 i = 0; i < 25; i++) {
            local_voters[i] = voters[i];
        }

        batravot.submitVotesWithProof(0, local_voters,
            [0x008cc204272ba99193dcabf9ae6168550f8db8e869d78c8a163bf64d3dfaa69f,0x247bc287fe902592f72142854bfccb71b8575f7326e6746de282e4aa47a9f95e]
        );
    }

    // 50 voters
    function testBenchmarkFiftyVoteElection() public {
        // Create a slice of voters with 50 voters
        address[] memory local_voters = new address[](50);
        for (uint256 i = 0; i < 50; i++) {
            local_voters[i] = voters[i];
        }

        batravot.submitVotesWithProof(0, local_voters,
            [0x172a941db99ad6b4cb582de6cbca7bbdaf0182b2373006f7303a69b1360f9c7a,0x01a3c02d55e56d8b58f22debd57b1ed67dfaf18251ecdaf0e5b664d14bb2dbbd]
        );
    }

    // 100 voters
    function testBenchmarkHundredVoteElection() public {
        // Create a slice of voters with 100 voters
        address[] memory local_voters = new address[](100);
        for (uint256 i = 0; i < 100; i++) {
            local_voters[i] = voters[i];
        }

        batravot.submitVotesWithProof(0, local_voters,
            [0x0ba5cc8f6f168a5d258de57248484502be806540dfe6da0ff42bc7f7ff9ce327,0x284da711fc9e6b9972711c6d1dad53f6c84a21b3e1fb970cbfec28ae3424b1a7]
        );
    }

    // 250 voters
    function testBenchmarkTwoHundredFiftyVoteElection() public {
        // Create a slice of voters with 250 voters
        address[] memory local_voters = new address[](250);
        for (uint256 i = 0; i < 250; i++) {
            local_voters[i] = voters[i];
        }

        batravot.submitVotesWithProof(0, local_voters,
            [0x2779a6ac2f14898ce0fdacf6a248ae481394335a3b65a8dadd3766c6713f82bd,0x2ff8c97dc6e21b40f29bd88b8873715e5cfe165462ebe59a2947727324912d4a]
        );
    }

    // 500 voters
    function testBenchmarkFiveHundredVoteElection() public {
        // Create a slice of voters with 500 voters
        address[] memory local_voters = new address[](500);
        for (uint256 i = 0; i < 500; i++) {
            local_voters[i] = voters[i];
        }

        batravot.submitVotesWithProof(0, local_voters,
            [0x1d5cbfd7a60438895d0cde6ff947bec986d464adde46db8fcb104efd3d38b956,0x1feabb83683a00278a535fac63a0ae7fea00a0471152f3d3b993ee2904b2b73d]
        );
    }
}
