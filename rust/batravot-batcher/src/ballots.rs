use std::str::{FromStr, Split};
use web3::types::Address;
use batravot_lib::{ElectionSpecifiers, G1, verifier, Vote};
use batravot_lib::representation::{FromStrCustom, SolidityRepresentable};
use colored::Colorize;

pub(crate) fn proof_check_ballots(election_id: u64, ballots: Vec<Ballot>) -> Vec<Ballot> {
// Check if the proofs of the ballots are valid
    // First, we generate the election specifiers from the election id
    let election_specifiers = ElectionSpecifiers::from(election_id);
    // Then, we validate each vote proof in order to be sure that the vote is valid
    // If the vote proof is not valid, we ask the user what to do with the ballot
    let checked_ballots : Vec<Ballot> = ballots.into_iter().enumerate().filter(|(i, ballot)| {
        // Check if the vote proof is valid
        let proof_is_correct = match ballot.vote {
            Vote::For => verifier::validate_election_proof(&vec!(&ballot.voter_public_key), &Vec::new(), &ballot.vote_proof, &election_specifiers),
            Vote::Against => verifier::validate_election_proof(&Vec::new(), &vec!(&ballot.voter_public_key), &ballot.vote_proof, &election_specifiers),
        };

        // In case the vote proof is not valid, ask the user what to do with the ballot
        let keep = if !proof_is_correct {
            eprintln!("{}", format!("\nThe Vote Proof of the #{} ballot with Address {} is not valid", i + 1, ballot.eth_address.solidity_repr()).red());
            // Ask whether the user wants to continue, remove the ballot, or exit the program
            println!("What do you want to do? (k)eep the ballot, (r)emove the ballot, (e)xit");
            let mut choice = String::new();
            std::io::stdin().read_line(&mut choice)
                .unwrap_or_else( |_| {eprintln!("{}", "Failed to read selected choice. Will remove by default.".red()); 0});
            if choice.to_lowercase().contains("k") {
                // Keep
                println!("The ballot will be included");
                true // The ballot will be included

            } else if choice.to_lowercase().contains("e") {
                // Exit the program
                println!("The program will exit");
                std::process::exit(0);
                // We don't need to return anything here, because the program will exit
            } else {
                // Remove the ballot
                println!("The ballot will be removed");
                false // The ballot will be removed
            }
        } else {
            // The vote proof is valid, so we keep the ballot
            true
        };

        keep
    }).map(|(_, ballot)| ballot).collect();


    checked_ballots
}

/// This struct represents a ballot
/// public_key - The public key of the voter
/// vote - The vote of the voter
/// vote_proof - The proof of the vote
pub struct Ballot {
    pub voter_public_key: G1,
    pub vote: Vote,
    pub vote_proof: G1,
    pub eth_address: Address
}

impl Ballot {
    /// This function parses a ballot from a set of strings
    /// public_key - The public key of the voter, in format `x,y`, with both `x` and `y` in hex format with 0x prefix
    /// vote - The vote of the voter, is either 0 (for `against`) or 1 (for `For`)
    /// vote_proof - The proof of the vote, in format `x,y`, with both `x` and `y` in hex format with 0x prefix
    /// It returns an error if the strings are not valid
    /// Otherwise, it returns the ballot
    pub(crate) fn from_iter(mut iter: Split<&str>) -> Result<Ballot, String> {

        // Parse the public key
        let public_key_str = iter.next()
            .ok_or("Error reading the public key")?;
        let public_key = G1::from_str_c(public_key_str)
            .map_err(|err| format!("Error parsing the public key: {}", err))?;

        // Parse the vote
        let vote_str = iter.next()
            .ok_or("Error reading the vote")?;
        let vote = Vote::from_str(vote_str)
            .map_err(|err| format!("Error parsing the vote: {}", err))?;

        // Parse the vote proof
        let vote_proof_str = iter.next()
            .ok_or("Error reading the vote proof")?;
        let vote_proof = G1::from_str_c(vote_proof_str)
            .map_err(|err| format!("Error parsing the vote proof: {}", err))?;

        // Parse the address
        let address_str = iter.next()
            .ok_or("Error reading the address")?;
        let address = Address::from_str_c(address_str)
            .map_err(|err| format!("Error parsing the vote proof: {}", err))?;

        // Check that there are no more elements
        if iter.next().is_some() {
            return Err("There are more elements than expected".to_string());
        }

        Ok(Ballot {
            voter_public_key: public_key,
            vote,
            vote_proof,
            eth_address: address
        })
    }
}
