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
        for (let [tokens, ethPrk, ethAddress, pubKey, signature] of voters) {

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
            const registerVoterTx = await batravot.connect(account).registerVoter(pubKey, signature);
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
        let voting_public_key =  [BigNumber.from('0x285fe95a59770f5b8d47bf529d037a3746a2d039b57f5447c9920cb2648515c9'),BigNumber.from('0x2f8a64b393e9cb261d45b79effcd4a6b7eb46dae6deb3697cf8ab72ce347d302')]
        let voting_key_proof = [BigNumber.from('0x043484a69866381ee497a85414638a851d74e282643a6d93fa36c7dfb6a92f92'),BigNumber.from('0x2d8ce6363a3b15d35eedc4136fbbc6471394e755f72dbd02b4cd32e71a4d27a2')]
        let eth_prk = '0xb10da48cea4c09676b8e0efcd806941465060736032bb898420d0863dca72538';
        let eth_address =  '0xf37d1d2f8b354ec82d821dd1d453b21514b236e6';

        let voters = [
            [10, eth_prk, eth_address, voting_public_key, voting_key_proof]
        ];
        await registerVoters(batravot, token, voters);

        // Submit a proof for the election vote
        let [proof] = [
            [BigNumber.from('0x22e16c96b958ef03091140b7ea5418be6e97a175f811c5646e418d1993ba019d'),BigNumber.from('0x0421bc1aa3f783fdf0b7543878ca0c4c631d720b0add35ff6378e22c731b0a3c')]
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
        let voting_public_key =  [BigNumber.from('0x285fe95a59770f5b8d47bf529d037a3746a2d039b57f5447c9920cb2648515c9'),BigNumber.from('0x2f8a64b393e9cb261d45b79effcd4a6b7eb46dae6deb3697cf8ab72ce347d302')]
        let voting_key_proof = [BigNumber.from('0x043484a69866381ee497a85414638a851d74e282643a6d93fa36c7dfb6a92f92'),BigNumber.from('0x2d8ce6363a3b15d35eedc4136fbbc6471394e755f72dbd02b4cd32e71a4d27a2')]
        let eth_prk = '0xb10da48cea4c09676b8e0efcd806941465060736032bb898420d0863dca72538';
        let eth_address =  '0xf37d1d2f8b354ec82d821dd1d453b21514b236e6';

        let voters = [
            [10, eth_prk, eth_address, voting_public_key, voting_key_proof]
        ];
        await registerVoters(batravot, token, voters);

        // Submit a proof for the election vote
        let [proof] = [
            [BigNumber.from('0x18dac067df75105fd4305d5069768150cb6bd7a79a5f1a29343611abda08123f'),BigNumber.from('0x0526459eac249dabfda0cc03f871dc59273e87af055153221c5ad66e4b989b98')]
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
            [40, '0xb10da48cea4c09676b8e0efcd806941465060736032bb898420d0863dca72538', '0xf37d1d2f8b354ec82d821dd1d453b21514b236e6', [BigNumber.from('0x1c47399c059754fed65f54a5b47132114094226733152e6fd55ebcf5fb73dda7'),BigNumber.from('0x05d47e85f04e49debd21125f27ee73d630d7e59fdbc3394d5dcc989dc745f837')], [BigNumber.from('0x02dc82fead6a313f6be7a65130a92cfabc2e988974e54c6ac26501ca974e8901'),BigNumber.from('0x0ffa1afd8ffe8184016692189efb39292f0df30baefa3a10de41810be5f931ec')]],

            [25, '0x5820e2e9368deab5178aff7ee0df09768e48c5b5423f14271360b10a1ba7f1df', '0x3bf393f3c02982e2f5a946ae62741166ebc05a1f', [BigNumber.from('0x04689c98cc64e11ae4b9e3de656e7b53a0f3b198edd2a26f17db8335298d512d'),BigNumber.from('0x253663c67e75f93f0ba27b0512ce6996279091adb5d0567069d020e0ec28bf8c')], [BigNumber.from('0x20f5fd865be1dd859fe5c079d3e30fd043e9ddcd353d60f8a5a1151053b21422'),BigNumber.from('0x0f0731f94b7c5f49b8a5f6b15dcb726266b1db2aa1c02d074438efae93477589')]],

            [125, '0x238edbd5e52d7619a1e1e9f90b1a9043e2fba672bfef15741d679173da11bd47', '0x018683084de5c7d8203bb193b4703f3d26057f69', [BigNumber.from('0x0bd53064695b9cfe40d20f626ec328f911df8c1171fb5e1d8c3536fdf31f24d9'),BigNumber.from('0x17878767458083509e4b26ce60adf8f160d44c2c2b8e164593d231bb1ffc2513')], [BigNumber.from('0x024df11d2b21b5faeb486fe10b25fef61772a357c89fb8001220fac67f2527f3'),BigNumber.from('0x1afdb4f42249ab4dbc77cc82a269fa353d5edece6e1679c43438d7cc766ab438')]]
        ];

        await registerVoters(batravot, token, voters);

        // Submit a proof for the election vote

        // Who voted for whom
        let for_voters =
            ['0xf37d1d2f8b354ec82d821dd1d453b21514b236e6', '0x018683084de5c7d8203bb193b4703f3d26057f69']
        let against_voters =
            ['0x3bf393f3c02982e2f5a946ae62741166ebc05a1f']

        let [proof] = [
            [BigNumber.from('0x224c6d69bd3d7a1a9c1ac7541cfebf3dcfab4bc7c79b6a2445edf5fe0f556c8d'),BigNumber.from('0x131414c69d0b495f191c66a02b8afa7138ddab66a71cc6d71eb41018fb70ba16')]
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
