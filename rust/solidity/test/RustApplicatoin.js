const { expect } = require("chai");
const { ethers } = require("hardhat");
const {BigNumber} = require("ethers");


describe("Testing Rust Application to correctly integrate with the BatRaVot Smart Contract", function () {

    async function deployDummyToken() {
        const Token = await ethers.getContractFactory("DummyToken");
        const token = await Token.deploy();

        await token.deployed();
        console.log("Token Address:", token.address);
        return token;
    }

    async function deployElectionContract(token) {
        if (token === undefined) {
            token = await deployDummyToken();
        }

        const BatRaVot = await ethers.getContractFactory("BatRaVot");
        const batravot = await BatRaVot.deploy(token.address);

        await batravot.deployed();
        console.log("Election Handler deployed to:", batravot.address);
        return [batravot, token];
    }

    async function startNewElection(batravot, electionId = BigNumber.from(0)) {
        // Start a new election
        let specifiers = [
            [BigNumber.from("0x0ecea7b5c4498cd0d8ca3476f658757889c6cd9fa090b9f8ab778c73f95c40f3"), BigNumber.from("0x025f96216182512c444d1c7c2db6735c8775e1532bbb4e27abea471863958cee")], [BigNumber.from("0x26c998e960e017b48f9438b0c33423ba591dc57a029ffa64edb96d4489390024"), BigNumber.from("0x196b543d6cc72af733d548abe7a411b59d80e4f19e9b2140a09462aa28c2fa82"), BigNumber.from("0x2821f5a3184125ee6ceb3bce02281f89b77bcc13c7caa7f61f7d1baa0a189925"), BigNumber.from("0x2455513663623b50458a9e96d2dceb3216a07ac64e878e9805cce6515bbb66e9")], [BigNumber.from("0x2e45fed391c18c6fe0e9c1d73a2b6ce5d28b0d35b495d4645e1e574c16ccc9ff"), BigNumber.from("0x1fd783a1619d17e412d70eac08cb0e4cc1eef0860db84d4d75bdc609daf148bd")], [BigNumber.from("0x1ad82c842b9cdaa62c707a396de235538db902cf813517423d134ae52df956d6"), BigNumber.from("0x123883cdb5f099e69fba9fa20e8b8bfb821270e63dd9df0fded3590e3796ab60"), BigNumber.from("0x128028fb15e218e7cd552dede288b199eda7f63563e63f3eef3ab66a8db0f456"), BigNumber.from("0x02eccd06d97ccf272fe6c6bd5342626f99338672aa2ce2f6291a81d965e9cd67")]
        ];

        let [specifier_yes_g1, specifier_yes_g2, specifier_no_g1, specifier_no_g2] = specifiers;

        const createElectionTx = await batravot.createElection("Test Election", specifier_yes_g1, specifier_yes_g2, specifier_no_g1, specifier_no_g2);
        await createElectionTx.wait();
        console.log("New election created successfully!")

        let election = await batravot.elections(electionId);
        console.log("Current election status: ", election.state)
        return election.state;
    }

    async function registerVoters(batravot, token, voters) {
        for (let [tokens, ethPrk, ethAddress, pubKey, keyProof] of voters) {

            const account = new ethers.Wallet(ethPrk, ethers.provider);
            console.log("Registering voter: ", ethAddress);
            // First, we need to send some tokens to the voter
            const transferTx = await token.transfer(ethAddress, tokens);
            await transferTx.wait();
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

    async function submitElectionProof(batravot, for_voters, against_voters, proof, electionId = BigNumber.from(0)) {
        const submitVoteWithProofTx = await batravot.submitVotesWithProof(electionId, for_voters, against_voters, proof);
        await submitVoteWithProofTx.wait();
        console.log("Submitted a vote proof for the election.")
    }

    async function closeElectionAndGetResult(batravot, electionId = BigNumber.from(0)) {
        const closeElectionTx = await batravot.closeElection(electionId);
        await closeElectionTx.wait();
        return (await batravot.elections(electionId));
    }

    it("One correct vote `For` with Rust", async function () {
        const [batravot, token] = await deployElectionContract();
        await startNewElection(batravot);

        // Add keys to the election census
        // Voting Private key is: 0x71e936491e99cb4e04c963017491f1601d20f352b4f7f450bb7a637dc76fda71
        let voting_public_key =   [BigNumber.from("0x2abefcd6a91b7da4ed906ba7ad0a73d1a98bc63f216dcd88d1d37d8c7c3f2f5a") , BigNumber.from("0x071304e3246341f4d744ff862435e85925022f56736d0611bb5b9f2420a443b7")]
        let voting_key_proof = [BigNumber.from("0x16d5e1ec52142853b0f65f14d99b106cf476ff2c9aa3b022ca9e0840e72a7ccb") , BigNumber.from("0x1c14a099adfdd4a092b3fdd0e30048ade43ebd2c078225ce989ea8b269bbfaee"), BigNumber.from("0x28aeb56038144b30ab36147cd2deb495a54bcbcbe93e4af4e952e889e8d15bbf") ]

        let eth_prk = '0xb10da48cea4c09676b8e0efcd806941465060736032bb898420d0863dca72538';
        let eth_address =  '0xf37d1d2f8b354ec82d821dd1d453b21514b236e6';

        let voters = [
            [10, eth_prk, eth_address, voting_public_key, voting_key_proof]
        ];
        await registerVoters(batravot, token, voters);

        // Submit a proof for the election vote
        let [proof] = [
            [BigNumber.from("0x1702be75e57ee4c5e0535f25158ae476964bc39867be005b54afaa49c20ad624") , BigNumber.from("0x1fa951aa83759ca771283b602d0698209fb1a1f686e33cc488c65d2c67f0d4e1")]
        ];

        // Who voted for whom
        let for_voters = ['0xf37d1d2f8b354ec82d821dd1d453b21514b236e6'] // First person in the census voted yes
        let against_voters = [] // No one voted no


        await submitElectionProof(batravot, for_voters, against_voters, proof);
        console.log("Submitted a vote proof for the election.")

        // Close the election and check the result
        let election = await closeElectionAndGetResult(batravot);

        expect(election.state).to.equal(2);
        expect(election.result.totalVoters).to.equal(1);
        expect(election.result.yesVoters).to.equal(1);
        expect(election.result.totalVotes).to.equal(10);
        expect(election.result.yesVotes).to.equal(10);
    });

    it("One correct vote `Against` with Rust", async function () {
        const [batravot, token] = await deployElectionContract();
        await startNewElection(batravot);

        // Add keys to the election census
        // Voting Private key is: 0x71e936491e99cb4e04c963017491f1601d20f352b4f7f450bb7a637dc76fda71
        let voting_public_key =   [BigNumber.from("0x2abefcd6a91b7da4ed906ba7ad0a73d1a98bc63f216dcd88d1d37d8c7c3f2f5a") , BigNumber.from("0x071304e3246341f4d744ff862435e85925022f56736d0611bb5b9f2420a443b7")]
        let voting_key_proof = [BigNumber.from("0x16d5e1ec52142853b0f65f14d99b106cf476ff2c9aa3b022ca9e0840e72a7ccb") , BigNumber.from("0x1c14a099adfdd4a092b3fdd0e30048ade43ebd2c078225ce989ea8b269bbfaee"), BigNumber.from("0x28aeb56038144b30ab36147cd2deb495a54bcbcbe93e4af4e952e889e8d15bbf") ]

        let eth_prk = '0xb10da48cea4c09676b8e0efcd806941465060736032bb898420d0863dca72538';
        let eth_address =  '0xf37d1d2f8b354ec82d821dd1d453b21514b236e6';

        let voters = [
            [10, eth_prk, eth_address, voting_public_key, voting_key_proof]
        ];
        await registerVoters(batravot, token, voters);

        // Submit a proof for the election vote
        let [proof] = [
            [BigNumber.from("0x2966d3d0e01ffdd767a6c83276050ccf674b4c54911f8d4cd6377b65bb930e24") , BigNumber.from("0x1727158d6719754419ff42ce8650d180890bd2deec5f4fe275a452198510e9a7")]
        ];

        // Who voted for whom
        let for_voters = []
        let against_voters = ["0xf37d1d2f8b354ec82d821dd1d453b21514b236e6"]


        await submitElectionProof(batravot, for_voters, against_voters, proof);
        console.log("Submitted a vote proof for the election.")

        // Close the election and check the result
        let election = await closeElectionAndGetResult(batravot);

        expect(election.state).to.equal(2);
        expect(election.result.totalVoters).to.equal(1);
        expect(election.result.yesVoters).to.equal(0);
        expect(election.result.totalVotes).to.equal(10);
        expect(election.result.yesVotes).to.equal(0);
    });


    it("2 correct vote `For` and 1 correct vote `against`", async function () {
        const [batravot, token] = await deployElectionContract();
        await startNewElection(batravot);

        // Add key to the election census
        let voters = [
            // 0x2260b8a4b275f1094cbee5cbd7ed8d654bc201b2ae75958153b1e3cbc9bc2768
            [40, '0xb10da48cea4c09676b8e0efcd806941465060736032bb898420d0863dca72538', '0xf37d1d2f8b354ec82d821dd1d453b21514b236e6',
                [BigNumber.from("0x065e09b7dff544aa70309dc63070bd71008fd2b68af2273309142df16e5b39f6") , BigNumber.from("0x2c574987e62617b41ac9611b6b0c8b3eaeb2fcf42b5cb1c2dd4c35be768f0d6b")],
                [BigNumber.from("0x0d3d6f9af27a8cd5fb8c31d587d464183096033d82f8042ea53e9dd8638633f6") , BigNumber.from("0x2a4aaeeebefce0eab140f7e9a0080b25d93800d38eee1918e37ae7e7a6ec626d") , BigNumber.from("0x09de19cc24fc074d8648fb44bd2c69c9907ad785c0a90ecb9a6acdd4b195afe2")]
            ],

            // 0xff1a88c8b747603e8d92f68f69125610a69e07930fb442b0a58d79d1e10bcddc
            [25, '0x5820e2e9368deab5178aff7ee0df09768e48c5b5423f14271360b10a1ba7f1df', '0x3bf393f3c02982e2f5a946ae62741166ebc05a1f',
                [BigNumber.from("0x0a86ae32732efd3f551e8bd717a17a47584cdc71bf0f9b6b665fa0a78b8f5a16") , BigNumber.from("0x02498af65a9648fcbec94fb2c0324b19913447a9f86642539d2ac5e2a424e6ec")],
                [BigNumber.from("0x3003efecba3495f93516ef8d336500527c04c2f472265c2c29430f2f972891eb") , BigNumber.from("0x12d29f76fa9f74a0b13b0b7fbcbbda48de4fded6c6b0307bf544679450f608ac"), BigNumber.from("0x0118f428091a69b08cc24b7fe248b4ab8e4afa9fd1c70e42b765642d7b208f64")]
            ],

            // 0x6dc1d83cc050ac57db474305229b4f0e0a9e625d48c8f9c55078914a13d107f8
            [125, '0x238edbd5e52d7619a1e1e9f90b1a9043e2fba672bfef15741d679173da11bd47', '0x018683084de5c7d8203bb193b4703f3d26057f69',
                [BigNumber.from("0x242952d154c7930b9e7915a2e949f81ceea6f25f6401d090c387d800c22ead70") , BigNumber.from("0x2cbe80463f1a57996b0568ac185812657a4740d3580864a5c19354b6b65a647c")],
                [BigNumber.from("0x013821cc789c3d39cced2c175ab557d44fa406935187b4d3d9753557abf30976") , BigNumber.from("0x2a2b5739f365668e0b2d400dffe010e002020f4dd37b9662bbe6b5e10c08eb6e"), BigNumber.from("0x0d761714df2a18ce0b9b1a63940a527a20630bc297ad8295f55b36caba4f743c")]
            ]
        ];

        await registerVoters(batravot, token, voters);

        // Submit a proof for the election vote

        // Who voted for whom
        let for_voters =
            ['0xf37d1d2f8b354ec82d821dd1d453b21514b236e6', '0x018683084de5c7d8203bb193b4703f3d26057f69']
        let against_voters =
            ['0x3bf393f3c02982e2f5a946ae62741166ebc05a1f']

        let [proof] = [
            [BigNumber.from("0x066afbb5f86b55959fffb37d18084b7a632e08e581080b1ba607b708596053fc") , BigNumber.from("0x184b8a685bdcc2034aae319816dda27caabea2940810465d4cdbbec4cc0e40a7")]
        ];

        await submitElectionProof(batravot, for_voters, against_voters, proof);
        console.log("Submitted a vote proof for the election.")

        // Close the election and check the result
        let election = await closeElectionAndGetResult(batravot);

        expect(election.state).to.equal(2);
        expect(election.result.totalVoters).to.equal(3);
        expect(election.result.yesVoters).to.equal(2);
        expect(election.result.totalVotes).to.equal(190);
        expect(election.result.yesVotes).to.equal(165);
    });
});
