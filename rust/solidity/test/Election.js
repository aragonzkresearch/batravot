const { expect } = require("chai");
const { ethers } = require("hardhat");
const {BigNumber} = require("ethers");


describe("Testing functionality", function () {
  it("Dummy test", async function () {
    expect(1).to.equal(1);
  });

  it("One vote voted for verifies.", async function () {
    const BatRaVot = await ethers.getContractFactory("BatRaVot");
    const elections = await BatRaVot.deploy();

    await elections.deployed();
    console.log("Election Handler deployed to:", elections.address);

    // Start a new election
    let specifiers = [
      [BigNumber.from('0x0741D5A16A49B7F00F0A82DBABC91D89332D8FED0BA1CE33FF40B363224005EA'),BigNumber.from('0x1FC70911C14D984447BC905FE5712ECA1E16D7498C2334A451CD06FAE6BBFD6D')],[[BigNumber.from('0x24A0CD744DA37D3E6FC2472C00E4D0D3EB89F60A622CCC15E7F1D94693574196'),BigNumber.from('0x30400CDC6644DEA03B1135F3059EACD40287549F29426AFA75D6A1666AC1270C')],[BigNumber.from('0x00EF16853D17C2A273A4145BC3B4900101F5EE6A3209C5293C00A91D17CABD52'),BigNumber.from('0x086E34452857BD3C1B9F6CD350E5C4BE64FCC81500F85471811811A468ADC2FD')]],[BigNumber.from('0x27E040376BCFC428695CB121DBC1E0235C2ED4861410F8A1F1936EFC63098835'),BigNumber.from('0x0C6C2104AC3A92E182DAB6D0310525F5211183D9675C5F9D90DB8D274B9D1493')],[[BigNumber.from('0x1B9475177F7F499AE18F442CF8947F04FB8A85EAF16D02E6B03DF857EF05CAD5'),BigNumber.from('0x22DD32B43B417E038BBDA36E35BA29A3B6D4E1E65E47C7A2EB9339D9307E5380')],[BigNumber.from('0x1D4BEE088DADE6BC2BBAEEDFA03137D28BD0C3E4E205BE1D9445E679216F5826'),BigNumber.from('0x11AC5E97E0AC2368243D6D4C4A910880244E9EE6489C024C4E1D44661552C81A')]]
    ];

    let [specifier_yes_g1, specifier_yes_g2, specifier_no_g1, specifier_no_g2] = specifiers;

    const createElectionTx = await elections.createElection("Test Election", specifier_yes_g1, specifier_yes_g2, specifier_no_g1, specifier_no_g2);
    await createElectionTx.wait();
    console.log("New election created successfully!")

    let electionId = 0;
    let election = await elections.elections(electionId);
    console.log("Current election status: ", election.state)

    // Add key to the election census
    let pubKey = [BigNumber.from('0x0663C3B47E028293A10E5DFD476C59EFE2431A5104078E5A94EA851039E0DC60'),BigNumber.from('0x146E8A7301ED5F2EEA77831FBE2CD466B4CB1E4775855B0FCB6ED677458086B6')]
    const registerKeyTx = await elections.registerInCensus(pubKey);
    await registerKeyTx.wait();
    console.log("Updated census with a new key.");

    // Submit a proof for the election vote
    let proof = [BigNumber.from('0x01D7845E6465AB0C8E0A2A3E23755BF24F96AEA9B92AFEB710B10D2115D4B1F2'),BigNumber.from('0x2356E25438D5EE16AEB41FBE8ADB538BD07ACDB5E51A0C72F8E2A74C135B7A38')];
    let yes_vote_ids = [0] // First person in the census voted yes
    let no_vote_ids = [] // No one voted no
    const submitVoteWithProofTx = await elections.submitVotesWithProof(electionId, yes_vote_ids, no_vote_ids, proof);
    await submitVoteWithProofTx.wait();
    console.log("Submitted a vote proof for the election.")

    // Close the election
    const closeElectionTx = await elections.closeElection(electionId);
    await closeElectionTx.wait();
    console.log("Final election results: ", (await elections.elections(electionId)).result);
  });

  it("10 voters voted for verify", async function () {
    const BatRaVot = await ethers.getContractFactory("BatRaVot");
    const elections = await BatRaVot.deploy();

    await elections.deployed();
    console.log("Election Handler deployed to:", elections.address);

    // Start a new election
    let specifiers = [
      [BigNumber.from('0x0741D5A16A49B7F00F0A82DBABC91D89332D8FED0BA1CE33FF40B363224005EA'),BigNumber.from('0x1FC70911C14D984447BC905FE5712ECA1E16D7498C2334A451CD06FAE6BBFD6D')],[[BigNumber.from('0x24A0CD744DA37D3E6FC2472C00E4D0D3EB89F60A622CCC15E7F1D94693574196'),BigNumber.from('0x30400CDC6644DEA03B1135F3059EACD40287549F29426AFA75D6A1666AC1270C')],[BigNumber.from('0x00EF16853D17C2A273A4145BC3B4900101F5EE6A3209C5293C00A91D17CABD52'),BigNumber.from('0x086E34452857BD3C1B9F6CD350E5C4BE64FCC81500F85471811811A468ADC2FD')]],[BigNumber.from('0x27E040376BCFC428695CB121DBC1E0235C2ED4861410F8A1F1936EFC63098835'),BigNumber.from('0x0C6C2104AC3A92E182DAB6D0310525F5211183D9675C5F9D90DB8D274B9D1493')],[[BigNumber.from('0x1B9475177F7F499AE18F442CF8947F04FB8A85EAF16D02E6B03DF857EF05CAD5'),BigNumber.from('0x22DD32B43B417E038BBDA36E35BA29A3B6D4E1E65E47C7A2EB9339D9307E5380')],[BigNumber.from('0x1D4BEE088DADE6BC2BBAEEDFA03137D28BD0C3E4E205BE1D9445E679216F5826'),BigNumber.from('0x11AC5E97E0AC2368243D6D4C4A910880244E9EE6489C024C4E1D44661552C81A')]]
    ];

    let [specifier_yes_g1, specifier_yes_g2, specifier_no_g1, specifier_no_g2] = specifiers;

    const createElectionTx = await elections.createElection("Test Election", specifier_yes_g1, specifier_yes_g2, specifier_no_g1, specifier_no_g2);
    await createElectionTx.wait();
    console.log("New election created successfully!")

    let electionId = 0;
    let election = await elections.elections(electionId);
    console.log("Current election status: ", election.state)

    // Add key to the election census
    let pubKeys = [
      [BigNumber.from('0x2DAA75366D2F8E17136689D0BC688322CC0CB6EB2FE524FEDC4DA4455683323A'),BigNumber.from('0x18439252B6B5B00B2477D188F283D999C154151DB451EF290F5DAF23721F2B90')],[BigNumber.from('0x1D10E7A8BACBAA63882D0BD6DB53FF98411E13ACC4BD19DC398964CA536B7FE6'),BigNumber.from('0x1C06114B9D74C5EEC1EE36AD687289DE3D75D16346D2D635F7100122809BC346')],[BigNumber.from('0x19ADBDDAF2DE2BA29E5B68589474E8F24B82D2CE05624AB0D4FA02DDA2B5D3D4'),BigNumber.from('0x11686856D92AA64A4B053B172E2CD005C554C41EFF9C52323D610F565B6427AB')],[BigNumber.from('0x1DBEB2CE90DCD43BD3606EAC8BA5D650C57E5BD5D53FE2EF4490B743E9D93202'),BigNumber.from('0x2FBBF9E2DBD1E905E0B8BC88071664FB4F1C3FD41900C3E4BF9116015FCD6578')],[BigNumber.from('0x13BBDBF82E1B34D6365C409FC8E16B9A1AA2EC7345B0263BC800B884AAA2B2E3'),BigNumber.from('0x07915BFDDA9E9043D5AE94106A18F6CA16225F4CEBF38D7F17D58FDFAB935C0D')],[BigNumber.from('0x0E01167D96B742A1D297F171D74C9B6242177881D2591A37E4CE27C033147290'),BigNumber.from('0x26ED6D34D18E91B11AE8C18AC10C6F04E06F1BB673239EFE4B60880642AF3DC4')],[BigNumber.from('0x2DFE05F75BC652DAC2320C539E849BD9A0C4874FEE802BA849B929C60F87B053'),BigNumber.from('0x0E33519ABBF587A6B71FABBC84052B6C9ED5F917A7A6862C52ECA0ED3C1AF345')],[BigNumber.from('0x1A5335FE7994FDA9B63B359B949A9B55C0A1B410051D68389835A746E5176211'),BigNumber.from('0x07C300693A5504EEB1BCCC7A2E2026D7395A8C0914A7A38307A9F53DFD285DA9')],[BigNumber.from('0x210794DF05EFF6119A6EBE3B607115BF29C558F43D21810B44A874A6DE4EA5A5'),BigNumber.from('0x20F5826055F05EDF7EAAA8A8112927B900A25F5B147635C20DA04B17FABCE7E9')],[BigNumber.from('0x2AAA54DCAE0127FC427890696E2601E93076E2271D0155399CEDF7F0F734195D'),BigNumber.from('0x122A8CC2CB0FE15EF5A7F5BFEABAF37F255EDC4FC0392D7044B7EA43DBA0271B')]
    ];

    for (const pubKey of pubKeys) {
      console.log("Registering key: ", pubKey);
      const registerKeyTx = await elections.registerInCensus(pubKey);
      await registerKeyTx.wait();
      console.log("Updated census with a new key.");
    }

    // Submit a proof for the election vote
    let yes_vote_ids = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
    let no_vote_ids = [] // No one voted no
    let proof = [BigNumber.from('0x0C36EBDB5B9500A8CFFD0B8A1A1451FFD05433CB258124A32BB2AFEC370BA680'),BigNumber.from('0x2E25B00DE9511B993DD5B530CC0D78B1E765B09A0A12D5F349857862BD1761CE')];
    const submitVoteWithProofTx = await elections.submitVotesWithProof(electionId, yes_vote_ids, no_vote_ids, proof);
    await submitVoteWithProofTx.wait();
    console.log("Submitted a vote proof for the election.")

    // Close the election
    const closeElectionTx = await elections.closeElection(electionId);
    await closeElectionTx.wait();
    console.log("Final election results: ", (await elections.elections(electionId)).result);
  });

  it("One vote voted against verifies.", async function () {
    const BatRaVot = await ethers.getContractFactory("BatRaVot");
    const elections = await BatRaVot.deploy();

    await elections.deployed();
    console.log("Election Handler deployed to:", elections.address);

    // Start a new election
    let specifiers = [
      [BigNumber.from('0x0741D5A16A49B7F00F0A82DBABC91D89332D8FED0BA1CE33FF40B363224005EA'),BigNumber.from('0x1FC70911C14D984447BC905FE5712ECA1E16D7498C2334A451CD06FAE6BBFD6D')],[[BigNumber.from('0x24A0CD744DA37D3E6FC2472C00E4D0D3EB89F60A622CCC15E7F1D94693574196'),BigNumber.from('0x30400CDC6644DEA03B1135F3059EACD40287549F29426AFA75D6A1666AC1270C')],[BigNumber.from('0x00EF16853D17C2A273A4145BC3B4900101F5EE6A3209C5293C00A91D17CABD52'),BigNumber.from('0x086E34452857BD3C1B9F6CD350E5C4BE64FCC81500F85471811811A468ADC2FD')]],[BigNumber.from('0x27E040376BCFC428695CB121DBC1E0235C2ED4861410F8A1F1936EFC63098835'),BigNumber.from('0x0C6C2104AC3A92E182DAB6D0310525F5211183D9675C5F9D90DB8D274B9D1493')],[[BigNumber.from('0x1B9475177F7F499AE18F442CF8947F04FB8A85EAF16D02E6B03DF857EF05CAD5'),BigNumber.from('0x22DD32B43B417E038BBDA36E35BA29A3B6D4E1E65E47C7A2EB9339D9307E5380')],[BigNumber.from('0x1D4BEE088DADE6BC2BBAEEDFA03137D28BD0C3E4E205BE1D9445E679216F5826'),BigNumber.from('0x11AC5E97E0AC2368243D6D4C4A910880244E9EE6489C024C4E1D44661552C81A')]]
    ];

    let [specifier_yes_g1, specifier_yes_g2, specifier_no_g1, specifier_no_g2] = specifiers;

    const createElectionTx = await elections.createElection("Test Election", specifier_yes_g1, specifier_yes_g2, specifier_no_g1, specifier_no_g2);
    await createElectionTx.wait();
    console.log("New election created successfully!")

    let electionId = 0;
    let election = await elections.elections(electionId);
    console.log("Current election status: ", election.state)

    // Add key to the election census
    let pubKey = [BigNumber.from('0x2C0B74AD2D5D4D3432194E012FA2E0FB8A158283B40327F5AA7BE1C7C8697E0A'),BigNumber.from('0x24E3F1118014821522F3FC792828EE605160A7CF1ADB60A36A06321A9D18F8B3')];
    const registerKeyTx = await elections.registerInCensus(pubKey);
    await registerKeyTx.wait();
    console.log("Updated census with a new key.");

    // Submit a proof for the election vote
    let proof = [BigNumber.from('0x11E7F8665A8F3D9FD7B656263A053BE9EF61315C16C6454FDCD11ED4537373BA'),BigNumber.from('0x02E68F70D473371B3B8ABFAFB196461508D734E6862D1B8FD08CD29A3E7A15AF')];
    let yes_vote_ids = [] // First person in the census voted yes
    let no_vote_ids = [0] // No one voted no
    const submitVoteWithProofTx = await elections.submitVotesWithProof(electionId, yes_vote_ids, no_vote_ids, proof);
    await submitVoteWithProofTx.wait();
    console.log("Submitted a vote proof for the election.")

    // Close the election
    const closeElectionTx = await elections.closeElection(electionId);
    await closeElectionTx.wait();
    console.log("Final election results: ", (await elections.elections(electionId)).result);
  });

  it("10 voters voted against verify", async function () {
    const BatRaVot = await ethers.getContractFactory("BatRaVot");
    const elections = await BatRaVot.deploy();

    await elections.deployed();
    console.log("Election Handler deployed to:", elections.address);

    // Start a new election
    let specifiers = [
      [BigNumber.from('0x0741D5A16A49B7F00F0A82DBABC91D89332D8FED0BA1CE33FF40B363224005EA'),BigNumber.from('0x1FC70911C14D984447BC905FE5712ECA1E16D7498C2334A451CD06FAE6BBFD6D')],[[BigNumber.from('0x24A0CD744DA37D3E6FC2472C00E4D0D3EB89F60A622CCC15E7F1D94693574196'),BigNumber.from('0x30400CDC6644DEA03B1135F3059EACD40287549F29426AFA75D6A1666AC1270C')],[BigNumber.from('0x00EF16853D17C2A273A4145BC3B4900101F5EE6A3209C5293C00A91D17CABD52'),BigNumber.from('0x086E34452857BD3C1B9F6CD350E5C4BE64FCC81500F85471811811A468ADC2FD')]],[BigNumber.from('0x27E040376BCFC428695CB121DBC1E0235C2ED4861410F8A1F1936EFC63098835'),BigNumber.from('0x0C6C2104AC3A92E182DAB6D0310525F5211183D9675C5F9D90DB8D274B9D1493')],[[BigNumber.from('0x1B9475177F7F499AE18F442CF8947F04FB8A85EAF16D02E6B03DF857EF05CAD5'),BigNumber.from('0x22DD32B43B417E038BBDA36E35BA29A3B6D4E1E65E47C7A2EB9339D9307E5380')],[BigNumber.from('0x1D4BEE088DADE6BC2BBAEEDFA03137D28BD0C3E4E205BE1D9445E679216F5826'),BigNumber.from('0x11AC5E97E0AC2368243D6D4C4A910880244E9EE6489C024C4E1D44661552C81A')]]
    ];

    let [specifier_yes_g1, specifier_yes_g2, specifier_no_g1, specifier_no_g2] = specifiers;

    const createElectionTx = await elections.createElection("Test Election", specifier_yes_g1, specifier_yes_g2, specifier_no_g1, specifier_no_g2);
    await createElectionTx.wait();
    console.log("New election created successfully!")

    let electionId = 0;
    let election = await elections.elections(electionId);
    console.log("Current election status: ", election.state)

    // Add key to the election census
    let pubKeys = [
      [BigNumber.from('0x056B7E45AE450DE70A0134884B9ACBDB0611BFA4E723CB008E80E2629BD60C3F'),BigNumber.from('0x07CC10493E106DBEC519E4CE093F3412BF2C8B2A8C556C223FCC9AF3890B1429')],[BigNumber.from('0x08A382925D895E90D4028EA68EBDB56A902932FEF8078BF41B7166400569B199'),BigNumber.from('0x288A52F8214A1FAF4591538E818557B3D30D5EB876C8A70521BE872F57379C83')],[BigNumber.from('0x2E862BDD4546D30F40CA0531CA1CA5A235FA597D680ECD4774E3160FF5B42026'),BigNumber.from('0x2596D84091A5AA5AEDCD65F015B182B05A33AA59F2C135B20F511D9C2E916A15')],[BigNumber.from('0x216AE49CB1BFBE666F18D7C08D940B8EB10C9F5445F43863A5FF540C84D129F5'),BigNumber.from('0x2290A429F5D7B5BF6F55A29A1F5CCA36B1D470C615651E5AFC641D1FD0411587')],[BigNumber.from('0x1FC971F6C9EBBBF2A661972D32DDB3007D3975A4F574B8CCB8A1EC9B80FA5AF4'),BigNumber.from('0x14DFF128FB70119FC2CC5B89B528C90668BFD086D1A91FCF515FE0101BA12AE1')],[BigNumber.from('0x1921C89C5E5B19D738D4252414AD78F16D08D517B6B48D27A81A6D0E88991B5A'),BigNumber.from('0x1FB29670526740CE44B6E4D4427D1B4A984B47B71E686E05C2DA65EEB68F23B6')],[BigNumber.from('0x0302BF09AA837D3AEAB05CD79EEEA758C02C505812C9EFF9F36FA8D16A7B2150'),BigNumber.from('0x07599DE8F481697F550254E7674BFE3ED8634398FEC719469B348B988DD61591')],[BigNumber.from('0x287B0D80582B020233662A46D48C448B6822D53F9934C7380E1B2AD02393AC3F'),BigNumber.from('0x1261C71A13AAB702E0C7A2AC48184E79A9A496E9B53895C13C74E57925CD28DF')],[BigNumber.from('0x02E7950F7EBCE979C845EBB539311730A26FBBF4C1C31F0F9F1D61118B73A7DE'),BigNumber.from('0x2DFD8CFF5A7F1B2AF84553056C5402B0DD6B5D92A71CCC551812A9E9ABCC6656')],[BigNumber.from('0x0417ADDC4339E596244650659F3F20CBF700D43D457C2DEF64A61189D2DBFCA7'),BigNumber.from('0x13B8308134CEFC30EB8C5A59FB9DBAD9061508BD27EBBAB550D9939E348440AE')]
    ];

    for (const pubKey of pubKeys) {
      console.log("Registering key: ", pubKey);
      const registerKeyTx = await elections.registerInCensus(pubKey);
      await registerKeyTx.wait();
      console.log("Updated census with a new key.");
    }

    // Submit a proof for the election vote
    let yes_vote_ids = []
    let no_vote_ids = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
    let proof = [BigNumber.from('0x12B3ABB25077062DE6C2AD711A2F704577823A15EF1BB1D7C7FFB83E5265314C'),BigNumber.from('0x1A43C2E25C68CD544A6FEA1D9E9D808B7789FE41C786028EA28BB2818DCFA943')];
    const submitVoteWithProofTx = await elections.submitVotesWithProof(electionId, yes_vote_ids, no_vote_ids, proof);
    await submitVoteWithProofTx.wait();
    console.log("Submitted a vote proof for the election.")

    // Close the election
    const closeElectionTx = await elections.closeElection(electionId);
    await closeElectionTx.wait();
    console.log("Final election results: ", (await elections.elections(electionId)).result);
  });

  it("1 vote for 1 vote against verify", async function () {
    const BatRaVot = await ethers.getContractFactory("BatRaVot");
    const elections = await BatRaVot.deploy();

    await elections.deployed();
    console.log("Election Handler deployed to:", elections.address);

    // Start a new election
    let specifiers = [
      [BigNumber.from('0x0741D5A16A49B7F00F0A82DBABC91D89332D8FED0BA1CE33FF40B363224005EA'),BigNumber.from('0x1FC70911C14D984447BC905FE5712ECA1E16D7498C2334A451CD06FAE6BBFD6D')],[[BigNumber.from('0x24A0CD744DA37D3E6FC2472C00E4D0D3EB89F60A622CCC15E7F1D94693574196'),BigNumber.from('0x30400CDC6644DEA03B1135F3059EACD40287549F29426AFA75D6A1666AC1270C')],[BigNumber.from('0x00EF16853D17C2A273A4145BC3B4900101F5EE6A3209C5293C00A91D17CABD52'),BigNumber.from('0x086E34452857BD3C1B9F6CD350E5C4BE64FCC81500F85471811811A468ADC2FD')]],[BigNumber.from('0x27E040376BCFC428695CB121DBC1E0235C2ED4861410F8A1F1936EFC63098835'),BigNumber.from('0x0C6C2104AC3A92E182DAB6D0310525F5211183D9675C5F9D90DB8D274B9D1493')],[[BigNumber.from('0x1B9475177F7F499AE18F442CF8947F04FB8A85EAF16D02E6B03DF857EF05CAD5'),BigNumber.from('0x22DD32B43B417E038BBDA36E35BA29A3B6D4E1E65E47C7A2EB9339D9307E5380')],[BigNumber.from('0x1D4BEE088DADE6BC2BBAEEDFA03137D28BD0C3E4E205BE1D9445E679216F5826'),BigNumber.from('0x11AC5E97E0AC2368243D6D4C4A910880244E9EE6489C024C4E1D44661552C81A')]]
    ];

    let [specifier_yes_g1, specifier_yes_g2, specifier_no_g1, specifier_no_g2] = specifiers;

    const createElectionTx = await elections.createElection("Test Election", specifier_yes_g1, specifier_yes_g2, specifier_no_g1, specifier_no_g2);
    await createElectionTx.wait();
    console.log("New election created successfully!")

    let electionId = 0;
    let election = await elections.elections(electionId);
    console.log("Current election status: ", election.state)

    // Add key to the election census
    let pubKeys = [
      [BigNumber.from('0x2523F1C4764F6DB67A7A889F50D8C813239011BBEF137E8CE401391B0768CABE'),BigNumber.from('0x2D0DE57B0A3CD3EF0800AAAE69BE4F4FD3431772250A0FB456FFB1FDA49BCD1F')],[BigNumber.from('0x0D632263F6C0D5C86665E6A3FFEEA396C303FCEC25888AB9138B657431728DC8'),BigNumber.from('0x2FA5B8E71B7A5148B7C7E170BEE238F563FD5DA80CC45809D728AC2AFBC01AEF')]
    ];

    for (const pubKey of pubKeys) {
      console.log("Registering key: ", pubKey);
      const registerKeyTx = await elections.registerInCensus(pubKey);
      await registerKeyTx.wait();
      console.log("Updated census with a new key.");
    }

    // Submit a proof for the election vote
    let yes_vote_ids = [0]
    let no_vote_ids = [1]
    let proof = [BigNumber.from('0x2ACFB8723C69581457CBA0255C2CF75E3011D6A2FDCECF3F795BBA3AC1554B89'),BigNumber.from('0x161C223D096261F444AA55B33B44096E450670E4FE47EAB0C6EDA3E9D1CDF4A9')];
    const submitVoteWithProofTx = await elections.submitVotesWithProof(electionId, yes_vote_ids, no_vote_ids, proof);
    await submitVoteWithProofTx.wait();
    console.log("Submitted a vote proof for the election.")

    // Close the election
    const closeElectionTx = await elections.closeElection(electionId);
    await closeElectionTx.wait();
    console.log("Final election results: ", (await elections.elections(electionId)).result);
  });

  it("1 for 2 against votes verify", async function () {
    const BatRaVot = await ethers.getContractFactory("BatRaVot");
    const elections = await BatRaVot.deploy();

    await elections.deployed();
    console.log("Election Handler deployed to:", elections.address);

    // Start a new election
    let specifiers = [
      [BigNumber.from('0x0741D5A16A49B7F00F0A82DBABC91D89332D8FED0BA1CE33FF40B363224005EA'),BigNumber.from('0x1FC70911C14D984447BC905FE5712ECA1E16D7498C2334A451CD06FAE6BBFD6D')],[[BigNumber.from('0x24A0CD744DA37D3E6FC2472C00E4D0D3EB89F60A622CCC15E7F1D94693574196'),BigNumber.from('0x30400CDC6644DEA03B1135F3059EACD40287549F29426AFA75D6A1666AC1270C')],[BigNumber.from('0x00EF16853D17C2A273A4145BC3B4900101F5EE6A3209C5293C00A91D17CABD52'),BigNumber.from('0x086E34452857BD3C1B9F6CD350E5C4BE64FCC81500F85471811811A468ADC2FD')]],[BigNumber.from('0x27E040376BCFC428695CB121DBC1E0235C2ED4861410F8A1F1936EFC63098835'),BigNumber.from('0x0C6C2104AC3A92E182DAB6D0310525F5211183D9675C5F9D90DB8D274B9D1493')],[[BigNumber.from('0x1B9475177F7F499AE18F442CF8947F04FB8A85EAF16D02E6B03DF857EF05CAD5'),BigNumber.from('0x22DD32B43B417E038BBDA36E35BA29A3B6D4E1E65E47C7A2EB9339D9307E5380')],[BigNumber.from('0x1D4BEE088DADE6BC2BBAEEDFA03137D28BD0C3E4E205BE1D9445E679216F5826'),BigNumber.from('0x11AC5E97E0AC2368243D6D4C4A910880244E9EE6489C024C4E1D44661552C81A')]]
    ];

    let [specifier_yes_g1, specifier_yes_g2, specifier_no_g1, specifier_no_g2] = specifiers;

    const createElectionTx = await elections.createElection("Test Election", specifier_yes_g1, specifier_yes_g2, specifier_no_g1, specifier_no_g2);
    await createElectionTx.wait();
    console.log("New election created successfully!")

    let electionId = 0;
    let election = await elections.elections(electionId);
    console.log("Current election status: ", election.state)

    // Add key to the election census
    let pubKeys = [
      [BigNumber.from('0x0CAB8D9866BB765BD3DFBDFC69A13904FC8E209355696AA18D4574B4C4A7533A'),BigNumber.from('0x2505D95498F7883185C7EBE7849B2BE5AB47FAD50285E1C6E8C63CF1483DC0E1')],[BigNumber.from('0x2C3E4FF9756B22017AFBB92A19108B30BC64345C45AB2DD8A79BDAD63ADCC962'),BigNumber.from('0x16B4E2CC395C0E850A9D9574B5C4B5AC623D40442D6E95BF2CBB4BFC24963016')],[BigNumber.from('0x0028A2D9A7EEC7354F601B2C5799BC6E209FB6C8F7D58CE5EF8CA41BEAB95900'),BigNumber.from('0x2D6C9D2DBEAD4A0BC72AA8AB5461C66CD0E81CF8CB2A08B1F0351AEAFB1DC5C6')]
    ];

    for (const pubKey of pubKeys) {
      console.log("Registering key: ", pubKey);
      const registerKeyTx = await elections.registerInCensus(pubKey);
      await registerKeyTx.wait();
      console.log("Updated census with a new key.");
    }

    // Submit a proof for the election vote
    let yes_vote_ids = [1]
    let no_vote_ids = [0, 2]
    let proof = [BigNumber.from('0x276B60374EF78966057E91A4059272EB16AC8C8F61A5A99EE5A509AEC059A990'),BigNumber.from('0x027F2352750D079A595C99A735508CB3800576D659D5F1564465C4EAE003A737')];
    const submitVoteWithProofTx = await elections.submitVotesWithProof(electionId, yes_vote_ids, no_vote_ids, proof);
    await submitVoteWithProofTx.wait();
    console.log("Submitted a vote proof for the election.")

    // Close the election
    const closeElectionTx = await elections.closeElection(electionId);
    await closeElectionTx.wait();
    console.log("Final election results: ", (await elections.elections(electionId)).result);
  });

  it("20 random votes verify", async function () {
    const BatRaVot = await ethers.getContractFactory("BatRaVot");
    const elections = await BatRaVot.deploy();

    await elections.deployed();
    console.log("Election Handler deployed to:", elections.address);

    // Start a new election
    let specifiers = [
      [BigNumber.from('0x0741D5A16A49B7F00F0A82DBABC91D89332D8FED0BA1CE33FF40B363224005EA'),BigNumber.from('0x1FC70911C14D984447BC905FE5712ECA1E16D7498C2334A451CD06FAE6BBFD6D')],[[BigNumber.from('0x24A0CD744DA37D3E6FC2472C00E4D0D3EB89F60A622CCC15E7F1D94693574196'),BigNumber.from('0x30400CDC6644DEA03B1135F3059EACD40287549F29426AFA75D6A1666AC1270C')],[BigNumber.from('0x00EF16853D17C2A273A4145BC3B4900101F5EE6A3209C5293C00A91D17CABD52'),BigNumber.from('0x086E34452857BD3C1B9F6CD350E5C4BE64FCC81500F85471811811A468ADC2FD')]],[BigNumber.from('0x27E040376BCFC428695CB121DBC1E0235C2ED4861410F8A1F1936EFC63098835'),BigNumber.from('0x0C6C2104AC3A92E182DAB6D0310525F5211183D9675C5F9D90DB8D274B9D1493')],[[BigNumber.from('0x1B9475177F7F499AE18F442CF8947F04FB8A85EAF16D02E6B03DF857EF05CAD5'),BigNumber.from('0x22DD32B43B417E038BBDA36E35BA29A3B6D4E1E65E47C7A2EB9339D9307E5380')],[BigNumber.from('0x1D4BEE088DADE6BC2BBAEEDFA03137D28BD0C3E4E205BE1D9445E679216F5826'),BigNumber.from('0x11AC5E97E0AC2368243D6D4C4A910880244E9EE6489C024C4E1D44661552C81A')]]
    ];

    let [specifier_yes_g1, specifier_yes_g2, specifier_no_g1, specifier_no_g2] = specifiers;

    const createElectionTx = await elections.createElection("Test Election", specifier_yes_g1, specifier_yes_g2, specifier_no_g1, specifier_no_g2);
    await createElectionTx.wait();
    console.log("New election created successfully!")

    let electionId = 0;
    let election = await elections.elections(electionId);
    console.log("Current election status: ", election.state)

    // Add key to the election census
    let pubKeys = [
      [BigNumber.from('0x2B2DC3BDBCA76AB100360BDF22B94A4B4D63A2B6452C68FBD1125F73175DDA0A'),BigNumber.from('0x11ABA931910FF7A5D4F6099FDF2BD344818175D90A1DFDD6B19051562D53C3C5')],[BigNumber.from('0x0CB6717427B12F21F485A48C1A6D58195245F4E222CD4142E9DEEBC57EAEA0C5'),BigNumber.from('0x2A3B8392C2FDF28FBA563D774B809CF1995B31901FB4C66003B3F32FBE82BD3D')],[BigNumber.from('0x01C827336AD2DE8EF61D4E6A97E66553E7739B42692CB7DBC4FF2AD24DBB658E'),BigNumber.from('0x24A74801CA89F887F92F8F51E35CFC8BD6D318EAB9AA142021052DBFAE3D1E37')],[BigNumber.from('0x258065723B7164FE7652695E284B51592FEF65FA3DDADB43CD8B84D5D892ADEC'),BigNumber.from('0x2201CD0EE0CEB693B5C7E524E53412375A888A1F6EE2A0A0E238E782B790B7B4')],[BigNumber.from('0x15C5C37633057B57749E8A95AC0A82C0BF672632422E81F2B8B106F6AB771335'),BigNumber.from('0x1371BE5FFD1553085374AF369C05D3AEAC7E5AFE199957EE2F9D7FDE51680602')],[BigNumber.from('0x0E2043DB9EA36359DF06AF525D55A90150ED98FB96731FB7A20F2CF84DC01487'),BigNumber.from('0x2248EB5F0C0F4C81FF391DC24E4B0E0C35A3B2D3D6D0C8C024CF7B6A0F4ED750')],[BigNumber.from('0x1E6B5D622AFBAE43E3600F450D7FA951A073EFE4CA10D19BA12263443088CAE5'),BigNumber.from('0x1A9DB747926135337B7341C2FD057DADDA153B4E352833176876FD792FCF2A78')],[BigNumber.from('0x28108D6D724CECC4E86745828177FB2156BC19F97F8F10A4287D0BD6CC1B0FB6'),BigNumber.from('0x178743D982473AF4D8BEC1EF3DF163633628B8138FCDB87F1DFD6CFE281DA5C8')],[BigNumber.from('0x2A810F075B0316514A98331EF9A5B3DC9CC674AC6A7FDCA935D13826C3CA4412'),BigNumber.from('0x2FB2D4B779B5BFD46223ECCBFD8EFC53F2ACF0E92362D657101B46EFD2A750EC')],[BigNumber.from('0x03B31035C4FCAC3B7E5F0FB9802A34BC97AD7D569D1F82DA30BEABDA5B680819'),BigNumber.from('0x12155456AE9CED24A2310FB77883F4FFF5B60B950345937C1B584BD6547CA81A')],[BigNumber.from('0x07694FAD1EDDBD4C50B0B1D7DCD0DFBF259884329A34E35EC318463D1749447C'),BigNumber.from('0x046872D29CFD73C114BC974528E3578ED566926A1513C553BBEDEC6AC95A1673')],[BigNumber.from('0x004995D5069939B431BB8EC6C9A90552AF507E0C2AFCE36BAE213A304D1928BB'),BigNumber.from('0x0F05946F8C78A6DFA7CA33E2BD8E2610C40B89EA2EDB2CD902773383CF9EAFD3')],[BigNumber.from('0x069CA2EF2C5BEEC1C7B1EE52F2542E93991C3EB45490108E5DE89440047096A1'),BigNumber.from('0x2DC0620E953903DDD05C57A9BE2AACBF779733B1FC2C33D322AFB6A0CC5CA0A3')],[BigNumber.from('0x2CF0D5B909E8BAA7579148B20B5FC478E119528C381FCD57D0B66D5ADC0BC491'),BigNumber.from('0x22C2595C49736D87E0ADAC7788EA0313CE696A16B2C5D2546428F8354E975B41')],[BigNumber.from('0x284BDB40AA952023C4812BCFD22F194A045C2D72C390AE7EB5943BF009A62847'),BigNumber.from('0x0BD1C9DA4E5A54DAE6383FFEE38D292C0E6421CFAB0D810C4400010D71FDB3D1')],[BigNumber.from('0x2A0A2A6EE0A88798D6597847BB7B7A2DA4FACA53D6B3A2ECD77954F3DC5568E6'),BigNumber.from('0x2E9FBBCE00B95A3BE3E0FC25C326626ADA9145F0FDC0C3B986C9189C1A60E4C0')],[BigNumber.from('0x13B84AE0B67F9EA42495D0435D6718D36281B1C1347264210E44C606E5994708'),BigNumber.from('0x22905353E4E44845873618A3B216E641F252DF19A4ADE805038B4228E2202929')],[BigNumber.from('0x26DD905D3670A266D0C20914CF385D4F0D195E935C5FE6B3A0F6490991BB6481'),BigNumber.from('0x11512266E48550B61B989926AFB99FEA3164EA443E9B42DF6ED4FC7EA9C42D86')],[BigNumber.from('0x223F2C2CFBCA6564EEB98D39CBD53C7FB9FA80AC910072AE469695F7BEF544D0'),BigNumber.from('0x05D926CD3FFF4255FA4572109D994A4D5EE189EF3EB701D930C5B806335381CA')],[BigNumber.from('0x07999EBE5BE0E7735D7F539AB8F7F3DE5CA0792F943447B8FAE856726A99B3CE'),BigNumber.from('0x290A6F13679D9335F54688CB45ED83C45E81C5D7E16295D4537F98189DB64EB4')]
    ];

    for (const pubKey of pubKeys) {
      console.log("Registering key: ", pubKey);
      const registerKeyTx = await elections.registerInCensus(pubKey);
      await registerKeyTx.wait();
      console.log("Updated census with a new key.");
    }

    // Submit a proof for the election vote
    let yes_vote_ids = [1, 2, 3, 9, 10, 16, 19]
    let no_vote_ids = [0, 4, 5, 6, 7, 8, 11, 12, 13, 14, 15, 17, 18]
    let proof = [BigNumber.from('0x2EB8F2FD2DCBEDF018155ECA7EFBF485402DD6941073C60496C77892FAD504B8'),BigNumber.from('0x2D3AF89E62C6CC5BEA0E35CAC1A334D35DC736B38E9AB2D9086568648C25A26F')];
    const submitVoteWithProofTx = await elections.submitVotesWithProof(electionId, yes_vote_ids, no_vote_ids, proof);
    await submitVoteWithProofTx.wait();
    console.log("Submitted a vote proof for the election.")

    // Close the election
    const closeElectionTx = await elections.closeElection(electionId);
    await closeElectionTx.wait();
    console.log("Final election results: ", (await elections.elections(electionId)).result);
  });

  it.only("Correct results with absent voters", async function () {
    const BatRaVot = await ethers.getContractFactory("BatRaVot");
    const elections = await BatRaVot.deploy();

    await elections.deployed();
    console.log("Election Handler deployed to:", elections.address);

    // Start a new election
    let specifiers = [
      [BigNumber.from('0x0741D5A16A49B7F00F0A82DBABC91D89332D8FED0BA1CE33FF40B363224005EA'),BigNumber.from('0x1FC70911C14D984447BC905FE5712ECA1E16D7498C2334A451CD06FAE6BBFD6D')],[[BigNumber.from('0x24A0CD744DA37D3E6FC2472C00E4D0D3EB89F60A622CCC15E7F1D94693574196'),BigNumber.from('0x30400CDC6644DEA03B1135F3059EACD40287549F29426AFA75D6A1666AC1270C')],[BigNumber.from('0x00EF16853D17C2A273A4145BC3B4900101F5EE6A3209C5293C00A91D17CABD52'),BigNumber.from('0x086E34452857BD3C1B9F6CD350E5C4BE64FCC81500F85471811811A468ADC2FD')]],[BigNumber.from('0x27E040376BCFC428695CB121DBC1E0235C2ED4861410F8A1F1936EFC63098835'),BigNumber.from('0x0C6C2104AC3A92E182DAB6D0310525F5211183D9675C5F9D90DB8D274B9D1493')],[[BigNumber.from('0x1B9475177F7F499AE18F442CF8947F04FB8A85EAF16D02E6B03DF857EF05CAD5'),BigNumber.from('0x22DD32B43B417E038BBDA36E35BA29A3B6D4E1E65E47C7A2EB9339D9307E5380')],[BigNumber.from('0x1D4BEE088DADE6BC2BBAEEDFA03137D28BD0C3E4E205BE1D9445E679216F5826'),BigNumber.from('0x11AC5E97E0AC2368243D6D4C4A910880244E9EE6489C024C4E1D44661552C81A')]]
    ];

    let [specifier_yes_g1, specifier_yes_g2, specifier_no_g1, specifier_no_g2] = specifiers;

    const createElectionTx = await elections.createElection("Test Election", specifier_yes_g1, specifier_yes_g2, specifier_no_g1, specifier_no_g2);
    await createElectionTx.wait();
    console.log("New election created successfully!")

    let electionId = 0;
    let election = await elections.elections(electionId);
    console.log("Current election status: ", election.state)

    // Add key to the election census

    let pubKeys = [
      [BigNumber.from('0x2822578AE1615CE8247965AA02F6C2FAE36513EA29698EA0C9469B64A954E4A1'),BigNumber.from('0x25ED314653FA56203584D26E43D0029CAA4B72F49DE5B9FB30991509A08D4A12')],[BigNumber.from('0x16CD6D8C76AE70F08F4AD126CD2B111C6FFF82559D86427FF3169CB0C9A1DDBD'),BigNumber.from('0x2E4F43B816C3DDE0F4AD9E36F80CE7007BF5D8479D663BD53967393CC01359DE')],[BigNumber.from('0x0822F1A3ED8C6D6617FC33B6BBC919C55EA7C953C7D5AC6924EA999EFCCC8E21'),BigNumber.from('0x2D9987D0BF4FB2E3C333419FACF006F419DE4E00D30FF44DA9D5D83CE24527C4')],[BigNumber.from('0x26651274336B4B73D012895C94C34649A0FD235FD230C0950FF179F44C5B5100'),BigNumber.from('0x276E6FC6553929E99F3C5C1861C39BFD3E4ABFC20C2CF6BAD7320AD4860739BB')],[BigNumber.from('0x19380FBBD4272C6FED699C96A01CD7EF1E0DCB792245EC7F64E354CFBF027EC3'),BigNumber.from('0x0871EDF1D8C4ED07F96C4D06986AAA02C96C314E8F92F66799083A6D927E78C4')],[BigNumber.from('0x0171C7D41BD6B84C42FA8D1888E5FCB6CCD3AAF8A68CB6AC3AECEE12C0E6FFF5'),BigNumber.from('0x0C315578EBCB922E6B47DEE5369DD08A7A41397FB9483838FF2708376AA2AB24')],[BigNumber.from('0x0A817A87854EBEDF8E606FABDF07722A1556153AE8FCF2FED15F4D2D0EA20FC9'),BigNumber.from('0x144EE63E3BCF90631A059B214093BC5E826556C0B276CE715640BBA7A667BF83')],[BigNumber.from('0x2742D364CC40422EBC0F399AFAFC9B2CE6EB60BFE975029669BFE3524A55A434'),BigNumber.from('0x2BC21601011FC6EA0678C89F1D2B15C04B29127745D86D23E8E18B4C28A63952')]
    ];

    for (const pubKey of pubKeys) {
      console.log("Registering key: ", pubKey);
      const registerKeyTx = await elections.registerInCensus(pubKey);
      await registerKeyTx.wait();
      console.log("Updated census with a new key.");
    }

    // Submit a proof for the election vote
    let yes_vote_ids = [4, 5]
    let no_vote_ids = [1, 2, 6]
    let proof = [BigNumber.from('0x0B26B053BC995FC5E49266F05344F60801E2A09045817CB8A311AAEDF12A00EB'),BigNumber.from('0x116AD460775EFE509612B8DBCB2FDDBF0D27DBC675C814B99F69137D0C484400')];
    const submitVoteWithProofTx = await elections.submitVotesWithProof(electionId, yes_vote_ids, no_vote_ids, proof);
    await submitVoteWithProofTx.wait();
    console.log("Submitted a vote proof for the election.")

    // Close the election
    const closeElectionTx = await elections.closeElection(electionId);
    await closeElectionTx.wait();
    console.log("Final election results: ", (await elections.elections(electionId)).result);
  });


});
