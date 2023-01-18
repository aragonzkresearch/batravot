const { expect } = require("chai");
const { ethers } = require("hardhat");
const {BigNumber} = require("ethers");


describe("Testing BatRaVot smart contract", function () {

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
      [BigNumber.from("0x0ecea7b5c4498cd0d8ca3476f658757889c6cd9fa090b9f8ab778c73f95c40f3") , BigNumber.from("0x025f96216182512c444d1c7c2db6735c8775e1532bbb4e27abea471863958cee")], [BigNumber.from("0x26c998e960e017b48f9438b0c33423ba591dc57a029ffa64edb96d4489390024") , BigNumber.from("0x196b543d6cc72af733d548abe7a411b59d80e4f19e9b2140a09462aa28c2fa82"), BigNumber.from("0x2821f5a3184125ee6ceb3bce02281f89b77bcc13c7caa7f61f7d1baa0a189925") , BigNumber.from("0x2455513663623b50458a9e96d2dceb3216a07ac64e878e9805cce6515bbb66e9")], [BigNumber.from("0x2e45fed391c18c6fe0e9c1d73a2b6ce5d28b0d35b495d4645e1e574c16ccc9ff") , BigNumber.from("0x1fd783a1619d17e412d70eac08cb0e4cc1eef0860db84d4d75bdc609daf148bd")], [BigNumber.from("0x1ad82c842b9cdaa62c707a396de235538db902cf813517423d134ae52df956d6") , BigNumber.from("0x123883cdb5f099e69fba9fa20e8b8bfb821270e63dd9df0fded3590e3796ab60"), BigNumber.from("0x128028fb15e218e7cd552dede288b199eda7f63563e63f3eef3ab66a8db0f456") , BigNumber.from("0x02eccd06d97ccf272fe6c6bd5342626f99338672aa2ce2f6291a81d965e9cd67")]
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
    for (let [tokens, ethPrk, ethAddress, pubKey, proof] of voters) {

      const account = new ethers.Wallet(ethPrk, ethers.provider);
      console.log("Registering voter: ", ethAddress);
      // First, we need to send some tokens to the voter
      const transferTx = await token.mint(ethAddress, tokens);
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
      const registerVoterTx = await batravot.connect(account).registerVoter(pubKey, proof);
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

  it("Can deploy Token", async function () {
    const token = await deployDummyToken();
    expect(token.address).to.not.equal("");
  });

  it("Can deploy BatRaVot", async function () {
    const [batravot] = await deployElectionContract();
    expect(batravot.address).to.not.equal("");
  });

  it("Can start new election", async function () {
    const [batravot] = await deployElectionContract();
    expect(await startNewElection(batravot)).to.equal(1);
  });

  it("One correct vote `For`", async function () {
    const [batravot, token] = await deployElectionContract();
    await startNewElection(batravot);

    // Add keys to the election census
    let voters = [
      [5, BigNumber.from("0x5951647af6c9301fd81debb444cfa6abd8af4eb953f0286dc5dd583def74c8af"), "0xcc3e95add74484967fafab4c96b14577166cde37", [BigNumber.from("0x2c73fd312a9c3b5c2ab57c5fc12b4a1ad08b245a86ecb1744bb672da676a9b23") , BigNumber.from("0x0a9f46d4388aa89ec81ef2bfc538996d9d2c0d85d0ed6a56e4655b2ba0443de7")], [BigNumber.from("0x2c3bd68ae95c86721a2e9d01dcaf2212a297325c77594d56d8d9ba0759a56d8c"), BigNumber.from("0x1536cdbab2a7b341b7bcf3ce1778aaa2d2d6caada4cdfed993cf43afd7fc492b"), BigNumber.from("0x2a9ae02e98a77c1da99a0efaa1bd4e061f2f7a20a1a8d42a9b752a9bff31c632")]]
    ];
    await registerVoters(batravot, token, voters);

    // Submit a proof for the election vote
    let [proof] = [
      [BigNumber.from("0x01b6998011a8a862564ebdeaaaf055708dbe5236da1d6727b959d0c62b477c71") , BigNumber.from("0x25abcbd699cefeb30e544c5a8fa8d997e25846c373632b487ee04284baad511a")]
    ];

    // Who voted for whom
    let for_voters = ['0xcc3e95add74484967fafab4c96b14577166cde37'] // First person in the census voted yes
    let against_voters = [] // No one voted no


    await submitElectionProof(batravot, for_voters, against_voters, proof);
    console.log("Submitted a vote proof for the election.")

    // Close the election and check the result
    let election = await closeElectionAndGetResult(batravot);

    expect(election.state).to.equal(2);
    expect(election.result.totalVoters).to.equal(1);
    expect(election.result.yesVoters).to.equal(1);
    expect(election.result.totalVotes).to.equal(5);
    expect(election.result.yesVotes).to.equal(5);
  });

  it("10 correct votes `For`", async function () {
    const [batravot, token] = await deployElectionContract();
    await startNewElection(batravot);

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

    await registerVoters(batravot, token, voters);

    // Submit a proof for the election vote

    // Who voted for whom
    let for_voters =
        ["0x48d5f0b15c8fd0f25b8aaed22b567f8cd3fc0ac2", "0x5bba73a2c56a9f2880963230bc49157bed5ad882", "0x77c4414f24dc933b659e7125bc71de1a503a6332", "0xedebfed7145b4e0b8883a97b4d62058de5b8397c", "0x91c73e2cb3c9fc3124d979654f1d32e1214f5a2f", "0x11d9de6c97c2481ec89c5700588cde34c3f8fb88", "0x9b8aafd267966aafe1da77f203a6625bcd653b7c", "0x1a8ef664f0db46f4d97a4ff410f44a1c6d19ac5c", "0x7d1cc66d0285ef51691a404719d37d0e0a413205", "0x28076fca189065de528a8ea92a9e90687a3245b5"]
    let against_voters =
        [] // No one voted no

    let [proof] = [
      [BigNumber.from("0x055ebd8f99f1e7a756a81a2af0a514689e92749375e5368334c1a765cd06dd7c") , BigNumber.from("0x23d7a6076f3ab9234e7bc14489e1b5db922dde44a28081b939737b407b5b03b9")]
    ];

    await submitElectionProof(batravot, for_voters, against_voters, proof);
    console.log("Submitted a vote proof for the election.")

    // Close the election and check the result
    let election = await closeElectionAndGetResult(batravot);

    expect(election.state).to.equal(2);
    expect(election.result.totalVoters).to.equal(10);
    expect(election.result.yesVoters).to.equal(10);
    expect(election.result.totalVotes).to.equal(209);
    expect(election.result.yesVotes).to.equal(209);

  });

  it("One correct vote `against`", async function () {
    const [batravot, token] = await deployElectionContract();
    await startNewElection(batravot);

    // Add keys to the election census
    let voters = [
      [10, BigNumber.from("0x5f6c0209ecd827e914535c5b1afa3b4b6f48285d242d00b37af511dc9ed9ea7b"), "0x48d5f0b15c8fd0f25b8aaed22b567f8cd3fc0ac2", [BigNumber.from("0x2c73fd312a9c3b5c2ab57c5fc12b4a1ad08b245a86ecb1744bb672da676a9b23") , BigNumber.from("0x0a9f46d4388aa89ec81ef2bfc538996d9d2c0d85d0ed6a56e4655b2ba0443de7")], [BigNumber.from("0x041ce74518c3b01010d18e4b0cea31d91f37c86ac5ef48a012a2402c8f6db283"), BigNumber.from("0x2d8c135bd7cb2f2a17c0e71cb91bcd3f63b817cda17a9ebcae0e768070b09022"), BigNumber.from("0x2f98d237f86fb22e37fc0ee9349f3ed9d3e491016c464c991625c7013994ba70")]],
    ];
    await registerVoters(batravot, token, voters);

    // Submit a proof for the election vote
    let [proof] = [
      [BigNumber.from("0x2d8320a3f0978fd80446db0571ad147579c52ef2f99175990326aedade29a0db") , BigNumber.from("0x22f5c139f31518ef807fdfd8e8e07ea7e06389347df9bd64b02874a0b0a0c3f7")]
    ];

    // Who voted for whom
    let for_voters = [] // No one voted yes
    let against_voters = ['0x48d5f0b15c8fd0f25b8aaed22b567f8cd3fc0ac2'] // First person in the census voted no


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

  it("10 correct votes `against`", async function () {
    const [batravot, token] = await deployElectionContract();
    await startNewElection(batravot);

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

    await registerVoters(batravot, token, voters);

    // Submit a proof for the election vote

    // Who voted for whom
    let for_voters =
        []
    let against_voters =
        ["0x48d5f0b15c8fd0f25b8aaed22b567f8cd3fc0ac2", "0x5bba73a2c56a9f2880963230bc49157bed5ad882", "0x77c4414f24dc933b659e7125bc71de1a503a6332", "0xedebfed7145b4e0b8883a97b4d62058de5b8397c", "0x91c73e2cb3c9fc3124d979654f1d32e1214f5a2f", "0x11d9de6c97c2481ec89c5700588cde34c3f8fb88", "0x9b8aafd267966aafe1da77f203a6625bcd653b7c", "0x1a8ef664f0db46f4d97a4ff410f44a1c6d19ac5c", "0x7d1cc66d0285ef51691a404719d37d0e0a413205", "0x28076fca189065de528a8ea92a9e90687a3245b5"]

    let [proof] = [
      [BigNumber.from("0x0a4c0d250a7db6c885a2ab932497a3da93577129254939d63bd84d5a76962e9f") , BigNumber.from("0x1af48834a1e26acc46c717fd65e5be5615025047afc3a1f5cfa2385f233a991b")]
    ];

    await submitElectionProof(batravot, for_voters, against_voters, proof);
    console.log("Submitted a vote proof for the election.")

    // Close the election and check the result
    let election = await closeElectionAndGetResult(batravot);

    expect(election.state).to.equal(2);
    expect(election.result.totalVoters).to.equal(10);
    expect(election.result.yesVoters).to.equal(0);
    expect(election.result.totalVotes).to.equal(209);
    expect(election.result.yesVotes).to.equal(0);

  });

  it("1 correct vote `For` and 1 correct vote `against`", async function () {
    const [batravot, token] = await deployElectionContract();
    await startNewElection(batravot);

    // Add key to the election census
    let voters = [
      [10, BigNumber.from("0x5f6c0209ecd827e914535c5b1afa3b4b6f48285d242d00b37af511dc9ed9ea7b"), "0x48d5f0b15c8fd0f25b8aaed22b567f8cd3fc0ac2", [BigNumber.from("0x2c73fd312a9c3b5c2ab57c5fc12b4a1ad08b245a86ecb1744bb672da676a9b23") , BigNumber.from("0x0a9f46d4388aa89ec81ef2bfc538996d9d2c0d85d0ed6a56e4655b2ba0443de7")], [BigNumber.from("0x041ce74518c3b01010d18e4b0cea31d91f37c86ac5ef48a012a2402c8f6db283"), BigNumber.from("0x2d8c135bd7cb2f2a17c0e71cb91bcd3f63b817cda17a9ebcae0e768070b09022"), BigNumber.from("0x2f98d237f86fb22e37fc0ee9349f3ed9d3e491016c464c991625c7013994ba70")]],
      [20, BigNumber.from("0xc23cd735bae1b6590c8f212894baceeda3cb654b57afa3bc040502a6b9837b4a"), "0x5bba73a2c56a9f2880963230bc49157bed5ad882", [BigNumber.from("0x042ab0055cc8060c73e6dc87b55a4bcf27a7d7622cd39b044b6a7529e5b0f2ab") , BigNumber.from("0x133b0707bac31ffa1fbf33e7b2bdb79790164ddf6fbd71b363e2d36b9cbda3a3")], [BigNumber.from("0x19e12a0d7e4bf5fd4a5332dd95c49abd69865adfb6f54207da0f494221c517e0"), BigNumber.from("0x24193a8f90154b0662f04f8eb75d09b033fce21e9f59b58bf38cc9332b881ac3"), BigNumber.from("0x2655735cd2e25a8fb5a2d4072bc84426c1dbf74b9793287c29b0804badf4ce60")]],
    ];

    await registerVoters(batravot, token, voters);

    // Submit a proof for the election vote

    // Who voted for whom
    let for_voters =
        ["0x48d5f0b15c8fd0f25b8aaed22b567f8cd3fc0ac2"]
    let against_voters =
        ["0x5bba73a2c56a9f2880963230bc49157bed5ad882"]

    let [proof] = [
      [BigNumber.from("0x1b1247d52cd98c1b9ec48a95c60f346dbd96f277c86ecd5455a535db32b085a0") , BigNumber.from("0x1f25fca68f685b44445e651d8a28e64ebc766dc9161765a91b13161b05f3bf0d")]
    ];

    await submitElectionProof(batravot, for_voters, against_voters, proof);
    console.log("Submitted a vote proof for the election.")

    // Close the election and check the result
    let election = await closeElectionAndGetResult(batravot);

    expect(election.state).to.equal(2);
    expect(election.result.totalVoters).to.equal(2);
    expect(election.result.yesVoters).to.equal(1);
    expect(election.result.totalVotes).to.equal(30);
    expect(election.result.yesVotes).to.equal(10);
  });

  it("2 correct vote `For` and 1 correct vote `against`", async function () {
    const [batravot, token] = await deployElectionContract();
    await startNewElection(batravot);

    // Add key to the election census
    let voters = [
      [10, BigNumber.from("0x5f6c0209ecd827e914535c5b1afa3b4b6f48285d242d00b37af511dc9ed9ea7b"), "0x48d5f0b15c8fd0f25b8aaed22b567f8cd3fc0ac2", [BigNumber.from("0x2c73fd312a9c3b5c2ab57c5fc12b4a1ad08b245a86ecb1744bb672da676a9b23") , BigNumber.from("0x0a9f46d4388aa89ec81ef2bfc538996d9d2c0d85d0ed6a56e4655b2ba0443de7")], [BigNumber.from("0x041ce74518c3b01010d18e4b0cea31d91f37c86ac5ef48a012a2402c8f6db283"), BigNumber.from("0x2d8c135bd7cb2f2a17c0e71cb91bcd3f63b817cda17a9ebcae0e768070b09022"), BigNumber.from("0x2f98d237f86fb22e37fc0ee9349f3ed9d3e491016c464c991625c7013994ba70")]],
      [20, BigNumber.from("0xc23cd735bae1b6590c8f212894baceeda3cb654b57afa3bc040502a6b9837b4a"), "0x5bba73a2c56a9f2880963230bc49157bed5ad882", [BigNumber.from("0x042ab0055cc8060c73e6dc87b55a4bcf27a7d7622cd39b044b6a7529e5b0f2ab") , BigNumber.from("0x133b0707bac31ffa1fbf33e7b2bdb79790164ddf6fbd71b363e2d36b9cbda3a3")], [BigNumber.from("0x19e12a0d7e4bf5fd4a5332dd95c49abd69865adfb6f54207da0f494221c517e0"), BigNumber.from("0x24193a8f90154b0662f04f8eb75d09b033fce21e9f59b58bf38cc9332b881ac3"), BigNumber.from("0x2655735cd2e25a8fb5a2d4072bc84426c1dbf74b9793287c29b0804badf4ce60")]],
      [50, BigNumber.from("0xdae4d6aeb0f67b09b7dcb98dc5058f2916b058ff82244caaa5e7922762641316"), "0x77c4414f24dc933b659e7125bc71de1a503a6332", [BigNumber.from("0x29ba0bf714e3507efccb6b6170d7a8a80a0de74bee8568f543ca11093901a98b") , BigNumber.from("0x208c19401b6d550f6a6c463b341eda691bdd581046ae9aa54c71d876cf33cc61")], [BigNumber.from("0x0a951a0d0fb71f35e2e55e5960ec726fa7920b0f8da6f2b8fcb0f4a5f1f3f336"), BigNumber.from("0x107867f0889714d3f9cce526418a64e23318dc7d8ef17410a18109a65b8b0344"), BigNumber.from("0x0abe5312b97e3d55e56dedbb364651ffbe77b911ba05dcf735fa1e3d302c9992")]],
    ];

    await registerVoters(batravot, token, voters);

    // Submit a proof for the election vote

    // Who voted for whom
    let for_voters =
        ["0x48d5f0b15c8fd0f25b8aaed22b567f8cd3fc0ac2", "0x5bba73a2c56a9f2880963230bc49157bed5ad882"]
    let against_voters =
        ["0x77c4414f24dc933b659e7125bc71de1a503a6332"]

    let [proof] = [
      [BigNumber.from("0x0cfad2bd1df39e52e395f37a54ef52c929687dd6c2b780c0ff1994445bb1030a") , BigNumber.from("0x201cb008ade8dd933863f1993c96fbadcaa70823fb10eac5384df675a53d39fe")]
    ];

    await submitElectionProof(batravot, for_voters, against_voters, proof);
    console.log("Submitted a vote proof for the election.")

    // Close the election and check the result
    let election = await closeElectionAndGetResult(batravot);

    expect(election.state).to.equal(2);
    expect(election.result.totalVoters).to.equal(3);
    expect(election.result.yesVoters).to.equal(2);
    expect(election.result.totalVotes).to.equal(80);
    expect(election.result.yesVotes).to.equal(30);
  });

  it("16 correct vote `For` and 19 correct vote `against`", async function () {
    const [batravot, token] = await deployElectionContract();
    await startNewElection(batravot);

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
      [4, BigNumber.from("0xeaf71834c9e353f010ca03e97fc535e6258feda7c0168b8d0b58289d993e5cd4"), "0x83e557c701baa1c303e38f20e9de4138a5c32165", [BigNumber.from("0x16d3af3c5f420bbe97c7bfd289abf9785f48a0518d371ec48ebea197c989fdb7") , BigNumber.from("0x0c9c882f3d14a2467bf1b4716c1b0f21e4a3c4b4f46c2d594b725c2d29fd3cf8")], [BigNumber.from("0x2ead01475a91e3f912c8b0452ed500b5deb1ca35b97d8cdbc5bbadbcafc6b938"), BigNumber.from("0x21d05157ea7064d4efb68fc769762f585c1c39f4a07ed89f6ec70ecd4126c865"), BigNumber.from("0x16c46951d568024b53c13cf6a02aa127b062be299008323ad9fb243b29ce9a92")]],
      [20, BigNumber.from("0x5617f5407c992a8246bab7e415ce14744398c15a5e3fd659631991e507780419"), "0x3823f93e2662b15e07340b910aa83eb8a96078d8", [BigNumber.from("0x198fbf6e45678f44fe9c2a1ee8d06c0024ba04a286d0d325b84e6f55f0b23b6d") , BigNumber.from("0x0f1cf43972dbd124e159a8cf7e12362632324f838ac906a7c6553653c4381e05")], [BigNumber.from("0x0a612c6873f3e7e488e74add82fa6d9ff17be6665cb52ac3f762724f5ee4a8dc"), BigNumber.from("0x14fbe944e75db79a4f46e9690cde5c62b6054e3e595bfd257081fa6fe16c5c50"), BigNumber.from("0x01f059251a10ef15d587b5aae164121f999c21a40692e8c44bd549d73d22a714")]],
      [20, BigNumber.from("0x66facc4e5ba7470086053e651a2c97df05866369b62567e147eae571c1dc525c"), "0x132d58b14c90461a1df173fb53b3e4fe83ad5ee1", [BigNumber.from("0x0de8f6a4cb65bf840f6982877c8b58d510cecd712953a1dd9a72314c1af3b327") , BigNumber.from("0x291e08687e4a13915c38a08ae7b7cd49eedd0d8309f5aaa050d5570f1035ebe1")], [BigNumber.from("0x11aef045189d2a4d440ff99faf1e67b644e1c43bba7911b2982dbd26ec832583"), BigNumber.from("0x27c85779d524cafbd8d239fc2be5ec9cac4fcb6f231217c24a9e5ee3d7e846b4"), BigNumber.from("0x012a12cac237f956759cffec87030cda190377a535ae97d56ccad15d59cbfc49")]],
      [50, BigNumber.from("0x07686133363a9767755be7b8145bbbcafdc4acb8a5c39c1f2ae5b0a2b9d83d06"), "0x6a02512e1d2e363b736fca7007074e2b66149ba8", [BigNumber.from("0x13261e41cb21bf2faea76abe777a1b7663fe1ce63165004b7b70c5cc8e5fd33e") , BigNumber.from("0x26233318cc587c07de76dc280cc69f88a5e2d8f6b25deb36ad62405a0fa6668a")], [BigNumber.from("0x1ceefa6fd5edfeac3969885e005f096d7ed690348c4ea97df50d167a78bde5eb"), BigNumber.from("0x304afd78d1f42874d97e9f8ee6f4c41a14b9e9bc304b334c0cfa767ae7bcbb0d"), BigNumber.from("0x169389347ca0730c5d64ac485366552891a0efadff2306a577c0b9d84bdf0af8")]],
      [200, BigNumber.from("0x18a6ec6ca140c0588bab427341ed8179c7c7286a66bd902316c9bf898c0bdf51"), "0x794211a4c20b24f92988ea9e2b1cbd60aafd8a8e", [BigNumber.from("0x2b9e9cf000f9fd2221f997126629a24efde58595a279767197fb7dc767500b0a") , BigNumber.from("0x23a8d1d3047609fd1930b8d8f13e8f2a053c05c774ce0c6f700f8ebd9b0c5d18")], [BigNumber.from("0x2cfb812024020f184e1685e0c3786d53ed686093a73e26622bf031ee5b31ca4f"), BigNumber.from("0x126e12126b7facda5db5cc6534101e9bc6205a3ad0290c78f5706ab57ed612d7"), BigNumber.from("0x0e40d4c53444b277c1b23bc46a45618e36a1f9aeb00e7b2f3e2ec4f4b80be005")]],
      [4, BigNumber.from("0x5cd99f3a56a601190fbcc65611423cbd5b9210b6ee5275d98c220533a01c768a"), "0xb05cc664b5d7e427b1b9ab1d47d2b6bb2331cb1a", [BigNumber.from("0x04ef433657af5cc72b81c6a8bc1558e61dba5737a66d4198d8d8fe38f29da5a7") , BigNumber.from("0x0ce1b0619a7e77054a66d073691758452775ab1f211e82ecfc926d3841e3f805")], [BigNumber.from("0x2df9986cb3fa24cccd74c0c4b3dd367e47b9c6663ce761b5384b6bb3c9964a13"), BigNumber.from("0x15f7216643dc31c98adb1d9f8ef0257e3ae0ca235912fdb0d86af0c49fd0503f"), BigNumber.from("0x0b65fa70aa373464f56fecb6a989b91fcf2aa0ef50ae4b51a24c9434d66c63a0")]],
      [100, BigNumber.from("0x0f8bec7b575020c335e912f0391e1feba777b859f6c7e5c52376e6f052bf10c7"), "0xf23124f1b000d814ceb75c2421f0171f255dc480", [BigNumber.from("0x084f187a0fd7a7e9a4297698b870dda169108e86c3f9e1473857f11a61f50b1b") , BigNumber.from("0x078a93f4b15e19288d34a5e4731670e39330dce43d74075e3ade18011b6a8dec")], [BigNumber.from("0x1bf3a1548683b4e3f65c6ad07cac101bb81c7c46dd1eebe532a3293137bdb363"), BigNumber.from("0x220172e55fc0ef3f4a1652576a180e14574e5ee579988a0b289d04596b560ece"), BigNumber.from("0x09b86c59a7ffc4cb36927e6268b3edafe959fa17760776a1d7a32cfaaa00091f")]],
      [50, BigNumber.from("0xc6b9e1fc304d9fed2f621acab05adbecb8ce00d4ea67ff3d7043c67e6b50772a"), "0xb6ab186264275462ed460d7b1623d69dc2047d7a", [BigNumber.from("0x00c29a211e199fe70f4055ab543f776535f5dbb315024aa8b17e6f9e19032751") , BigNumber.from("0x2a800f2a8ce9248f099b2d9e7e2ebca9c8633b06692be50f5bd8b6caa93f8875")], [BigNumber.from("0x0731acd788402a029c7587d4e0c750d4b10769f1caf964ee5f80888db504bfa5"), BigNumber.from("0x0fc05987fee39f89876bb75ae533162ee8156f8eccb4e3f02acea6fbe8b9a879"), BigNumber.from("0x26a90eef953d0ba4f9472a5b4403188002fee8a6ed2618472672d88560ef961c")]],
      [50, BigNumber.from("0x6e9f365dd9ebcb897f42642bbf715c192a8419c3a2f8b4a630c79b40f4cdea70"), "0x6024c7c8a92812c7d779011ba9cd773e45a223be", [BigNumber.from("0x225c23c7ebf270630ecc87f010f579075df20844667f167662504884804e090f") , BigNumber.from("0x0ab52353a86dfa7f275f4a470a7291b09a50613e7a39e0936d5c63580b03a859")], [BigNumber.from("0x235924cf83af8731040b56b6a95ef81597b9ab6eed354d4b81d6c19c55b2ec61"), BigNumber.from("0x2a59685bb767c7fa12b7de3c5713ba853f3cd67e65948bb3adcdf2221eb578b7"), BigNumber.from("0x081e260096527537dc0dd18324c57babf857d5b36fbdd04a0d11efd1df305eac")]],
      [10, BigNumber.from("0x706bf20b90d4464aa123e931415d824f68c86b4f3e89780e373dc0f6c7c385ea"), "0xb13f7adbaaacbf667d53c7d647cbcf5625e66082", [BigNumber.from("0x0bf11b7e4421e3cb7c97e34d194c004527ab8e7f6737110feaced1d67d461225") , BigNumber.from("0x1d74c731f15e0039fa03b7533f5a63ba1382e482cc27436a70f033b9b14df663")], [BigNumber.from("0x0c02b0f6babbb7f4678e46f84a5eced26bff7df49cf3a2b2e0a077f2d163ca8f"), BigNumber.from("0x06846681e3220784da20677014cc2fa5db03b33d20ca1d17fdaf7cef6ef87a09"), BigNumber.from("0x1ad48a6ae65809d28d5445acd7cb6e2aec2a23db207b38998abafd60266907e1")]],
      [40, BigNumber.from("0x7858d31b6cdb2aff9a30a451e49c53dbc6ec2fb1e6583cafe443168c7539a17b"), "0x2b5d49d14080c19506deffed813f28c900bb1354", [BigNumber.from("0x26711ffeb9cd0188c51c7b1f2bec493cbbf1dfa51365e7bffbe51614ec05f8f9") , BigNumber.from("0x2de6d9fdc1e046de425677a42c4ca908387d2bf95c226d9d71efca31ddf052e6")], [BigNumber.from("0x2d4f10a7f051cf8f54ff0ea843ee3181492568fed6e404b143dcbd13a22bc65b"), BigNumber.from("0x03111a2fe980c1dd21c063eefdeb74f8a0dc61d11ea64de7b82ec8c30a5f250e"), BigNumber.from("0x0a9d6f1aeab62092c024f7af8e0e603ed9d5d50c90ecf079401626c62420f70f")]],
      [200, BigNumber.from("0xaae9efb64cb9dbc0ad6729f77b8e1ad1177d1025a16227ea6fd2fb47e0fcc869"), "0xc94e896899caf3bc74b6e696b6be8d3d0e94b268", [BigNumber.from("0x108e48ccc74916f974fa0cc863354dec5a82f97abf1407ffdca2374654744aab") , BigNumber.from("0x01950f9b729b7afd8837f5cdd4092d7ddcb5265f8b0adb2feb2ad505a1988455")], [BigNumber.from("0x213fec64bde034c87aad6b998814e3798543ac351a78a82e6da2633e07776690"), BigNumber.from("0x06a7d5ab259867fc74419c2f7ab1f0de6329fa993920fa809b9321605fb5c58d"), BigNumber.from("0x108f52ec8fba0e9df3094f6de9f6ef59060466b754bf70259cb4a83b30502dbc")]],
      [50, BigNumber.from("0x0a9b3782ff6b5795881eba5480fe83512f68939bc78e2a3ae1cf1d297c371b1d"), "0x27568b3ec44086a6564740cb110ced2511227479", [BigNumber.from("0x0e3a4fabc2af12d7d6286456189452d9e961b985078d96010a6b3b6771f048d7") , BigNumber.from("0x1708ca5d76496c90a0a66ed0e5f9f6d1abe453d164a68559cb92fa5e344dce66")], [BigNumber.from("0x05bf3291287f69a61144684ada2fb748085fb23d24b93faa9c53d669db41dbe8"), BigNumber.from("0x23fd1aae0856f7c919432de478b35752f9ed7577688b60a4a8525ddb7583a902"), BigNumber.from("0x143997385679ecdc0a305d7c3f9a47b8ff5994f9952e262c1536958afaca1baf")]],
      [10, BigNumber.from("0xe3f94fed8bc116ca9080f75920b6bedec8a6ae4a2acacca0603364ef8030e210"), "0x6d8817449472e585d764c4b49bc8c95452f6a917", [BigNumber.from("0x0c8e0b8676e90aed29c5d291946e8c5b2218885cca743bf85cafedc62de5202f") , BigNumber.from("0x12cc3ed19d0981204b7fe26c51039f83ee38f8de181aebc1d0b01e8522a4e289")], [BigNumber.from("0x1a07b3a4da8873e34e16f14eaae9aceb3b7e96285aa1c5f7b59f0a20a313d7e8"), BigNumber.from("0x0670634e79cca4de8fa7ced905e081d51e0f69983f7a3f0398fea833adb837e1"), BigNumber.from("0x0db206c3a825acc562a677691e37769c8a179a96981041f1bd60af7003ee4dac")]],
      [25, BigNumber.from("0xc2acac3f2ca1d0f0d56c75564ee48867456eefead5b3a1ea15aac47101a18b75"), "0xd19469ed63465e9086a688276be44429cc1423c1", [BigNumber.from("0x209407151196b2c28417d03d3da4709f256c47be07360d879c0c1552a6ccd990") , BigNumber.from("0x0aaa90ac70981f3dc4eb00008f520fdb8058957d716799000dd66de2cc403777")], [BigNumber.from("0x10de82f81e389f786f8e9df102b6062f533b69f29d7cf02cac0efc7a01802f1e"), BigNumber.from("0x2f74bb76156f2eed8682d01870a13889532de88999109fc03bced6c5ada361cd"), BigNumber.from("0x1b98fe6edf0f8280e34e0b6f7a80f20ccdd31ca8884b4c53ebec18539ae8d6fc")]],
      [20, BigNumber.from("0xe0b1658b993e103d9b31ce76eb839af8ddb25912ea868aea89bc742f663f2b38"), "0x709d295d24ea6d55a1c1e29dadf60ad299449185", [BigNumber.from("0x119b2d6388634011a729a9933476daedaee9a6ec446a67b162b36a8ce2c8d6c6") , BigNumber.from("0x0c39a7f48e511bf521440534f6474ccca062c28aa9bff9ab7a998ab763feaf46")], [BigNumber.from("0x0f34bb9e7ec582ac9cd358f80648caec81fdc875498b2e14f42d32e1d512bfef"), BigNumber.from("0x26efefbaee3e36a6ca170ec5ec1def4a8749fc1bc5146bd8f485f6765295879f"), BigNumber.from("0x13af428d9f316b0ad49f282d5fb912a8737ee3ce4183e34aed2d70a1ae1773ef")]],
      [10, BigNumber.from("0x40706094197387dd26d804e602324e2ed4323810cfae5029b22b0affa3b459a4"), "0x6d812151d05720e1d69edc5e94407e1c895fdf18", [BigNumber.from("0x234ec0f4f62cd2376f0324168f9c8bdc6c4d834847e954e232cd7495e5ed580a") , BigNumber.from("0x08371f62609f4ea448a24623b183971674cad20048f770b161369c28d7c1deb3")], [BigNumber.from("0x0dd2b50794f8d862e27a0baacfe2c5debfc35e6bfa8e4688d6624c6efcd0fef9"), BigNumber.from("0x27c5e12f61609aa98ea56845b707aa824a9f3a1a699dbf8c7a116be3508ec673"), BigNumber.from("0x1fd7571c64edf00e6dc532fdc120888a8559bd0e781e2a460618911ba9690a4c")]],
      [50, BigNumber.from("0xf9182fc9f486f845318722001b15fb3f09103b2dc4a2198f4f119c5252130c46"), "0x3276e8acf5e63e5ceb338f1cdeb6361b7ac6b065", [BigNumber.from("0x2a87a7b5fa1580aae30c8cd8329181267b4a6ec10d51fd2f8c866ab1829c743b") , BigNumber.from("0x2a935ed0f530df2d91cd94757bc4e69693aa4732822a6b1deedea333b502b9f0")], [BigNumber.from("0x05ce3a4156bd1747bc17b2e8a053ff4440118b016d368f7937247c2fb5d789da"), BigNumber.from("0x24b2dc80a6e77952e421940955a670f2b22fe6aae0b9274afcffddfe70464f37"), BigNumber.from("0x1be1910326584941b79dbd205966ff9f0fcb8991f4a58daacc4e93c6bd223051")]],
      [20, BigNumber.from("0x30ee136a421bf4e092df77dd7b04cf62a74a0e7bccb818b0c2b1c82cffa9544f"), "0x8106b7098c500999c3ab50402fecfc9cb3a348cf", [BigNumber.from("0x0e4ddb9488f1cbc2b295cf4efaec3d751622dd8a0f2a2ac02feff3208ef02a50") , BigNumber.from("0x29836d99556abec743398d14535ac08586cc53a7fcbf2fd7fb5eb0f2cc4891f7")], [BigNumber.from("0x2f65dc33646846562f8bed3406e712afd3d751e7d25527d9111fed0a56596b22"), BigNumber.from("0x0214df0d7746573b3131f71352c1885f62f513706c596d6ed79c17724c41ba88"), BigNumber.from("0x2224c6a24925cd1bfddefb8981af392fe39012e560bc482ea6c1b0c06a0bc7bd")]],
      [40, BigNumber.from("0xc9f4bf6851ab24d2ba8dcfb7a52af77c145113e78ad46833b1fdda2b5e3330a1"), "0xb8d5d05076634c122dc39b31dbc564fdbf0650c9", [BigNumber.from("0x094c8a3a5288f926016fbe32d43266c0b78bcd11ebf70c37b739b01900f00d3b") , BigNumber.from("0x11f0b5dfd2ee8dbd3cb9737fe2af291a2b3bea219a7411ae533aa7d4ec8ef0d0")], [BigNumber.from("0x078540a58d8065ed44e769240a72f899e5e357ba3a512ea9f3f87101e90fdfe5"), BigNumber.from("0x1bf20daebb20909a8861b37afd6fc97d0f2b3b84763733462098fddda1e334ae"), BigNumber.from("0x15072eceed95d785ada93d082e2a2783c55214c2333e1a6f513efeca50162213")]],
      [8, BigNumber.from("0xe4d5f97fcd853c4ee8da9eec852d48d36c15df33370303fcf4c23e0efbca6188"), "0xb87980a2b9944433dcb1a77cd8edb9f78d769a56", [BigNumber.from("0x0b601759d3e34280a2b42c1d13b448e972c93582bc579c9108b9be1132586de8") , BigNumber.from("0x13889a4e2e725e855d94cd8d5c69b11a56a9dc2044da99ffd3f754a67787f5f5")], [BigNumber.from("0x271b2c662552e56f51663f25e2c1468ecbba177e625a492d126ed0c30818abd9"), BigNumber.from("0x223463d5419df21ceda0d83f6bdd3b436162d5634a2607b1ba8721530b52dc7f"), BigNumber.from("0x1cc6a4d557221fd21874099dd3ac9eae5a5d21351a5ed82e3b735ee3919765e3")]],
      [4, BigNumber.from("0x171d0362d6b0e182b2d68f29a40881dc830f6c6df38ea722fea0e28cc2b0f995"), "0xb2a8800732661b480df014e008fcf70ba4e62f67", [BigNumber.from("0x24aba4a2525dc9021953f0aa1d31d21a6264fecb6c43c58c80063133559fc2d9") , BigNumber.from("0x1f96ec99a2945e2f72c0bea7c5e2d844fb5ae140f53e92343a53c3bdaee57565")], [BigNumber.from("0x2f6ee9d5b47dca65ee5b821f2a0e8f9e91911c5bc89512b15fb438a6caef51ea"), BigNumber.from("0x2c616260dfd69fde3ddfd344a0bf0ba5759edd4c9447eac7ddf2cbe72cf11bda"), BigNumber.from("0x22463b512bce7468f2be7e61be90b4aba59128b73a2d3de5dd08e502af87b49d")]],
      [4, BigNumber.from("0x8013f0c9b95c3a0b8a7c9a5235d6cc15e402cdb2e9a2a70e9f80b5cfd2c2d55d"), "0x27d92eaca4064f4926cfc052c46562b7e7e8ece8", [BigNumber.from("0x270e089fa0b07856c3305280ae2266ced29fbd5d67ab7c53c6ccb9c017ab3563") , BigNumber.from("0x26b4049404bfafa5bfa3f58d68041045d8a25f68caad249d8c41e1acfbc65dc8")], [BigNumber.from("0x0f1c971ef175d8becc8b2cadd07cbfceaa38f6617d43befcc51ce78791b1e813"), BigNumber.from("0x2c72614406daa630241c34c1d2036b015ba025d4961e666c874e592a0f5235f9"), BigNumber.from("0x04b5b3e5646aafc1aab0e15ff22cf1a7d2bcda066344f5b8a91a67c3693a0ba7")]],
      [40, BigNumber.from("0x2b06566ccd5278f1af842fc5ffafc80cc288bb5aadf7761c056839887b3af4fc"), "0xa7d89043a98d4bb1441e907080bfbe4b1aab7058", [BigNumber.from("0x11462e083782220e911f6f09f98ce4481ad17419830a217c00d38a04498e8875") , BigNumber.from("0x1127d7f2f289d72220deff7eab945e22943aee60d7200e0d83c05f2375255b09")], [BigNumber.from("0x169eba5b3d300c7c8af892a0669fff68c3b09aae1dedd3e04a97115dd1a2f1b0"), BigNumber.from("0x1d2da81e1ec76ac3a712ad9b8bc876094a0b1e237a0bb0b0bdb4faef1e19a5d6"), BigNumber.from("0x2a9f2bd98c69ee1679f99c414f208b8627ff388a06a51e94f499c6a8435c383d")]],
      [2, BigNumber.from("0xd010849c0f0a0b6efffa06202c4d1a61270398b6eaa885d625323a72698a51ff"), "0x4654deae83ef4c7c1a2038497a6618e2704259b1", [BigNumber.from("0x2bd57cf8982c8c93e44493ac9633bc530663e979163b106610e1a17365c57231") , BigNumber.from("0x1208c2828617e84097c2b8c8b354b81cfbd6fc0865dca037f42d0cfbe3193fee")], [BigNumber.from("0x16e214ab576cee18b6845ec176ac03748faaa12cb8d0ae3a661c438d0a3b8cd3"), BigNumber.from("0x22de443229ec35545fbea81e02be5ea5d4b4a54449a2e3532dd087b0c931a9cc"), BigNumber.from("0x161f17ff6d616cb0369d5530142ae7b6521687a117ecd40c40a71ede374e0698")]],
    ];

    await registerVoters(batravot, token, voters);

    // Submit a proof for the election vote

    // Who voted for whom
    let for_voters =
        ["0x48d5f0b15c8fd0f25b8aaed22b567f8cd3fc0ac2", "0x5bba73a2c56a9f2880963230bc49157bed5ad882", "0x77c4414f24dc933b659e7125bc71de1a503a6332", "0xedebfed7145b4e0b8883a97b4d62058de5b8397c", "0x91c73e2cb3c9fc3124d979654f1d32e1214f5a2f", "0x11d9de6c97c2481ec89c5700588cde34c3f8fb88", "0x9b8aafd267966aafe1da77f203a6625bcd653b7c", "0x1a8ef664f0db46f4d97a4ff410f44a1c6d19ac5c", "0x7d1cc66d0285ef51691a404719d37d0e0a413205", "0x28076fca189065de528a8ea92a9e90687a3245b5", "0x83e557c701baa1c303e38f20e9de4138a5c32165", "0x3823f93e2662b15e07340b910aa83eb8a96078d8", "0x132d58b14c90461a1df173fb53b3e4fe83ad5ee1", "0x6a02512e1d2e363b736fca7007074e2b66149ba8", "0x794211a4c20b24f92988ea9e2b1cbd60aafd8a8e", "0xb05cc664b5d7e427b1b9ab1d47d2b6bb2331cb1a"]
    let against_voters =
        ["0xf23124f1b000d814ceb75c2421f0171f255dc480", "0xb6ab186264275462ed460d7b1623d69dc2047d7a", "0x6024c7c8a92812c7d779011ba9cd773e45a223be", "0xb13f7adbaaacbf667d53c7d647cbcf5625e66082", "0x2b5d49d14080c19506deffed813f28c900bb1354", "0xc94e896899caf3bc74b6e696b6be8d3d0e94b268", "0x27568b3ec44086a6564740cb110ced2511227479", "0x6d8817449472e585d764c4b49bc8c95452f6a917", "0xd19469ed63465e9086a688276be44429cc1423c1", "0x709d295d24ea6d55a1c1e29dadf60ad299449185", "0x6d812151d05720e1d69edc5e94407e1c895fdf18", "0x3276e8acf5e63e5ceb338f1cdeb6361b7ac6b065", "0x8106b7098c500999c3ab50402fecfc9cb3a348cf", "0xb8d5d05076634c122dc39b31dbc564fdbf0650c9", "0xb87980a2b9944433dcb1a77cd8edb9f78d769a56", "0xb2a8800732661b480df014e008fcf70ba4e62f67", "0x27d92eaca4064f4926cfc052c46562b7e7e8ece8", "0xa7d89043a98d4bb1441e907080bfbe4b1aab7058", "0x4654deae83ef4c7c1a2038497a6618e2704259b1"]

    let [proof] = [
      [BigNumber.from("0x13b53a42ba7b5edd3cb120aa3e12cc2cde46f72c7db05c8e45cc55b17c6e5bf4") , BigNumber.from("0x178fb3e143aeac34d99df25419087f536f2f4ab1fe228f781ac3d7cf833b8c2d")]
    ];

    await submitElectionProof(batravot, for_voters, against_voters, proof);
    console.log("Submitted a vote proof for the election.")

    // Close the election and check the result
    let election = await closeElectionAndGetResult(batravot);

    expect(election.state).to.equal(2);
    expect(election.result.totalVoters).to.equal(35);
    expect(election.result.yesVoters).to.equal(16);
    expect(election.result.totalVotes).to.equal(1240);
    expect(election.result.yesVotes).to.equal(507);
  });

  it("Can submit multiple proofs", async function () {
    const [batravot, token] = await deployElectionContract();
    await startNewElection(batravot);

    // Add key to the election census
    let voters = [
      [10, BigNumber.from("0x5f6c0209ecd827e914535c5b1afa3b4b6f48285d242d00b37af511dc9ed9ea7b"), "0x48d5f0b15c8fd0f25b8aaed22b567f8cd3fc0ac2", [BigNumber.from("0x2c73fd312a9c3b5c2ab57c5fc12b4a1ad08b245a86ecb1744bb672da676a9b23") , BigNumber.from("0x0a9f46d4388aa89ec81ef2bfc538996d9d2c0d85d0ed6a56e4655b2ba0443de7")], [BigNumber.from("0x041ce74518c3b01010d18e4b0cea31d91f37c86ac5ef48a012a2402c8f6db283"), BigNumber.from("0x2d8c135bd7cb2f2a17c0e71cb91bcd3f63b817cda17a9ebcae0e768070b09022"), BigNumber.from("0x2f98d237f86fb22e37fc0ee9349f3ed9d3e491016c464c991625c7013994ba70")]],
      [20, BigNumber.from("0xc23cd735bae1b6590c8f212894baceeda3cb654b57afa3bc040502a6b9837b4a"), "0x5bba73a2c56a9f2880963230bc49157bed5ad882", [BigNumber.from("0x042ab0055cc8060c73e6dc87b55a4bcf27a7d7622cd39b044b6a7529e5b0f2ab") , BigNumber.from("0x133b0707bac31ffa1fbf33e7b2bdb79790164ddf6fbd71b363e2d36b9cbda3a3")], [BigNumber.from("0x19e12a0d7e4bf5fd4a5332dd95c49abd69865adfb6f54207da0f494221c517e0"), BigNumber.from("0x24193a8f90154b0662f04f8eb75d09b033fce21e9f59b58bf38cc9332b881ac3"), BigNumber.from("0x2655735cd2e25a8fb5a2d4072bc84426c1dbf74b9793287c29b0804badf4ce60")]],
      [2, BigNumber.from("0x15363ad6531f6603be966692114a5530228a0ed8ccde4302ff9a46c98e88d542"), "0xea6ea8a509de3efb42a96b9a9e77d3d121f8cbee", [BigNumber.from("0x041ce74518c3b01010d18e4b0cea31d91f37c86ac5ef48a012a2402c8f6db283") , BigNumber.from("0x2d8c135bd7cb2f2a17c0e71cb91bcd3f63b817cda17a9ebcae0e768070b09022")], [BigNumber.from("0x0339cdbdc22fd121c5c6157db59cc640624f15848bb5d04a57eacf0b86ecd3cd"), BigNumber.from("0x1b45491e5b92d1391e9bbc1cf7863a6a3b71d225075dc3cb99ce3c00d285febc"), BigNumber.from("0x0958d90b407494279cbdee6130a12cf19e5937784569c2392df63ca02f0f4796")]],
      [25, BigNumber.from("0xbd4af6ece9735ef11c980192b68cf503e3a7812fb780723000c40eac38f0894a"), "0x5aef89516e8d5f8d34280e2c242930cb3af8b05d", [BigNumber.from("0x26063b30d4fe8452d89b25c9a7fba079d7313dfabc576ac925be9a24cb01a745") , BigNumber.from("0x22bfb9c2c2cfd25a9076f67f424039f72ebc24aa5882518df31ab82d56a1beec")], [BigNumber.from("0x29ba0bf714e3507efccb6b6170d7a8a80a0de74bee8568f543ca11093901a98b"), BigNumber.from("0x208c19401b6d550f6a6c463b341eda691bdd581046ae9aa54c71d876cf33cc61"), BigNumber.from("0x0aea3305dcba6398eddeefdd6dbaa07f227d671be0d9f5b7f63f3f20cb965c9f")]],
    ];

    await registerVoters(batravot, token, voters);

    // Submit a proof for the election vote

    // Proof 1:

    // Who voted for whom
    let for_voters_1 =
        []
    let against_voters_1 =
        ["0x48d5f0b15c8fd0f25b8aaed22b567f8cd3fc0ac2", "0x5bba73a2c56a9f2880963230bc49157bed5ad882"]

    let [proof_1] = [
      [BigNumber.from("0x2bf6bc1af03cffd0b354e24eded5d988c6c5d8aed1aa851dea9bb06efbfb97de") , BigNumber.from("0x070e101088dfb0e9a282ab44d3db05f4877ec78085824caee95383019e1b9a37")]
    ];

    await submitElectionProof(batravot, for_voters_1, against_voters_1, proof_1);
    console.log("Submitted a vote proof 1 for the election.")

    // Proof 2:

    // Who voted for whom
    let for_voters_2 =
        ["0xea6ea8a509de3efb42a96b9a9e77d3d121f8cbee"]
    let against_voters_2 =
        ["0x5aef89516e8d5f8d34280e2c242930cb3af8b05d"]

    let [proof_2] = [
      [BigNumber.from("0x290692d824b22930879d0d0bbdccc5e275137d2b39a6a0d9714b792ca67565c3") , BigNumber.from("0x12806710ffbc662fa68961399e48d599e2bcd520cbd5adde7af81b59b1c5b61b")]
    ];

    await submitElectionProof(batravot, for_voters_2, against_voters_2, proof_2);
    console.log("Submitted a vote proof 1 for the election.")


    // Close the election and check the result
    let election = await closeElectionAndGetResult(batravot);

    expect(election.state).to.equal(2);
    expect(election.result.totalVoters).to.equal(4);
    expect(election.result.yesVoters).to.equal(1);
    expect(election.result.totalVotes).to.equal(57);
    expect(election.result.yesVotes).to.equal(2);
  });

  it("No one voted", async function () {
    const [batravot, token] = await deployElectionContract();
    await startNewElection(batravot);

    // Add key to the election census
    let voters = [
      [10, BigNumber.from("0x5f6c0209ecd827e914535c5b1afa3b4b6f48285d242d00b37af511dc9ed9ea7b"), "0x48d5f0b15c8fd0f25b8aaed22b567f8cd3fc0ac2", [BigNumber.from("0x2c73fd312a9c3b5c2ab57c5fc12b4a1ad08b245a86ecb1744bb672da676a9b23") , BigNumber.from("0x0a9f46d4388aa89ec81ef2bfc538996d9d2c0d85d0ed6a56e4655b2ba0443de7")], [BigNumber.from("0x041ce74518c3b01010d18e4b0cea31d91f37c86ac5ef48a012a2402c8f6db283"), BigNumber.from("0x2d8c135bd7cb2f2a17c0e71cb91bcd3f63b817cda17a9ebcae0e768070b09022"), BigNumber.from("0x2f98d237f86fb22e37fc0ee9349f3ed9d3e491016c464c991625c7013994ba70")]],
      [20, BigNumber.from("0xc23cd735bae1b6590c8f212894baceeda3cb654b57afa3bc040502a6b9837b4a"), "0x5bba73a2c56a9f2880963230bc49157bed5ad882", [BigNumber.from("0x042ab0055cc8060c73e6dc87b55a4bcf27a7d7622cd39b044b6a7529e5b0f2ab") , BigNumber.from("0x133b0707bac31ffa1fbf33e7b2bdb79790164ddf6fbd71b363e2d36b9cbda3a3")], [BigNumber.from("0x19e12a0d7e4bf5fd4a5332dd95c49abd69865adfb6f54207da0f494221c517e0"), BigNumber.from("0x24193a8f90154b0662f04f8eb75d09b033fce21e9f59b58bf38cc9332b881ac3"), BigNumber.from("0x2655735cd2e25a8fb5a2d4072bc84426c1dbf74b9793287c29b0804badf4ce60")]],
      [2, BigNumber.from("0x15363ad6531f6603be966692114a5530228a0ed8ccde4302ff9a46c98e88d542"), "0xea6ea8a509de3efb42a96b9a9e77d3d121f8cbee", [BigNumber.from("0x041ce74518c3b01010d18e4b0cea31d91f37c86ac5ef48a012a2402c8f6db283") , BigNumber.from("0x2d8c135bd7cb2f2a17c0e71cb91bcd3f63b817cda17a9ebcae0e768070b09022")], [BigNumber.from("0x0339cdbdc22fd121c5c6157db59cc640624f15848bb5d04a57eacf0b86ecd3cd"), BigNumber.from("0x1b45491e5b92d1391e9bbc1cf7863a6a3b71d225075dc3cb99ce3c00d285febc"), BigNumber.from("0x0958d90b407494279cbdee6130a12cf19e5937784569c2392df63ca02f0f4796")]],
      [25, BigNumber.from("0xbd4af6ece9735ef11c980192b68cf503e3a7812fb780723000c40eac38f0894a"), "0x5aef89516e8d5f8d34280e2c242930cb3af8b05d", [BigNumber.from("0x26063b30d4fe8452d89b25c9a7fba079d7313dfabc576ac925be9a24cb01a745") , BigNumber.from("0x22bfb9c2c2cfd25a9076f67f424039f72ebc24aa5882518df31ab82d56a1beec")], [BigNumber.from("0x29ba0bf714e3507efccb6b6170d7a8a80a0de74bee8568f543ca11093901a98b"), BigNumber.from("0x208c19401b6d550f6a6c463b341eda691bdd581046ae9aa54c71d876cf33cc61"), BigNumber.from("0x0aea3305dcba6398eddeefdd6dbaa07f227d671be0d9f5b7f63f3f20cb965c9f")]],
    ];

    await registerVoters(batravot, token, voters);

    // Submit a proof for the election vote
    // As no one voted, we do not submit a proof

    // Close the election and check the result
    let election = await closeElectionAndGetResult(batravot);

    expect(election.state).to.equal(2);
    expect(election.result.totalVoters).to.equal(0);
    expect(election.result.yesVoters).to.equal(0);
    expect(election.result.totalVotes).to.equal(0);
    expect(election.result.yesVotes).to.equal(0);
  });

  it("One vote `For` counted as `against` Fails", async function () {
    const [batravot, token] = await deployElectionContract();
    await startNewElection(batravot);

    // Add keys to the election census
    let voters = [
      [10, BigNumber.from("0x5f6c0209ecd827e914535c5b1afa3b4b6f48285d242d00b37af511dc9ed9ea7b"), "0x48d5f0b15c8fd0f25b8aaed22b567f8cd3fc0ac2", [BigNumber.from("0x2c73fd312a9c3b5c2ab57c5fc12b4a1ad08b245a86ecb1744bb672da676a9b23") , BigNumber.from("0x0a9f46d4388aa89ec81ef2bfc538996d9d2c0d85d0ed6a56e4655b2ba0443de7")], [BigNumber.from("0x041ce74518c3b01010d18e4b0cea31d91f37c86ac5ef48a012a2402c8f6db283"), BigNumber.from("0x2d8c135bd7cb2f2a17c0e71cb91bcd3f63b817cda17a9ebcae0e768070b09022"), BigNumber.from("0x2f98d237f86fb22e37fc0ee9349f3ed9d3e491016c464c991625c7013994ba70")]],
    ];
    await registerVoters(batravot, token, voters);

    // Submit a proof for the election vote
    let [proof] = [
      [BigNumber.from("0x01b6998011a8a862564ebdeaaaf055708dbe5236da1d6727b959d0c62b477c71") , BigNumber.from("0x25abcbd699cefeb30e544c5a8fa8d997e25846c373632b487ee04284baad511a")]
    ];

    // Who voted for whom
    let for_voters = []
    let against_voters =  ["0x48d5f0b15c8fd0f25b8aaed22b567f8cd3fc0ac2"]

    await expect(submitElectionProof(batravot, for_voters, against_voters, proof))
        .to.be.revertedWith("Verification check did not pass");
  });

  it("Proof for different Public Key Fails", async function () {
    const [batravot, token] = await deployElectionContract();
    await startNewElection(batravot);

    // Add keys to the election census
    let voters = [
      [2, BigNumber.from("0x15363ad6531f6603be966692114a5530228a0ed8ccde4302ff9a46c98e88d542"), "0xea6ea8a509de3efb42a96b9a9e77d3d121f8cbee", [BigNumber.from("0x041ce74518c3b01010d18e4b0cea31d91f37c86ac5ef48a012a2402c8f6db283") , BigNumber.from("0x2d8c135bd7cb2f2a17c0e71cb91bcd3f63b817cda17a9ebcae0e768070b09022")], [BigNumber.from("0x0339cdbdc22fd121c5c6157db59cc640624f15848bb5d04a57eacf0b86ecd3cd"), BigNumber.from("0x1b45491e5b92d1391e9bbc1cf7863a6a3b71d225075dc3cb99ce3c00d285febc"), BigNumber.from("0x0958d90b407494279cbdee6130a12cf19e5937784569c2392df63ca02f0f4796")]],
    ];
    await registerVoters(batravot, token, voters);

    // Submit a proof for the election vote
    let [proof] = [
      [BigNumber.from("0x01b6998011a8a862564ebdeaaaf055708dbe5236da1d6727b959d0c62b477c71") , BigNumber.from("0x25abcbd699cefeb30e544c5a8fa8d997e25846c373632b487ee04284baad511a")]
    ];

    // Who voted for whom
    let for_voters = ["0xea6ea8a509de3efb42a96b9a9e77d3d121f8cbee"]
    let against_voters = []


    await expect(submitElectionProof(batravot, for_voters, against_voters, proof))
        .to.be.revertedWith("Verification check did not pass");
  });

});
