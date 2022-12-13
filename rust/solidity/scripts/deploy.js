const {ethers} = require("hardhat");

const main = async () => {
    const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    const BatRaVot = await ethers.getContractFactory("BatRaVot");
    const elections = await BatRaVot.deploy();

    await elections.deployed();
    console.log("Election Handler deployed to:", elections.address);
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
