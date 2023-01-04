const {ethers, run} = require("hardhat");

const main = async () => {
    const [deployer] = await ethers.getSigners();

    const WAIT_BLOCK_CONFIRMATIONS = 6;

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    console.log("Deploying Token...");
    const Token = await ethers.getContractFactory("DummyToken");
    const token = await Token.deploy();

    await token.deployTransaction.wait(WAIT_BLOCK_CONFIRMATIONS);

    console.log("Token Address:", token.address);

    // Uncomment in case the token contract is not verified:
    // console.log("Verifying Token contract on Etherscan...");
    // await run("verify:verify", {
    //     address: token.address,
    //     constructorArguments: [
    //     ],
    // });
    // console.log("Token contract verified on Etherscan!");

    console.log("Deploying BatRaVot...");
    const BatRaVot = await ethers.getContractFactory("BatRaVot");
    const batravot = await BatRaVot.deploy(token.address);

    await batravot.deployTransaction.wait(WAIT_BLOCK_CONFIRMATIONS);

    console.log("BatRaVot deployed to:", batravot.address);

    // console.log("Verifying BatRaVot contract on Etherscan...");
    // await run("verify:verify", {
    //     address: batravot.address,
    //     constructorArguments: [
    //         token.address
    //     ],
    // });
    // console.log("BatRaVot contract verified on Etherscan!");


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
