// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;

// Import the BN254 library
import "./BN254.sol";
import "./SchnorrKnowledgeProof.sol";

contract MultiSigBatRaVot {

    /** Contains State of the election **/
    enum State { Pending, Failed, Passed }

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
        // We do not need the No Specifiers as we only care about the For votes
    }


    /** Stores the metadata of the election **/
    struct Election {
        uint256 threshold; // Number of votes needed to pass the election
        string topic;
        mapping (address => bool) votes; // If the voter has voted (we only care about the For votes)
        uint256 forVotes; // Number of For votes so far
        Specifiers specifiers;
        State state; // Current state of the election,  pending is the default state
    }

    mapping (uint256 => Election) public elections;
    uint256 public electionCount; // Number of elections created, initialized to 0

    // List of registered voters so that we can iterate over them
    // TODO - This might be done more efficiently by combining the two
    address[] public voters;
    // The mapping between a voter and their public key
    // We have used an address, but this can be changed to a uint
    mapping (address => BN254.G1) public census;

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
    function createElection(string calldata topic, uint256 threshold, uint256[2] memory yesG1SpecifierRaw, uint256[4] memory yesG2SpecifierRaw) public returns (uint256) {


        // Generate a new election
        // Add election to all elections
        uint256 electionId = electionCount;

        elections[electionId].topic = topic;
        elections[electionId].threshold = threshold;

        elections[electionId].specifiers.yesG1.X = yesG1SpecifierRaw[0];
        elections[electionId].specifiers.yesG1.Y = yesG1SpecifierRaw[1];
        elections[electionId].specifiers.yesG2.X[0] = yesG2SpecifierRaw[0];
        elections[electionId].specifiers.yesG2.X[1] = yesG2SpecifierRaw[1];
        elections[electionId].specifiers.yesG2.Y[0] = yesG2SpecifierRaw[2];
        elections[electionId].specifiers.yesG2.Y[1] = yesG2SpecifierRaw[3];
        // Note that the state is set to pending by default

        // Increment the election count
        electionCount++;
        return electionId;
    }

    /**
     * Get specifiers for a running election. Through an error if the election is not running or does not exist.
     */
    function getG1Specifiers(uint256 electionId) public view returns (BN254.G1 memory){
        require(electionId < electionCount, "Requesting specifiers for election that does not yet exist");
        Election storage election = elections[electionId];
        require(election.state == State.Pending, "Requesting specifiers for election that is not active");
        return election.specifiers.yesG1;
    }


    /**
     * Function that allows to submit votes for a running election. The function needs a list of addresses who voted
     * how and the proof that the votes are valid. This function can be called by anyone, even the voter themselves.
     * The function requires at least one vote to be submitted.
     * TODO - consider providing alternative function that instead of addresses takes indexes, to have alternatives
     */
    function submitVotesWithProof(uint256 electionId, address[] calldata votersFor, uint256[2] memory electionProofRaw) public {
        // Convert the raw election proof into a BN254.G1 point
        BN254.G1 memory electionProof = BN254.G1(electionProofRaw[0], electionProofRaw[1]);

        require(electionId < electionCount, "Requesting specifiers for election that does not yet exist");
        Election storage election = elections[electionId];
        require(election.state == State.Pending, "Providing proof for election that is not active");
        require(votersFor.length > 0, "Can not submit a proof for no voters");

        BN254.G1 memory inFavourKeySum;
        address voterId;
        // Sum together all keys of voter who voted For
        require(census[votersFor[0]].X != 0, "Voter does not exist");
        inFavourKeySum = census[votersFor[0]];
        for (uint256 i = 1; i < votersFor.length; i++) {
            voterId = votersFor[i];
            inFavourKeySum = BN254.pointAdd(inFavourKeySum, census[voterId]);
        }



        // As we have all votes for, we need only two pairings
        BN254.G1[] memory a = new BN254.G1[](2);
        BN254.G2[] memory b = new BN254.G2[](2);

        a[0]=electionProof;
        b[0]= BN254.P2Neg();

        a[1]=inFavourKeySum;
        b[1]=election.specifiers.yesG2;

        require(BN254.pairing(a,b), "Verification check did not pass");

        // At this point we know that the proof is valid and we can update the state of the election


        // First, if the amount of voters in the proof is equal or greater than the threshold, we can set the state of the election to Passed
        // This is the cheapest and we even ignore updating the state of the voters as this is not needed
        if (votersFor.length >= election.threshold) {
            election.state = State.Passed;
            // And finish execution
            return;
        }

        // Now, we calculate if perhaps the amount of votes for is greater or equal to the threshold
        // Including the people who voted before
        uint256 forVotes = election.forVotes;
        for (uint256 i = 0; i < votersFor.length; i++) {
            voterId = votersFor[i];
            if (!election.votes[voterId]) {
                forVotes++; // Increment the amount of votes for
            }

            if (forVotes >= election.threshold) {
                // If the amount of votes for is greater or equal to the threshold, we can set the state of the election to Passed
                election.state = State.Passed;
                // And finish execution
                return;
            }
        }

        // If this is not the case, we need to update the state of the election to represent who has voted and how
        election.forVotes = forVotes;
        for (uint256 i = 0; i < votersFor.length; i++) {
            voterId = votersFor[i];
            election.votes[voterId] = true;
        }

    }

    /**
     * End an ongoing election and stop accepting new votes as well as proofs for new results
     */
    function closeElection(uint256 electionId) public {
        require(electionId < electionCount, "The election does not yet exist");
        require(elections[electionId].state == State.Pending, "The election must be in Pending state");
        // Change state of the election to Failed
        // This is because if we had received a proof, the state would have been changed to Passed
        // And there would be no need to call this function
        elections[electionId].state = State.Failed;
    }

}