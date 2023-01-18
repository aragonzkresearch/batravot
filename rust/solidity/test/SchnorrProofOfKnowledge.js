const { expect } = require("chai");
const { ethers } = require("hardhat");
const {BigNumber} = require("ethers");

describe("Testing functionality", function () {

    async function deploySchnorr() {
        const Schnorr = await ethers.getContractFactory("SchnorrKnowledgeProofTest");
        const schnorr = await Schnorr.deploy();
        await schnorr.deployed();

        console.log("SchnorrSignature deployed to:", schnorr.address);
        return schnorr;
    }

    it("Dummy test", async function () {
        expect(1).to.equal(1);
    });

    it("A correct signature should be verified", async function () {
        const schnorr = await deploySchnorr();

        const s = BigNumber.from("0x25c7127406cd7d95efbd62fdbc2c4c9b43b49e217c76f7cec4c3dfffe6e9cb00");
        const t = [BigNumber.from("0x20e019c9e21cfbbcc9e643eac58cce0973654074e46af366dc50d58bb7de9809") , BigNumber.from("0x235d95bb6b7c0831433c235682e39ece8b80137612497b0659c2b9c664703511")];
        const pk = [BigNumber.from("0x2631d7ff14bdc3f5596d17af07f8449a819b52c7a66ab5f6ede1d0d38a243b39") , BigNumber.from("0x1d670d795ecd9ee0fb30fad583cdf95610f47a2b8462743a8fffa05c781e7f27")];

        const result = await schnorr.testVerify(pk, [t, s]);

        expect(result).to.equal(true);
    });

    it("A incorrect signature should not be verified", async function () {
        const schnorr = await deploySchnorr();

        const s = BigNumber.from("0x28aeb56038144b30ab36147cd2deb495a54bcbcbe93e4af4e952e889e8d15bbf");
        const t = [BigNumber.from("0x16d5e1ec52142853b0f65f14d99b106cf476ff2c9aa3b022ca9e0840e72a7ccb") , BigNumber.from("0x1c14a099adfdd4a092b3fdd0e30048ade43ebd2c078225ce989ea8b269bbfaee")];
        const pk = [BigNumber.from("0x2631d7ff14bdc3f5596d17af07f8449a819b52c7a66ab5f6ede1d0d38a243b39") , BigNumber.from("0x1d670d795ecd9ee0fb30fad583cdf95610f47a2b8462743a8fffa05c781e7f27")];

        const result = await schnorr.testVerify(pk, [t, s]);

        expect(result).to.equal(false);
    });

    it("Hash correct", async function () {
        const schnorr = await deploySchnorr();

        const s = BigNumber.from('0x0B250C98F3AD01F0854FBA5E10636406E0E069A679F929E1BF21D1028AB86D84');
        const t = [BigNumber.from("0x27bc5111ddb9fed05e782923ba8241ce15119822aa64089c14938abe40abf39f") , BigNumber.from("0x2f16e2c7fb982cc741d9b95cb146c7ac0602ef3a177338a769598389467024d0")];

        const pk =  [BigNumber.from("0x13651735f438283d2ad60efb754892be5d3193fcf80e73fac81d04717515a683") , BigNumber.from("0x29bda708fe1159b4b8943141dc7d9e04436f49bf0e6b4f4d12cf8136abce4bd0")];

        const expectedHash = BigNumber.from("0x1a2ad17c300f3ebe161e90331e0e986ba12a44376b060b97cf28aaa0f5f24428")
        const result = await schnorr.hashTest(pk, [t, s], expectedHash);

        expect(result).to.equal(true);
    });
});