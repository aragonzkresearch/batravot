// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;

// Import the BN254 library
import "./BN254.sol";
import "./SchnorrKnowledgeProof.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract BatRaVot {

    /** Contains State of the election **/
    enum State { Init, Vote, End }

    /** Vote choice **/
    enum Vote { None, For, Against }


    /**
      * This struct holds the specifiers of the election as both points in G1 and G2.
      *
      * The reason we need G1 is for extra security. It allows us to verify that the
      * G2 specifiers points have been generated correctly. This can be done by because
      * The smart contract can generate the G1 Specifiers itself and then check the G2
      * Specifiers against the G1 Specifiers with the pairing check.
      * We must note that this is very expensive and thus we may be okay with just trusting
      * That the voters will do the pairing check themselves. If that assumption is made,
      * Then we can remove the G1 specifiers and just use the G2 specifiers.
      */
    struct Specifiers {
        BN254.G1 yesG1;
        BN254.G2 yesG2;
        BN254.G1 noG1;
        BN254.G2 noG2;
    }

    /** Stores the result of the election **/
    struct ElectionResult {
        uint256 possibleVotes; // How many votes were possible
        uint256 totalVoters; // How many voters voted
        uint256 yesVoters; // How many voters voted yes
        uint256 totalVotes; // How many weighted votes were cast
        uint256 yesVotes; // How many weighted votes were cast for yes
    }

    /** Stores the metadata of the election **/
    struct Election {
        string topic;
        uint256 electionId;
        mapping (address => Vote) votes; // Which each voter voted for
        Specifiers specifiers;
        State state;
        ElectionResult result;
    }

    Election[] public elections;

    // List of registered voters so that we can iterate over them
    // TODO - This might be done more efficiently by combining the two
    address[] public voters;
    // The mapping between a voter and their public key
    mapping (address => BN254.G1) public census;
    IERC20 public votingToken;

    /**
     * @param _votingToken - The ERC20 token that will be used to vote
     */
    constructor(IERC20 _votingToken) {
        votingToken = _votingToken;
    }

    /**
     * Register a voter public key [G1] in the census
     * To make sure this is a valid voter, we make the voter submit a schnorr signature
     *
     * rawProof - first element is the X coordinate of `t`, second is Y coordinate of `t`, third is value `s`
     *
     * Note that this can be called by anyone once the function was initially called by
     * the owner of the public key. If someone else calls it, they subscribe to the voter
     * Meaning that their tokens will be counted towards the total votes cast in the election
     * Without them needing to actively vote. This is a feature, not a bug.
     * To deregister from the subscription, the voter just needs to register a new public key.
     */
    function registerVoter(uint256[2] memory pubKeyRaw, uint256[3] memory rawProof) external {

        // Convert the raw public key into a BN254.G1 point
        BN254.G1 memory pubKey = BN254.G1(pubKeyRaw[0], pubKeyRaw[1]);
        // Convert the raw key proof into a real key proof
        SchnorrKnowledgeProof.Proof memory keyProof = SchnorrKnowledgeProof.Proof(BN254.G1(rawProof[0], rawProof[1]), rawProof[2]);

        // Check that the pubKey has a corresponding private key
        require(SchnorrKnowledgeProof.verify(pubKey, keyProof), "Invalid Key Proof");
        // This is just a filter to make sure that the voters have token balances
        // THIS IS CUSTOM LOGIC AND CAN BE REPLACED.
        // NOTE: THIS DOES NOT ENSURE THAT ALL VOTER WHEN VOTING HAVE A TOKEN, ONLY FILTERS WHO CAN REGISTER
        require(votingToken.balanceOf(msg.sender) > 0, "You must have voting tokens to register");

        // Add the voter to the list of voters
        voters.push(msg.sender);
        census[msg.sender] = pubKey;
    }


    /**
     * Start a new election
     * The initiator should provide with the specifiers generated from the electionId
     * To prevent mistakes, we explicitly ask the initiator to provide the electionId
     * It used to generate the specifiers, so that other voter could recreate and check
     *
     * The reason we could not generate the specifiers ourselves is because Ethereum does not have G2 point addition
     * TODO - consider the case where the initiator can provide us with the G2 and we check their correctness
     * TODO - by checking pairing of G1 specifier we generate ourselves and the once provided to us
     * TODO - this will also require changing rust to generate specifier using keccak hash function
     */
    function createElection(string calldata topic, uint256[2] memory yesG1SpecifierRaw, uint256[4] memory yesG2SpecifierRaw, uint256[2] memory noG1SpecifierRaw, uint256[4] memory noG2SpecifierRaw) public returns (uint256) {

        // Convert the raw specifiers into BN254.G1 and BN254.G2 points
        BN254.G1 memory yesG1Specifier = BN254.G1(yesG1SpecifierRaw[0], yesG1SpecifierRaw[1]);
        BN254.G2 memory yesG2Specifier = BN254.G2([yesG2SpecifierRaw[0], yesG2SpecifierRaw[1]], [yesG2SpecifierRaw[2], yesG2SpecifierRaw[3]]);
        BN254.G1 memory noG1Specifier = BN254.G1(noG1SpecifierRaw[0], noG1SpecifierRaw[1]);
        BN254.G2 memory noG2Specifier = BN254.G2([noG2SpecifierRaw[0], noG2SpecifierRaw[1]], [noG2SpecifierRaw[2], noG2SpecifierRaw[3]]);

        // Generate a new election
        Specifiers memory specifiers = Specifiers(yesG1Specifier, yesG2Specifier, noG1Specifier, noG2Specifier);
        // Add election to all elections
        Election storage newElection = elections.push();
        uint256 electionId = elections.length - 1;
        newElection.topic = topic;
        newElection.electionId = electionId;
        newElection.specifiers = specifiers;
        newElection.state = State.Init;
        // Change state of the next election to Vote
        // This could be delayed and done after some period of time
        elections[electionId].state = State.Vote;
        // Increment the nextElectionId as we have initiated a new election
        return electionId;
    }

    /**
     * Get specifiers for a running election. Through an error if the election is not running or does not exist.
     */
    function getG1Specifiers(uint256 electionId) public view returns (BN254.G1 memory, BN254.G1 memory){
        require(electionId < elections.length, "Requesting specifiers for election that does not yet exist");
        Election storage election = elections[electionId];
        require(election.state == State.Vote, "Requesting specifiers for election that is not active");
        return (election.specifiers.yesG1, election.specifiers.noG1);
    }


    /**
     * Function that allows to submit votes for a running election. The function needs a list of addresses who voted
     * how and the proof that the votes are valid. This function can be called by anyone, even the voter themselves.
     * The function requires at least one vote to be submitted.
     * TODO - consider providing alternative function that instead of addresses takes indexes, to have alternatives
     */
    function submitVotesWithProof(uint256 electionId, address[] calldata votersFor, address[] calldata votersAgainst, uint256[2] memory electionProofRaw) public {
        // Convert the raw election proof into a BN254.G1 point
        BN254.G1 memory electionProof = BN254.G1(electionProofRaw[0], electionProofRaw[1]);

        require(electionId < elections.length, "Requesting specifiers for election that does not yet exist");
        Election storage election = elections[electionId];
        require(election.state == State.Vote, "Providing proof for election that is not active");
        require(votersFor.length > 0 || votersAgainst.length > 0, "Can not submit a proof for no voters");

        BN254.G1 memory inFavourKeySum;
        address voterId;
        // Sum together all keys of voter who voted For
        // If no voters against, we will not use this value
        if (votersFor.length != 0) {
            require(census[votersFor[0]].X != 0, "Voter does not exist");
            inFavourKeySum = census[votersFor[0]];
            for (uint256 i = 1; i < votersFor.length; i++) {
                voterId = votersFor[i];
                inFavourKeySum = BN254.pointAdd(inFavourKeySum, census[voterId]);
            }
        }


        // If no voters against, we will not use this value
        BN254.G1 memory againstKeySum;
        // Sum together all keys of voter who voted For
        if (votersAgainst.length != 0) {
            require(census[votersAgainst[0]].X != 0, "Voter does not exist");
            againstKeySum = census[votersAgainst[0]];
            for (uint256 i = 1; i < votersAgainst.length; i++) {
                voterId = votersAgainst[i];
                againstKeySum = BN254.pointAdd(againstKeySum, census[voterId]);
            }
        }


        if (votersFor.length != 0 && votersAgainst.length != 0) {
            // We do a proof of:
            // e(proof, -P2)*e(againstKeySum,againstSpecifier)*e(inFavourKeySum,forSpecifier)=1
            BN254.G1[] memory a = new BN254.G1[](3);
            BN254.G2[] memory b = new BN254.G2[](3);

            a[0]=electionProof;
            a[1]=againstKeySum;
            a[2]=inFavourKeySum;
            b[0]= BN254.P2Neg();
            b[1]=election.specifiers.noG2;
            b[2]=election.specifiers.yesG2;

            // If the pairing is correct, we have
            require(BN254.pairing(a,b), "Verification check did not pass");
        } else {
            // As we have all votes for or all votes against, we need only two pairings
            BN254.G1[] memory a = new BN254.G1[](2);
            BN254.G2[] memory b = new BN254.G2[](2);

            a[0]=electionProof;
            b[0]= BN254.P2Neg();


            // Pairing depends on if votes are For or Against
            if (votersFor.length == 0) {
                a[1]=againstKeySum;
                b[1]=election.specifiers.noG2;
            } else {
                a[1]=inFavourKeySum;
                b[1]=election.specifiers.yesG2;
            }

            require(BN254.pairing(a,b), "Verification check did not pass");
        }


        // Update the vote result with the information provided
        for (uint256 i = 0; i < votersAgainst.length; i++) {
            voterId = votersAgainst[i];
            election.votes[voterId] = Vote.Against;
        }
        for (uint256 i = 0; i < votersFor.length; i++) {
            voterId = votersFor[i];
            election.votes[voterId] = Vote.For;
        }
    }

    /**
     * End an ongoing election and stop accepting new votes as well as proofs for new results
     */
    function closeElection(uint256 electionId) public {
        require(electionId < elections.length, "The election does not yet exist");
        require(elections[electionId].state == State.Vote, "The election must be in Vote state");
        // Change state of the election to End
        elections[electionId].state = State.End;

        uint256 yesVoters = 0;
        uint256 noVoters = 0;
        uint256 yesVotes = 0;
        uint256 noVotes = 0;

        // Calculate how everyone has voted and sum up the results to get the final results
        // This is the point when we count all the votes based on the amount of tokens each voter has
        // As this function is called only once, we can not have a double vote attack
        // TODO - make sure that the this function must be called at least one block after the last vote is submitted
        // TODO - this will prevent the flash loan attack. One can also specify a trusted party to call this function
        // TODO - consider changing the loop to something else else this is not gas efficient
        for (uint256 i = 0; i < voters.length; i++) {
            address voterId = voters[i];

            if (elections[electionId].votes[voterId] == Vote.For) {
                yesVotes += votingToken.balanceOf(voterId);
                yesVoters++;

            }

            if (elections[electionId].votes[voterId] == Vote.Against) {
                noVotes += votingToken.balanceOf(voterId);
                noVoters++;
            }
        }

        // Update the vote results in the election
        elections[electionId].result = ElectionResult(
            votingToken.totalSupply(),
            yesVoters + noVoters,
            yesVoters,
            yesVotes + noVotes,
            yesVotes
        );

    }

}