const {ethers, run} = require("hardhat");

const main = async () => {
    const [deployer] = await ethers.getSigners();

    const WAIT_BLOCK_CONFIRMATIONS = 6;

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    const tokenAddress = "PLEASE_REPLACE_ME_WITH_ERC20_TOKEN_ADDRESS";
    if (tokenAddress === "PLEASE_REPLACE_ME_WITH_ERC20_TOKEN_ADDRESS") {
        throw new Error("Please replace tokenAddress with your token address");
    }
    console.log("Using token address:", tokenAddress);


    console.log("Deploying BatRaVot...");
    const BatRaVot = await ethers.getContractFactory("BatRaVot");
    const batravot = await BatRaVot.deploy(tokenAddress);

    await batravot.deployTransaction.wait(WAIT_BLOCK_CONFIRMATIONS);

    console.log("BatRaVot deployed to:", batravot.address);


    try {
        console.log("Verifying BatRaVot contract on Etherscan...");
        await run("verify:verify", {
            address: batravot.address,
            constructorArguments: [
                token.address
            ],
        });
        console.log("BatRaVot contract verified on Etherscan!");
    } catch (error) {
        console.log("Error while verifying BatRaVot contract on Etherscan:", error);
    }

    console.log("Done!");

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
