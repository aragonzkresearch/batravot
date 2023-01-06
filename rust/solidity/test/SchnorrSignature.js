const { expect } = require("chai");
const { ethers } = require("hardhat");
const {BigNumber} = require("ethers");

describe("Testing functionality", function () {

    async function deploySchnorrSignature() {
        const SchnorrSignature = await ethers.getContractFactory("SchnorrSignatureTest");
        const schnorrSignature = await SchnorrSignature.deploy();
        await schnorrSignature.deployed();

        console.log("SchnorrSignature deployed to:", schnorrSignature.address);
        return schnorrSignature;
    }

    it("Dummy test", async function () {
        expect(1).to.equal(1);
    });

    it("A correct signature should be verified", async function () {
        const schnorrSignature = await deploySchnorrSignature();

        const s = BigNumber.from('0x0B250C98F3AD01F0854FBA5E10636406E0E069A679F929E1BF21D1028AB86D84');
        const e = BigNumber.from('0x08B2709D316479272F91D773CE87B1796BBE0A0968FA175BEDF2FCEC84FA604C');
        const pk = [BigNumber.from('0x0386E93C66894B09AFD70BA97F335D0D50F27564CAC6331180D45AF6C22B3855'),BigNumber.from('0x2CB47DAF9F01C10CC16CD0A3FBF8ADD9CE6BCCEC8C4EFFECB1B85F417752A746')];

        const result = await schnorrSignature.verifySignature(pk, [s, e]);

        expect(result).to.equal(true);
    });

    it("A wrong signature should not be verified", async function () {
        const schnorrSignature = await deploySchnorrSignature();

        const s = BigNumber.from('0x0B250C98F3AD01F0854FBA5E10636406E0E069A679F929E1BF21D1028AB86D84');
        const e = BigNumber.from('0x08B2709D316479272F91D773CE87B1796BBE0A0968FA175BEDF2FCEC84FA604C');

        const pk = [BigNumber.from('0x0EBEB508172287273BFDA3FBA927389AD1834EEE1B349902AAD092E3E97A56F2'),BigNumber.from('0x13214EC29A044C8655986BC504C6FC7A015CCC2F2205E94AD96DF04A51A53417')];

        const result = await schnorrSignature.verifySignature(pk, [s, e]);

        expect(result).to.equal(false);
    });
});