const { expect } = require("chai");
const { ethers } = require("hardhat");
const {BigNumber} = require("ethers");


describe("Testing Rust Application to correctly integrate with the BatRaVot Smart Contract", function () {

    async function deployElectionContract() {

        const BatRaVot = await ethers.getContractFactory("MultiSigBatRaVot");
        const batravot = await BatRaVot.deploy();

        await batravot.deployed();
        console.log("Election Handler deployed to:", batravot.address);
        return [batravot];
    }

    async function startNewElection(batravot, threshold = BigNumber.from(1), electionId = BigNumber.from(0)) {
        // Start a new election
        let specifiers = [
            [BigNumber.from("0x0ecea7b5c4498cd0d8ca3476f658757889c6cd9fa090b9f8ab778c73f95c40f3"), BigNumber.from("0x025f96216182512c444d1c7c2db6735c8775e1532bbb4e27abea471863958cee")], [BigNumber.from("0x26c998e960e017b48f9438b0c33423ba591dc57a029ffa64edb96d4489390024"), BigNumber.from("0x196b543d6cc72af733d548abe7a411b59d80e4f19e9b2140a09462aa28c2fa82"), BigNumber.from("0x2821f5a3184125ee6ceb3bce02281f89b77bcc13c7caa7f61f7d1baa0a189925"), BigNumber.from("0x2455513663623b50458a9e96d2dceb3216a07ac64e878e9805cce6515bbb66e9")]
        ];

        let [specifier_yes_g1, specifier_yes_g2] = specifiers;

        const createElectionTx = await batravot.createElection("Test Election", threshold, specifier_yes_g1, specifier_yes_g2);
        await createElectionTx.wait();
        console.log("New election created successfully!")

        let election = await batravot.elections(electionId);
        console.log("Current election status: ", election.state)
        return election.state;
    }

    async function registerVoters(batravot, voters) {
        for (let [_, ethPrk, ethAddress, pubKey, keyProof] of voters) {

            const account = new ethers.Wallet(ethPrk, ethers.provider);
            console.log("Registering voter: ", ethAddress);

            // As well as a bit of ETH to pay for gas
            let tx = {
                to: ethAddress,
                // Convert currency unit from ether to wei
                value: ethers.utils.parseEther("0.1"),
            }
            const [owner] = await ethers.getSigners();
            await owner.sendTransaction(tx);
            console.log("Tokens and Ether sent to voter successfully!")


            // Now, we can register the voter, we need to send the registration transaction from the voter's address
            const registerVoterTx = await batravot.connect(account).registerVoter(pubKey, keyProof);
            await registerVoterTx.wait();
            console.log("Voter registered successfully!")
        }
    }

    async function submitElectionProof(batravot, for_voters, proof, electionId = BigNumber.from(0)) {
        const submitVoteWithProofTx = await batravot.submitVotesWithProof(electionId, for_voters, proof);
        await submitVoteWithProofTx.wait();
        console.log("Submitted a vote proof for the election.")
    }

    it("One correct vote `For` with Rust", async function () {
        const [batravot] = await deployElectionContract();
        await startNewElection(batravot, 1);

        // Add keys to the election census
        // Voting Private key is: 0x71e936491e99cb4e04c963017491f1601d20f352b4f7f450bb7a637dc76fda71
        let voting_public_key =   [BigNumber.from("0x2abefcd6a91b7da4ed906ba7ad0a73d1a98bc63f216dcd88d1d37d8c7c3f2f5a") , BigNumber.from("0x071304e3246341f4d744ff862435e85925022f56736d0611bb5b9f2420a443b7")]
        let voting_key_proof = [BigNumber.from("0x16d5e1ec52142853b0f65f14d99b106cf476ff2c9aa3b022ca9e0840e72a7ccb") , BigNumber.from("0x1c14a099adfdd4a092b3fdd0e30048ade43ebd2c078225ce989ea8b269bbfaee"), BigNumber.from("0x28aeb56038144b30ab36147cd2deb495a54bcbcbe93e4af4e952e889e8d15bbf") ]

        let eth_prk = '0xb10da48cea4c09676b8e0efcd806941465060736032bb898420d0863dca72538';
        let eth_address =  '0xf37d1d2f8b354ec82d821dd1d453b21514b236e6';

        let voters = [
            [10, eth_prk, eth_address, voting_public_key, voting_key_proof]
        ];
        await registerVoters(batravot, voters);

        // Submit a proof for the election vote
        let [proof] = [
            [BigNumber.from("0x1702be75e57ee4c5e0535f25158ae476964bc39867be005b54afaa49c20ad624") , BigNumber.from("0x1fa951aa83759ca771283b602d0698209fb1a1f686e33cc488c65d2c67f0d4e1")]
        ];

        // Who voted for whom
        let for_voters = ['0xf37d1d2f8b354ec82d821dd1d453b21514b236e6'] // First person in the census voted yes


        await submitElectionProof(batravot, for_voters, proof);
        console.log("Submitted a vote proof for the election.")

        // Get the election by id and check the result
        let election = await batravot.elections(BigNumber.from(0));

        expect(election.state).to.equal(2);
    });
});
