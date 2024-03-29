// https://eth-ropsten.alchemyapi.io/v2/7IwaOHs1Gtc_ur3eeuHTIS7iY4nWh_bw

// const { network } = require("hardhat");

require("dotenv").config();
require("@nomicfoundation/hardhat-toolbox");
require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-etherscan");

const { SEPOLIA_API_URL, PRIVATE_KEY, ETHERSCAN_API_KEY } = process.env;

module.exports = {
  solidity: '0.8.17',
  defaultNetwork: "hardhat",
  etherscan: {
    apiKey: `${ETHERSCAN_API_KEY}`
  },
  networks: {
    hardhat: {},
    sepolia: {
      url: SEPOLIA_API_URL,
      accounts: [`0x${PRIVATE_KEY}`]
    }
  }
}