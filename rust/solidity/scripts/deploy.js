const {ethers} = require("hardhat");
const {BigNumber} = require("ethers");

const main = async () => {
    const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    const BatRaVot = await ethers.getContractFactory("BatRaVot");
    const elections = await BatRaVot.deploy();

    await elections.deployed();
    console.log("Election Handler deployed to:", elections.address);

    // Start a new election
    let specifiers = [
        [BigNumber.from("0x272F45E837080E528CA66EB2D4D23D9B0D6213363C5DF858AD122D53CFA5235D"),BigNumber.from("0x1EFF15262D9FB9546C7CB46E54F3A20E914889D5A795EE82894B75615F9C2F93")],
        [[BigNumber.from("0x1DE1B2FE6FDD7CE0767FE44A7DADEFBBAD7AA47B3E2855895190D1DE383EEA8A"),BigNumber.from("0x2898EF620371E7C01B5EED877EE5882B9A4AFA3DB6EFF1B719715EDC48CAC6D6")],[BigNumber.from("0x04E4E4434374EAE2C61C914AE8562774B5055A696332B6344A7668C99BD4BC94"),BigNumber.from("0x06619FEA373E5CADE44C0EB7F8087AC37B3FB15B7323BF52A0EC1484D78DD76C")]],
        [BigNumber.from("0x2455CC4BBEDF09F45B5ACF610D61A9DFB3017AD5004C00EEF146175C7F468369"),BigNumber.from("0x065ED496C3D68E4E114E41ED1B5736BD73629AAB028F065FD098464E5105FF09")],
        [[BigNumber.from("0x26FACADC6AB2858BD74A1CD8891E203F178C1A12DCD4F407A6469C570962F83A"),BigNumber.from("0x200C0151DCB18EBB00C67DB4F11879FC90750965A59CCC42C09570ADB67B0331")],[BigNumber.from("0x1807D7C63947EB29808EA83A0D5F9F9BFAB087F7D079DCDD40B482E70B250154"), BigNumber.from("0x29B383EF72B8206BA54C97E51AA84AA6621B4C2454FD8844A98EBA64F8B53AA3")]]];

    let [specifier_yes_g1, specifier_yes_g2, specifier_no_g1, specifier_no_g2] = specifiers;

    const createElectionTx = await elections.createElection("Test Election", specifier_yes_g1, specifier_yes_g2, specifier_no_g1, specifier_no_g2);
    await createElectionTx.wait();
    console.log("New election created successfully!")

    let electionId = 0;
    let election = await elections.elections(electionId);
    console.log("Current election status: ", election.state)

    // Add key to the election census
    let pubKey = [BigNumber.from("0x112A721A2442DA0139CDBA6F8CD3CEC3C9CBEEA950DFFDCCF065187E527D3FA2"),BigNumber.from("0x054312D57A8479511812B0B4477D0628B9AC375758AB1189740D9F725E237DA9")]
    const registerKeyTx = await elections.registerInCensus(pubKey);
    await registerKeyTx.wait();
    console.log("Updated census with a new key.");

    // Submit a proof for the election vote
    let proof = [BigNumber.from("0x029450A64E224CA89493CE649B74E4670A1C73C2AEBEBE4323FA5A8402D0C985"),BigNumber.from("0x2588077E6BE91E375D43675DF907967BCCF25D9782C6E67C00599C9416269B7A")];
    let yes_vote_ids = [0] // First person in the census voted yes
    let no_vote_ids = [] // No one voted no
    const submitVoteWithProofTx = await elections.submitVotesWithProof(electionId, yes_vote_ids, no_vote_ids, proof)
    await submitVoteWithProofTx.wait();
    console.log("Voter 0 election vote: ", await (elections.elections(electionId)).votes(0))

    // Close the election
    const closeElectionTx = await elections.closeElection(electionId);
    await closeElectionTx.wait();
    console.log("Final election results: ", await (elections.elections(electionId)).result)
}

const runMain = async () => {
  try {
      await main();
      process.exit(0);
  } catch (error) {
      console.log(error);
      console.error(1);
  }
}

runMain();
