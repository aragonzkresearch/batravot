use colored::Colorize;
use rand::Rng;
use batravot_lib::{ElectionSpecifiers, Vote, voter};
use batravot_lib::representation::SolidityRepresentable;
use crate::common::{get_election_id, get_election_prk};

/// This function generates a ballot for the voter
/// It will request the user to provide the election ID, the election private key, and the vote
/// It will then generate the ballot and print it to the screen
pub(crate) fn generate_ballot(rng: &mut impl Rng) -> Result<(), String> {
    // Describe what the current mode is
    println!("{}", "Generating a ballot for the voter".green());

    // Get the election private key of the voter
    let election_prk = get_election_prk(rng)?;
    let election_pbk = voter::generate_public_key(&election_prk);

    // Get the election id in which the voter wants to vote
    // This is used to generate the election specifiers to then generate the vote proof
    // The election id can be any 256 bit number, however, we limit it to a 64 bit number here
    // This should be sufficient for most use cases as it allows for 2^64 elections
    let election_id = get_election_id()?;
    let specifiers = ElectionSpecifiers::from(election_id);

    // Ask the user how they want to vote
    let vote = get_vote()?;

    // Generate a proof of the vote
    let vote_specifier = match vote {
        Vote::For => &specifiers.forr.0,
        Vote::Against => &specifiers.against.0,
    };
    let vote_proof = voter::generate_vote_proof(&election_prk, &vote_specifier);

    // Print out the information of the ballot to the user
    // If the users does not trust the batcher, they can submit the proof directly to the verifier
    // This is possible because the proof of election with one vote is the the same as the proof of the vote
    // However, this is not recommended as this makes it a lot more expensive to vote
    // The idea of the protocol is still rather that the batcher can reduce the gas cost of a single vote
    println!("\n");
    println!("----------------------------------------");
    println!("Please submit the following data to the election batcher/verifier:");
    println!("Election ID: {}", election_id);
    println!("Vote:        {:?}", vote);
    println!("Public key:  {}", election_pbk.solidity_repr());
    println!("Vote Proof:  {}", vote_proof.solidity_repr());
    println!("----------------------------------------");

    Ok(())
}


/// This function asks the user to select how they want to vote
/// The user can choose between `for` or `against`, case insensitive.
/// Function can also accept `+` as `for` and `-` as `against`
/// It will return the vote as a `Vote` enum
fn get_vote() -> Result<Vote, String> {

    // As we are in the MultiSig mode, we only support For votes
    println!("Treating all votes as `For [+]` votes due to MultiSig mode");
    println!("If you want to vote `Against [-]`, please do generate the ballot as `Not Voting` = `Against [-]`");

    Ok(Vote::For)
}