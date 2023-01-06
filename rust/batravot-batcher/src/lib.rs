mod ballots;

use batravot_lib::{batcher, Vote};
use batravot_lib::representation::{SolidityRepresentable};
use crate::ballots::proof_check_ballots;

use crate::input::file::read_ballots_from_file;
use crate::input::stdin::{read_ballots_from_stdin, get_election_id};

mod input {
    pub mod stdin;
    pub mod file;
}

/// The main logic function, it selects the correct function based on the command line arguments
pub fn run(input_mode: InputMode) -> Result<(), String> {

    // Clear the screen
    print!("{}[2J", 27 as char);

    // Ask the user to enter the election id
    let election_id = get_election_id()?;

    // Read the ballots from the input sources
    let ballots = match input_mode {
        InputMode::Stdin => read_ballots_from_stdin()?,
        InputMode::File(file_path) => read_ballots_from_file(file_path)?,
    };

    // Check if the ballots are valid, if not, ask the user to decide what to do
    let proof_checked_ballots = proof_check_ballots(election_id, ballots);

    // Generate the batched election proof
    let vote_proofs = proof_checked_ballots.iter().map(|ballot| &ballot.vote_proof).collect();
    let batched_election_proof = batcher::generate_batched_election_proof(&vote_proofs);

    // Generate the list of who voted `For` and `against` the election
    let mut for_voters = Vec::new();
    let mut against_voters = Vec::new();
    for ballot in proof_checked_ballots {
        match ballot.vote {
            Vote::For => for_voters.push(ballot.eth_address),
            Vote::Against => against_voters.push(ballot.eth_address),
        }
    }

    // Print the results
    println!("\n");
    println!("----------------------------------------");
    println!("Please submit the following data to the election verifier:");
    println!("Election Proof:    {}", batched_election_proof.solidity_repr());
    println!("Who voted for:     [{}]", for_voters.iter().map(|x| x.solidity_repr()).collect::<Vec<String>>().join(", "));
    println!("Who voted against: [{}]", against_voters.iter().map(|x| x.solidity_repr()).collect::<Vec<String>>().join(", "));
    println!("----------------------------------------");

    Ok(())
}



/// How the ballots will be provided to the batcher application
/// File - The ballots will be provided in a file
/// Stdin - The ballots will be provided one by one in the standard input
pub enum InputMode {
    File(String),
    Stdin,
}