const { expect } = require("chai");
const { ethers } = require("hardhat");
const {BigNumber} = require("ethers");

const {
  loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");

describe("Testing BatRaVot MultiSig smart contract", function () {


  async function deployElectionContractFixture() {

    const BatRaVot = await ethers.getContractFactory("MultiSigBatRaVot");
    const batravot = await BatRaVot.deploy();

    await batravot.deployed();
    return [batravot];
  }

  async function startNewElection(batravot, threshold = 1, electionId = BigNumber.from(0)) {
    // Start a new election
    let specifiers = [
      [BigNumber.from("0x0ecea7b5c4498cd0d8ca3476f658757889c6cd9fa090b9f8ab778c73f95c40f3") , BigNumber.from("0x025f96216182512c444d1c7c2db6735c8775e1532bbb4e27abea471863958cee")], [BigNumber.from("0x26c998e960e017b48f9438b0c33423ba591dc57a029ffa64edb96d4489390024") , BigNumber.from("0x196b543d6cc72af733d548abe7a411b59d80e4f19e9b2140a09462aa28c2fa82"), BigNumber.from("0x2821f5a3184125ee6ceb3bce02281f89b77bcc13c7caa7f61f7d1baa0a189925") , BigNumber.from("0x2455513663623b50458a9e96d2dceb3216a07ac64e878e9805cce6515bbb66e9")]
    ];

    let [specifier_yes_g1, specifier_yes_g2] = specifiers;


    const createElectionTx = await batravot.createElection("Test Election", threshold, specifier_yes_g1, specifier_yes_g2);
    await createElectionTx.wait();

    let election = await batravot.elections(electionId);
    return election.state;
  }

  async function registerVoters(batravot, voters) {
    for (let [_, ethPrk, ethAddress, pubKey, proof] of voters) {

      const account = new ethers.Wallet(ethPrk, ethers.provider);

      // As well as a bit of ETH to pay for gas
      let tx = {
        to: ethAddress,
        // Convert currency unit from ether to wei
        value: ethers.utils.parseEther("0.1"),
      }
      const [owner] = await ethers.getSigners();
      await owner.sendTransaction(tx);


      // Now, we can register the voter, we need to send the registration transaction from the voter's address
      const registerVoterTx = await batravot.connect(account).registerVoter(pubKey, proof);
      await registerVoterTx.wait();
    }
  }

  async function submitElectionProof(batravot, for_voters, proof, electionId = BigNumber.from(0)) {
    const submitVoteWithProofTx = await batravot.submitVotesWithProof(electionId, for_voters, proof);
    await submitVoteWithProofTx.wait();
  }

  async function closeElectionAndGetResult(batravot, electionId = BigNumber.from(0)) {
    const closeElectionTx = await batravot.closeElection(electionId);
    await closeElectionTx.wait();

    return (await batravot.elections(electionId));
  }


  it("Can deploy BatRaVot", async function () {
    const [batravot] = await loadFixture(deployElectionContractFixture)
    console.log("BatRaVot deployed to:", batravot.address);
    expect(batravot.address).to.not.equal("");
  });

  it("Can start new election", async function () {
    const [batravot] = await loadFixture(deployElectionContractFixture)

    // Check that the electionCount is 0
    expect(await batravot.electionCount()).to.equal(0);

    expect(await startNewElection(batravot, 10)).to.equal(0);

    // Check that the electionCount increased
    expect(await batravot.electionCount()).to.equal(1);
    // Check that the election was created with the correct parameters
    let election = await batravot.elections(BigNumber.from(0));

    expect(election.state).to.equal(0);
    expect(election.topic).to.equal("Test Election");
    expect(election.forVotes).to.equal(0);
    expect(election.threshold).to.equal(10);
  });

  it("One correct vote `For` out of 10 required", async function () {
    const [batravot] = await loadFixture(deployElectionContractFixture)
    await startNewElection(batravot, 10);
    console.log("New election created successfully!")


    // Add keys to the election census
    let voters = [
      [5, BigNumber.from("0x5951647af6c9301fd81debb444cfa6abd8af4eb953f0286dc5dd583def74c8af"), "0xcc3e95add74484967fafab4c96b14577166cde37", [BigNumber.from("0x2c73fd312a9c3b5c2ab57c5fc12b4a1ad08b245a86ecb1744bb672da676a9b23") , BigNumber.from("0x0a9f46d4388aa89ec81ef2bfc538996d9d2c0d85d0ed6a56e4655b2ba0443de7")], [BigNumber.from("0x2c3bd68ae95c86721a2e9d01dcaf2212a297325c77594d56d8d9ba0759a56d8c"), BigNumber.from("0x1536cdbab2a7b341b7bcf3ce1778aaa2d2d6caada4cdfed993cf43afd7fc492b"), BigNumber.from("0x2a9ae02e98a77c1da99a0efaa1bd4e061f2f7a20a1a8d42a9b752a9bff31c632")]]
    ];
    await registerVoters(batravot, voters);
    console.log("Voter registered successfully!")

    // Submit a proof for the election vote
    let [proof] = [
      [BigNumber.from("0x01b6998011a8a862564ebdeaaaf055708dbe5236da1d6727b959d0c62b477c71") , BigNumber.from("0x25abcbd699cefeb30e544c5a8fa8d997e25846c373632b487ee04284baad511a")]
    ];

    // Who voted for whom
    let for_voters = ['0xcc3e95add74484967fafab4c96b14577166cde37'] // First person in the census voted yes


    await submitElectionProof(batravot, for_voters, proof);
    console.log("Submitted a vote proof for the election.")

    // Check the election and check the result
    let election = await batravot.elections(0);

    expect(election.forVotes).to.equal(1);
    expect(election.threshold).to.equal(10);
    expect(election.state).to.equal(0);
  });

  it("10 correct votes `For` out of 10 required", async function () {
    const [batravot] = await loadFixture(deployElectionContractFixture)
    await startNewElection(batravot, 10);

    // Add key to the election census
    let voters = [
          [10, BigNumber.from("0x5f6c0209ecd827e914535c5b1afa3b4b6f48285d242d00b37af511dc9ed9ea7b"), "0x48d5f0b15c8fd0f25b8aaed22b567f8cd3fc0ac2", [BigNumber.from("0x2c73fd312a9c3b5c2ab57c5fc12b4a1ad08b245a86ecb1744bb672da676a9b23") , BigNumber.from("0x0a9f46d4388aa89ec81ef2bfc538996d9d2c0d85d0ed6a56e4655b2ba0443de7")], [BigNumber.from("0x041ce74518c3b01010d18e4b0cea31d91f37c86ac5ef48a012a2402c8f6db283"), BigNumber.from("0x2d8c135bd7cb2f2a17c0e71cb91bcd3f63b817cda17a9ebcae0e768070b09022"), BigNumber.from("0x2f98d237f86fb22e37fc0ee9349f3ed9d3e491016c464c991625c7013994ba70")]],
          [20, BigNumber.from("0xc23cd735bae1b6590c8f212894baceeda3cb654b57afa3bc040502a6b9837b4a"), "0x5bba73a2c56a9f2880963230bc49157bed5ad882", [BigNumber.from("0x042ab0055cc8060c73e6dc87b55a4bcf27a7d7622cd39b044b6a7529e5b0f2ab") , BigNumber.from("0x133b0707bac31ffa1fbf33e7b2bdb79790164ddf6fbd71b363e2d36b9cbda3a3")], [BigNumber.from("0x19e12a0d7e4bf5fd4a5332dd95c49abd69865adfb6f54207da0f494221c517e0"), BigNumber.from("0x24193a8f90154b0662f04f8eb75d09b033fce21e9f59b58bf38cc9332b881ac3"), BigNumber.from("0x2655735cd2e25a8fb5a2d4072bc84426c1dbf74b9793287c29b0804badf4ce60")]],
          [50, BigNumber.from("0xdae4d6aeb0f67b09b7dcb98dc5058f2916b058ff82244caaa5e7922762641316"), "0x77c4414f24dc933b659e7125bc71de1a503a6332", [BigNumber.from("0x29ba0bf714e3507efccb6b6170d7a8a80a0de74bee8568f543ca11093901a98b") , BigNumber.from("0x208c19401b6d550f6a6c463b341eda691bdd581046ae9aa54c71d876cf33cc61")], [BigNumber.from("0x0a951a0d0fb71f35e2e55e5960ec726fa7920b0f8da6f2b8fcb0f4a5f1f3f336"), BigNumber.from("0x107867f0889714d3f9cce526418a64e23318dc7d8ef17410a18109a65b8b0344"), BigNumber.from("0x0abe5312b97e3d55e56dedbb364651ffbe77b911ba05dcf735fa1e3d302c9992")]],
          [20, BigNumber.from("0x6191369746f7b6b61d665e6152cf2e5f4829eb78570b3a845738a272829cd185"), "0xedebfed7145b4e0b8883a97b4d62058de5b8397c", [BigNumber.from("0x22859fa00b7b31a4fb2070fb8714f5e72b26da64c5ee4e56d40a800c1640225b") , BigNumber.from("0x2c16f1c85c0c8c4a6b61a3e98f1d7b1308ceeb9cb0ed884bcc48993274222261")], [BigNumber.from("0x2dacc08ecaf02a99b0b6cccf27d50df18f25a534b31945fcaf743cb6e90ba328"), BigNumber.from("0x283fd8cc2542d44242ccb0496e77f29c977e4594116aa3503be4b19fcd591956"), BigNumber.from("0x2527bd34a891f445bd5f07d8d6377dc4dc022f2f08f439bc2d62f24189857661")]],
          [50, BigNumber.from("0xa9ee4a51d1bab72d1ec4f59674c8a885527e728133f7c1a17890c31a304539c1"), "0x91c73e2cb3c9fc3124d979654f1d32e1214f5a2f", [BigNumber.from("0x1cb84c5512da58d5b14359714fec0e65140b1647f29544f0992d28f31ed43019") , BigNumber.from("0x0a92d6a481f513e2a33b77b1d163c06af33b6cc2d41253584d658576969c3f20")], [BigNumber.from("0x04c90a9073c8c5c2ab052d98c0a9b4c34d084a0478525cd9b0f2cd79fb511706"), BigNumber.from("0x1a2825d427d878d888c2f75a4eca419b5c7266af2cad6c15d44b62e40a107932"), BigNumber.from("0x0173d7daaa5412ca67d2502fd9400c71b71998b5d8869ecbe28de3eb353eb6b9")]],
          [5, BigNumber.from("0x5fa650f9c36111d90d244552d8c448f074daffe67cc98c7a157a12d8ba9558bd"), "0x11d9de6c97c2481ec89c5700588cde34c3f8fb88", [BigNumber.from("0x12adbdbfb2f02faf6b4730381c9f7cc91b6905d3f633d536fd3c7daf0e80f893") , BigNumber.from("0x1b9d2c815592d0aecdc55dc7f55080431e70abfeb98978b76480b32047dfd97b")], [BigNumber.from("0x158e57b2691678076f3dc65aa53cfa736d97048db462d7b410ce233c4d044ad3"), BigNumber.from("0x2bcb18f91a4e175dcda10e570ae19501cf2cea883d2c0a3692051f2b07fcf984"), BigNumber.from("0x15f03327b6de901c22c86d16571e41965f824553225167094c1a173ccb8c4936")]],
          [10, BigNumber.from("0x169c539d745453e7518af13fbe3adee1e632ac68445e23990a0a19cf53003464"), "0x9b8aafd267966aafe1da77f203a6625bcd653b7c", [BigNumber.from("0x007091419cc1485b50764ded371a7abb785d31bbfcb09d254f10e9ef0df0950c") , BigNumber.from("0x095a05eadfa44a8d57b5eafe79ce7440e8f141083834a9d1bb1f682fa0d8a4e7")], [BigNumber.from("0x12e259712623ae933729ec8164e444b06339c54c8e2f33d7767223c42aca8702"), BigNumber.from("0x1f6318bb3caf2a81ce00beb775292dcd66a554e4f1fb28bb4a53cba46f8bbe48"), BigNumber.from("0x23e797e95dc4841303e08dfe2fdf03362f067336f11e6bffe959152beb534fde")]],
          [2, BigNumber.from("0x4ac8126a62be30604ee235b5ad3660095470dfc03080f106af4a72c64c0879c1"), "0x1a8ef664f0db46f4d97a4ff410f44a1c6d19ac5c", [BigNumber.from("0x0f8ea9ee1cfcf36465d0ea5fa46641211b739dd7853429bdb7b82029f614fbd4") , BigNumber.from("0x20cd4008abc7e98d3ac6ed0c5e72880a70c310220db5a59c4d3cd27f0a40abda")], [BigNumber.from("0x201be0c1c89fdb09ef82fd7acc6ed425647377d809a4bc75e2238f88031be008"), BigNumber.from("0x11285dff7a90fada32ff82d581afa2876eac8cbee9c0918f48dd32b2e35fdc95"), BigNumber.from("0x2876cc66585ac830d88b0a7e3f6c90fb1f9c80f844ceffe652252aef93f3d4d0")]],
          [2, BigNumber.from("0x8b8241cdce28dfee068b2ac5e8bcfa93403b1ba2a4e95c0bbbab34a015ec6b4f"), "0x7d1cc66d0285ef51691a404719d37d0e0a413205", [BigNumber.from("0x221fb169fa846f779b23b24a24ec910340edba878838230788da356e72e57266") , BigNumber.from("0x1ef43623459ce8428690b5c8b2be13efd693dfee7921bf87b47b2cac25834d0d")], [BigNumber.from("0x22cb8041dda856c9843e885c131c29ae384f7481607dc5b477c3d824a04a4a8a"), BigNumber.from("0x1fbbe43b0c31f020f9ab1f2925bf5f7cad76a262e69ddc96487ced7dcefa2b8b"), BigNumber.from("0x1e37cab2558cae329989249ce3c4a59d4de2d91def9de737d76b95a1f9ceee4d")]],
          [40, BigNumber.from("0xaf717e14463a4f3ff02f20f705dcf98b985fe4832ab570f9d3fe540f5b967d35"), "0x28076fca189065de528a8ea92a9e90687a3245b5", [BigNumber.from("0x300a9f80365333b6cd3c1be014c3e660bb7c9447588e33bf2174f21900062e18") , BigNumber.from("0x29354cdc4a96012ea5adb6a5d1f4d98e77a86830f3bb7c7a338c9f81c77716bf")], [BigNumber.from("0x2f8b9fb787ee6803c13f56975a0a79c03ff5caa605681f0c690fbabf42a530d3"), BigNumber.from("0x0a9fd7684e756eaad800c5e1de474d23805de88eeb9da791b5c7e5ffd0cc9bf4"), BigNumber.from("0x28a6792ccb8168333b315e13b2593cadf940d5bdec10d16626420c606b28a2c4")]],
    ];

    await registerVoters(batravot, voters);

    // Submit a proof for the election vote

    // Who voted for whom
    let for_voters =
        ["0x48d5f0b15c8fd0f25b8aaed22b567f8cd3fc0ac2", "0x5bba73a2c56a9f2880963230bc49157bed5ad882", "0x77c4414f24dc933b659e7125bc71de1a503a6332", "0xedebfed7145b4e0b8883a97b4d62058de5b8397c", "0x91c73e2cb3c9fc3124d979654f1d32e1214f5a2f", "0x11d9de6c97c2481ec89c5700588cde34c3f8fb88", "0x9b8aafd267966aafe1da77f203a6625bcd653b7c", "0x1a8ef664f0db46f4d97a4ff410f44a1c6d19ac5c", "0x7d1cc66d0285ef51691a404719d37d0e0a413205", "0x28076fca189065de528a8ea92a9e90687a3245b5"]

    let [proof] = [
      [BigNumber.from("0x055ebd8f99f1e7a756a81a2af0a514689e92749375e5368334c1a765cd06dd7c") , BigNumber.from("0x23d7a6076f3ab9234e7bc14489e1b5db922dde44a28081b939737b407b5b03b9")]
    ];

    await submitElectionProof(batravot, for_voters, proof);
    console.log("Submitted a vote proof for the election.")

    // Close the election and check the result
    let election = await batravot.elections(0);

    expect(election.state).to.equal(2);

    // Check that the election can not be closed again
    await expect(batravot.closeElection(0)).to.be.revertedWith("The election must be in Pending state");

  });

  it("Can submit multiple independent proofs", async function () {
    const [batravot] = await loadFixture(deployElectionContractFixture);
    await startNewElection(batravot, 2);

    // Add key to the election census
    let voters = [
      [5, BigNumber.from("0x5951647af6c9301fd81debb444cfa6abd8af4eb953f0286dc5dd583def74c8af"), "0xcc3e95add74484967fafab4c96b14577166cde37", [BigNumber.from("0x2c73fd312a9c3b5c2ab57c5fc12b4a1ad08b245a86ecb1744bb672da676a9b23") , BigNumber.from("0x0a9f46d4388aa89ec81ef2bfc538996d9d2c0d85d0ed6a56e4655b2ba0443de7")], [BigNumber.from("0x2c3bd68ae95c86721a2e9d01dcaf2212a297325c77594d56d8d9ba0759a56d8c"), BigNumber.from("0x1536cdbab2a7b341b7bcf3ce1778aaa2d2d6caada4cdfed993cf43afd7fc492b"), BigNumber.from("0x2a9ae02e98a77c1da99a0efaa1bd4e061f2f7a20a1a8d42a9b752a9bff31c632")]],
      [10, BigNumber.from("0x5f6c0209ecd827e914535c5b1afa3b4b6f48285d242d00b37af511dc9ed9ea7b"), "0x48d5f0b15c8fd0f25b8aaed22b567f8cd3fc0ac2", [BigNumber.from("0x2c73fd312a9c3b5c2ab57c5fc12b4a1ad08b245a86ecb1744bb672da676a9b23") , BigNumber.from("0x0a9f46d4388aa89ec81ef2bfc538996d9d2c0d85d0ed6a56e4655b2ba0443de7")], [BigNumber.from("0x041ce74518c3b01010d18e4b0cea31d91f37c86ac5ef48a012a2402c8f6db283"), BigNumber.from("0x2d8c135bd7cb2f2a17c0e71cb91bcd3f63b817cda17a9ebcae0e768070b09022"), BigNumber.from("0x2f98d237f86fb22e37fc0ee9349f3ed9d3e491016c464c991625c7013994ba70")]]
    ];

    await registerVoters(batravot, voters);
    // Proof 1:

    // Who voted for whom
    let for_voters_1 = ['0xcc3e95add74484967fafab4c96b14577166cde37'] // First person in the census voted yes

    let [proof_1] = [
      [BigNumber.from("0x01b6998011a8a862564ebdeaaaf055708dbe5236da1d6727b959d0c62b477c71") , BigNumber.from("0x25abcbd699cefeb30e544c5a8fa8d997e25846c373632b487ee04284baad511a")]
    ];

    await submitElectionProof(batravot, for_voters_1, proof_1);
    console.log("Submitted a vote proof for the election.")

    console.log("Submitted a vote proof 1 for the election.")

    let election = await batravot.elections(0);

    expect(election.state).to.equal(0);
    expect(election.forVotes).to.equal(1);

    // Proof 2:

    // Who voted for whom
    let for_voters_2 =
        ["0x48d5f0b15c8fd0f25b8aaed22b567f8cd3fc0ac2"]

    let [proof_2] = [
      [BigNumber.from("0x01b6998011a8a862564ebdeaaaf055708dbe5236da1d6727b959d0c62b477c71") , BigNumber.from("0x25abcbd699cefeb30e544c5a8fa8d997e25846c373632b487ee04284baad511a")]
    ];

    await submitElectionProof(batravot, for_voters_2, proof_2);
    console.log("Submitted a vote proof 1 for the election.")


    // Get the election and check that it has been closed
    election = await batravot.elections(0);

    expect(election.state).to.equal(2);
  });

  it("Can submit multiple overlapping proofs", async function () {
    const [batravot] = await loadFixture(deployElectionContractFixture)
    await startNewElection(batravot, 11);

    // Add key to the election census
    let voters = [
      [10, BigNumber.from("0x5f6c0209ecd827e914535c5b1afa3b4b6f48285d242d00b37af511dc9ed9ea7b"), "0x48d5f0b15c8fd0f25b8aaed22b567f8cd3fc0ac2", [BigNumber.from("0x2c73fd312a9c3b5c2ab57c5fc12b4a1ad08b245a86ecb1744bb672da676a9b23") , BigNumber.from("0x0a9f46d4388aa89ec81ef2bfc538996d9d2c0d85d0ed6a56e4655b2ba0443de7")], [BigNumber.from("0x041ce74518c3b01010d18e4b0cea31d91f37c86ac5ef48a012a2402c8f6db283"), BigNumber.from("0x2d8c135bd7cb2f2a17c0e71cb91bcd3f63b817cda17a9ebcae0e768070b09022"), BigNumber.from("0x2f98d237f86fb22e37fc0ee9349f3ed9d3e491016c464c991625c7013994ba70")]],
      [20, BigNumber.from("0xc23cd735bae1b6590c8f212894baceeda3cb654b57afa3bc040502a6b9837b4a"), "0x5bba73a2c56a9f2880963230bc49157bed5ad882", [BigNumber.from("0x042ab0055cc8060c73e6dc87b55a4bcf27a7d7622cd39b044b6a7529e5b0f2ab") , BigNumber.from("0x133b0707bac31ffa1fbf33e7b2bdb79790164ddf6fbd71b363e2d36b9cbda3a3")], [BigNumber.from("0x19e12a0d7e4bf5fd4a5332dd95c49abd69865adfb6f54207da0f494221c517e0"), BigNumber.from("0x24193a8f90154b0662f04f8eb75d09b033fce21e9f59b58bf38cc9332b881ac3"), BigNumber.from("0x2655735cd2e25a8fb5a2d4072bc84426c1dbf74b9793287c29b0804badf4ce60")]],
      [50, BigNumber.from("0xdae4d6aeb0f67b09b7dcb98dc5058f2916b058ff82244caaa5e7922762641316"), "0x77c4414f24dc933b659e7125bc71de1a503a6332", [BigNumber.from("0x29ba0bf714e3507efccb6b6170d7a8a80a0de74bee8568f543ca11093901a98b") , BigNumber.from("0x208c19401b6d550f6a6c463b341eda691bdd581046ae9aa54c71d876cf33cc61")], [BigNumber.from("0x0a951a0d0fb71f35e2e55e5960ec726fa7920b0f8da6f2b8fcb0f4a5f1f3f336"), BigNumber.from("0x107867f0889714d3f9cce526418a64e23318dc7d8ef17410a18109a65b8b0344"), BigNumber.from("0x0abe5312b97e3d55e56dedbb364651ffbe77b911ba05dcf735fa1e3d302c9992")]],
      [20, BigNumber.from("0x6191369746f7b6b61d665e6152cf2e5f4829eb78570b3a845738a272829cd185"), "0xedebfed7145b4e0b8883a97b4d62058de5b8397c", [BigNumber.from("0x22859fa00b7b31a4fb2070fb8714f5e72b26da64c5ee4e56d40a800c1640225b") , BigNumber.from("0x2c16f1c85c0c8c4a6b61a3e98f1d7b1308ceeb9cb0ed884bcc48993274222261")], [BigNumber.from("0x2dacc08ecaf02a99b0b6cccf27d50df18f25a534b31945fcaf743cb6e90ba328"), BigNumber.from("0x283fd8cc2542d44242ccb0496e77f29c977e4594116aa3503be4b19fcd591956"), BigNumber.from("0x2527bd34a891f445bd5f07d8d6377dc4dc022f2f08f439bc2d62f24189857661")]],
      [50, BigNumber.from("0xa9ee4a51d1bab72d1ec4f59674c8a885527e728133f7c1a17890c31a304539c1"), "0x91c73e2cb3c9fc3124d979654f1d32e1214f5a2f", [BigNumber.from("0x1cb84c5512da58d5b14359714fec0e65140b1647f29544f0992d28f31ed43019") , BigNumber.from("0x0a92d6a481f513e2a33b77b1d163c06af33b6cc2d41253584d658576969c3f20")], [BigNumber.from("0x04c90a9073c8c5c2ab052d98c0a9b4c34d084a0478525cd9b0f2cd79fb511706"), BigNumber.from("0x1a2825d427d878d888c2f75a4eca419b5c7266af2cad6c15d44b62e40a107932"), BigNumber.from("0x0173d7daaa5412ca67d2502fd9400c71b71998b5d8869ecbe28de3eb353eb6b9")]],
      [5, BigNumber.from("0x5fa650f9c36111d90d244552d8c448f074daffe67cc98c7a157a12d8ba9558bd"), "0x11d9de6c97c2481ec89c5700588cde34c3f8fb88", [BigNumber.from("0x12adbdbfb2f02faf6b4730381c9f7cc91b6905d3f633d536fd3c7daf0e80f893") , BigNumber.from("0x1b9d2c815592d0aecdc55dc7f55080431e70abfeb98978b76480b32047dfd97b")], [BigNumber.from("0x158e57b2691678076f3dc65aa53cfa736d97048db462d7b410ce233c4d044ad3"), BigNumber.from("0x2bcb18f91a4e175dcda10e570ae19501cf2cea883d2c0a3692051f2b07fcf984"), BigNumber.from("0x15f03327b6de901c22c86d16571e41965f824553225167094c1a173ccb8c4936")]],
      [10, BigNumber.from("0x169c539d745453e7518af13fbe3adee1e632ac68445e23990a0a19cf53003464"), "0x9b8aafd267966aafe1da77f203a6625bcd653b7c", [BigNumber.from("0x007091419cc1485b50764ded371a7abb785d31bbfcb09d254f10e9ef0df0950c") , BigNumber.from("0x095a05eadfa44a8d57b5eafe79ce7440e8f141083834a9d1bb1f682fa0d8a4e7")], [BigNumber.from("0x12e259712623ae933729ec8164e444b06339c54c8e2f33d7767223c42aca8702"), BigNumber.from("0x1f6318bb3caf2a81ce00beb775292dcd66a554e4f1fb28bb4a53cba46f8bbe48"), BigNumber.from("0x23e797e95dc4841303e08dfe2fdf03362f067336f11e6bffe959152beb534fde")]],
      [2, BigNumber.from("0x4ac8126a62be30604ee235b5ad3660095470dfc03080f106af4a72c64c0879c1"), "0x1a8ef664f0db46f4d97a4ff410f44a1c6d19ac5c", [BigNumber.from("0x0f8ea9ee1cfcf36465d0ea5fa46641211b739dd7853429bdb7b82029f614fbd4") , BigNumber.from("0x20cd4008abc7e98d3ac6ed0c5e72880a70c310220db5a59c4d3cd27f0a40abda")], [BigNumber.from("0x201be0c1c89fdb09ef82fd7acc6ed425647377d809a4bc75e2238f88031be008"), BigNumber.from("0x11285dff7a90fada32ff82d581afa2876eac8cbee9c0918f48dd32b2e35fdc95"), BigNumber.from("0x2876cc66585ac830d88b0a7e3f6c90fb1f9c80f844ceffe652252aef93f3d4d0")]],
      [2, BigNumber.from("0x8b8241cdce28dfee068b2ac5e8bcfa93403b1ba2a4e95c0bbbab34a015ec6b4f"), "0x7d1cc66d0285ef51691a404719d37d0e0a413205", [BigNumber.from("0x221fb169fa846f779b23b24a24ec910340edba878838230788da356e72e57266") , BigNumber.from("0x1ef43623459ce8428690b5c8b2be13efd693dfee7921bf87b47b2cac25834d0d")], [BigNumber.from("0x22cb8041dda856c9843e885c131c29ae384f7481607dc5b477c3d824a04a4a8a"), BigNumber.from("0x1fbbe43b0c31f020f9ab1f2925bf5f7cad76a262e69ddc96487ced7dcefa2b8b"), BigNumber.from("0x1e37cab2558cae329989249ce3c4a59d4de2d91def9de737d76b95a1f9ceee4d")]],
      [40, BigNumber.from("0xaf717e14463a4f3ff02f20f705dcf98b985fe4832ab570f9d3fe540f5b967d35"), "0x28076fca189065de528a8ea92a9e90687a3245b5", [BigNumber.from("0x300a9f80365333b6cd3c1be014c3e660bb7c9447588e33bf2174f21900062e18") , BigNumber.from("0x29354cdc4a96012ea5adb6a5d1f4d98e77a86830f3bb7c7a338c9f81c77716bf")], [BigNumber.from("0x2f8b9fb787ee6803c13f56975a0a79c03ff5caa605681f0c690fbabf42a530d3"), BigNumber.from("0x0a9fd7684e756eaad800c5e1de474d23805de88eeb9da791b5c7e5ffd0cc9bf4"), BigNumber.from("0x28a6792ccb8168333b315e13b2593cadf940d5bdec10d16626420c606b28a2c4")]],
    ];

    await registerVoters(batravot, voters);

    // Proof 1:

    // Who voted for whom
    let for_voters_1 =
        ["0x48d5f0b15c8fd0f25b8aaed22b567f8cd3fc0ac2"]

    let [proof_1] = [
      [BigNumber.from("0x01b6998011a8a862564ebdeaaaf055708dbe5236da1d6727b959d0c62b477c71") , BigNumber.from("0x25abcbd699cefeb30e544c5a8fa8d997e25846c373632b487ee04284baad511a")]
    ];

    await submitElectionProof(batravot, for_voters_1, proof_1);
    console.log("Submitted a vote proof for the election.")

    console.log("Submitted a vote proof 1 for the election.")

    // Proof 2:

    // Who voted for whom
    let for_voters_2 =
        ["0x48d5f0b15c8fd0f25b8aaed22b567f8cd3fc0ac2", "0x5bba73a2c56a9f2880963230bc49157bed5ad882", "0x77c4414f24dc933b659e7125bc71de1a503a6332", "0xedebfed7145b4e0b8883a97b4d62058de5b8397c", "0x91c73e2cb3c9fc3124d979654f1d32e1214f5a2f", "0x11d9de6c97c2481ec89c5700588cde34c3f8fb88", "0x9b8aafd267966aafe1da77f203a6625bcd653b7c", "0x1a8ef664f0db46f4d97a4ff410f44a1c6d19ac5c", "0x7d1cc66d0285ef51691a404719d37d0e0a413205", "0x28076fca189065de528a8ea92a9e90687a3245b5"]

    let [proof_2] = [
      [BigNumber.from("0x055ebd8f99f1e7a756a81a2af0a514689e92749375e5368334c1a765cd06dd7c") , BigNumber.from("0x23d7a6076f3ab9234e7bc14489e1b5db922dde44a28081b939737b407b5b03b9")]
    ];

    await submitElectionProof(batravot, for_voters_2, proof_2);
    console.log("Submitted a vote proof 1 for the election.")


    // Close the election
    await batravot.closeElection(0);

    // Check the election state and the number of votes
    let election = await batravot.elections(0);

    expect(election.state).to.equal(1);
    expect(election.forVotes).to.equal(10);
  });

  it("No one voted", async function () {
    const [batravot] = await loadFixture(deployElectionContractFixture)
    await startNewElection(batravot);

    // Add key to the election census
    let voters = [
      [10, BigNumber.from("0x5f6c0209ecd827e914535c5b1afa3b4b6f48285d242d00b37af511dc9ed9ea7b"), "0x48d5f0b15c8fd0f25b8aaed22b567f8cd3fc0ac2", [BigNumber.from("0x2c73fd312a9c3b5c2ab57c5fc12b4a1ad08b245a86ecb1744bb672da676a9b23") , BigNumber.from("0x0a9f46d4388aa89ec81ef2bfc538996d9d2c0d85d0ed6a56e4655b2ba0443de7")], [BigNumber.from("0x041ce74518c3b01010d18e4b0cea31d91f37c86ac5ef48a012a2402c8f6db283"), BigNumber.from("0x2d8c135bd7cb2f2a17c0e71cb91bcd3f63b817cda17a9ebcae0e768070b09022"), BigNumber.from("0x2f98d237f86fb22e37fc0ee9349f3ed9d3e491016c464c991625c7013994ba70")]],
      [20, BigNumber.from("0xc23cd735bae1b6590c8f212894baceeda3cb654b57afa3bc040502a6b9837b4a"), "0x5bba73a2c56a9f2880963230bc49157bed5ad882", [BigNumber.from("0x042ab0055cc8060c73e6dc87b55a4bcf27a7d7622cd39b044b6a7529e5b0f2ab") , BigNumber.from("0x133b0707bac31ffa1fbf33e7b2bdb79790164ddf6fbd71b363e2d36b9cbda3a3")], [BigNumber.from("0x19e12a0d7e4bf5fd4a5332dd95c49abd69865adfb6f54207da0f494221c517e0"), BigNumber.from("0x24193a8f90154b0662f04f8eb75d09b033fce21e9f59b58bf38cc9332b881ac3"), BigNumber.from("0x2655735cd2e25a8fb5a2d4072bc84426c1dbf74b9793287c29b0804badf4ce60")]],
      [2, BigNumber.from("0x15363ad6531f6603be966692114a5530228a0ed8ccde4302ff9a46c98e88d542"), "0xea6ea8a509de3efb42a96b9a9e77d3d121f8cbee", [BigNumber.from("0x041ce74518c3b01010d18e4b0cea31d91f37c86ac5ef48a012a2402c8f6db283") , BigNumber.from("0x2d8c135bd7cb2f2a17c0e71cb91bcd3f63b817cda17a9ebcae0e768070b09022")], [BigNumber.from("0x0339cdbdc22fd121c5c6157db59cc640624f15848bb5d04a57eacf0b86ecd3cd"), BigNumber.from("0x1b45491e5b92d1391e9bbc1cf7863a6a3b71d225075dc3cb99ce3c00d285febc"), BigNumber.from("0x0958d90b407494279cbdee6130a12cf19e5937784569c2392df63ca02f0f4796")]],
      [25, BigNumber.from("0xbd4af6ece9735ef11c980192b68cf503e3a7812fb780723000c40eac38f0894a"), "0x5aef89516e8d5f8d34280e2c242930cb3af8b05d", [BigNumber.from("0x26063b30d4fe8452d89b25c9a7fba079d7313dfabc576ac925be9a24cb01a745") , BigNumber.from("0x22bfb9c2c2cfd25a9076f67f424039f72ebc24aa5882518df31ab82d56a1beec")], [BigNumber.from("0x29ba0bf714e3507efccb6b6170d7a8a80a0de74bee8568f543ca11093901a98b"), BigNumber.from("0x208c19401b6d550f6a6c463b341eda691bdd581046ae9aa54c71d876cf33cc61"), BigNumber.from("0x0aea3305dcba6398eddeefdd6dbaa07f227d671be0d9f5b7f63f3f20cb965c9f")]],
    ];

    await registerVoters(batravot, voters);

    // Submit a proof for the election vote
    // As no one voted, we do not submit a proof

    // Close the election and check the result
    let election = await closeElectionAndGetResult(batravot);

    expect(election.state).to.equal(1);
    expect(election.forVotes).to.equal(0);
  });


  it("Proof for different Public Key Fails", async function () {
    const [batravot] = await loadFixture(deployElectionContractFixture)
    await startNewElection(batravot);

    // Add keys to the election census
    let voters = [
      [2, BigNumber.from("0x15363ad6531f6603be966692114a5530228a0ed8ccde4302ff9a46c98e88d542"), "0xea6ea8a509de3efb42a96b9a9e77d3d121f8cbee", [BigNumber.from("0x041ce74518c3b01010d18e4b0cea31d91f37c86ac5ef48a012a2402c8f6db283") , BigNumber.from("0x2d8c135bd7cb2f2a17c0e71cb91bcd3f63b817cda17a9ebcae0e768070b09022")], [BigNumber.from("0x0339cdbdc22fd121c5c6157db59cc640624f15848bb5d04a57eacf0b86ecd3cd"), BigNumber.from("0x1b45491e5b92d1391e9bbc1cf7863a6a3b71d225075dc3cb99ce3c00d285febc"), BigNumber.from("0x0958d90b407494279cbdee6130a12cf19e5937784569c2392df63ca02f0f4796")]],
    ];
    await registerVoters(batravot, voters);

    // Submit a proof for the election vote
    let [proof] = [
      [BigNumber.from("0x01b6998011a8a862564ebdeaaaf055708dbe5236da1d6727b959d0c62b477c71") , BigNumber.from("0x25abcbd699cefeb30e544c5a8fa8d997e25846c373632b487ee04284baad511a")]
    ];

    // Who voted for whom
    let for_voters = ["0xea6ea8a509de3efb42a96b9a9e77d3d121f8cbee"]


    await expect(submitElectionProof(batravot, for_voters, proof))
        .to.be.revertedWith("Verification check did not pass");
  });

});
