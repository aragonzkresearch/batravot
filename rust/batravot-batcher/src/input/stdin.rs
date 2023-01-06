use std::io;
use std::str::FromStr;
use colored::Colorize;
use web3::types::Address;
use batravot_lib::{G1, Vote};
use batravot_lib::representation::FromStrCustom;
use crate::ballots::Ballot;

/// The function that reads the ballots from the standard input
/// It prompts the user to enter the ballot information one by one
/// And then it returns a vector of ballots
pub(crate) fn read_ballots_from_stdin() -> Result<Vec<Ballot>, String> {
    // Describe the current mode
    println!("{}", "\nReading ballots from the standard input".green());

    let mut ballots = Vec::new();

    println!("Enter the ballots one by one. You will be prompted to enter the ballot information.");
    // Read the ballots from the standard input
    loop {
        let public_key = read_public_key()
            .map_err(|err| format!("Error reading public key: {}", err))?;

        let vote = read_vote()
            .map_err(|err| format!("Error reading vote: {}", err))?;


        let vote_proof = read_vote_proof()
            .map_err(|err| format!("Error reading vote proof: {}", err))?;

        let eth_address = read_eth_address()
            .map_err(|err| format!("Error reading address: {}", err))?;

        let ballot = Ballot {
            voter_public_key: public_key,
            vote,
            vote_proof,
            eth_address
        };

        // Add the ballot to the vector
        ballots.push(ballot);

        // Check if the user has finished entering the ballots
        println!("\nDo you want to enter another ballot? (y/n)");
        let mut choice = String::new();
        io::stdin().read_line(&mut choice)
            .map_err(|err| format!("Failed to read selected choice: {}", err))?;
        if choice.to_lowercase().contains("n") {
            break;
        }
    }

    println!("\nFinished reading ballots from the standard input");
    Ok(ballots)
}


/// This function reads the Ethereum address of the voter from the standard input
/// If there is an error at parsing the public key, it will ask the user to try again
fn read_eth_address() -> Result<Address, String> {
    println!("\nEnter the Ethereum Address of the voter:");
    loop {
        let mut ethereum_address_str = String::new();
        io::stdin().read_line(&mut ethereum_address_str)
            .map_err(|err| format!("Error reading the Ethereum address: {}", err))?;

        let ethereum_address = match Address::from_str(&ethereum_address_str) {
            Ok(address) => address,
            Err(err) => {
                eprintln!("{}", format!("There was an error parsing the Ethereum Address: {}.\nPlease try again.", err).red());

                continue;
            }
        };

        return Ok(ethereum_address);
    }
}

/// The function that reads a public key from the standard input
/// If there is an error at parsing the public key, it will ask the user to try again
fn read_public_key() -> Result<G1, String>{

    println!("\nEnter the public key of the ballot:");
    loop {
        // Read the next line from the standard input and try to parse it as a G1 element
        let mut public_key_str = String::new();
        io::stdin().read_line(&mut public_key_str)
            .map_err(|err| format!("Error reading the Public Key: {}", err))?;

        let public_key = match G1::from_str_c(&public_key_str) {
            Ok(public_key) => public_key,
            Err(err) => {
                eprintln!("{}", format!("There was an error parsing the Public Key: {}.\nPlease try again.", err).red());
                continue;
            }
        };

        return Ok(public_key);
    }
}

/// The function that reads a vote from the standard input
/// If there is an error at parsing the vote, it will ask the user to try again
/// Vote is represented by a `+` or `-` sign or by `again` or `for` words (case insensitive)
fn read_vote() -> Result<Vote, String>{

    println!("\nEnter the vote of the ballot:");
    println!("[+] For");
    println!("[-] against");
    loop {
        // Read the next line from the standard input and try to parse it as a vote
        let mut vote_str = String::new();
        io::stdin().read_line(&mut vote_str)
            .map_err(|err| format!("Error reading the Vote: {}", err))?;

        let vote = match Vote::from_str(&vote_str.trim()) {
            Ok(vote) => vote,
            Err(err) => {
                eprintln!("{}", format!("There was an error parsing the Vote: {}.\nPlease try again.", err).red());
                continue;
            }
        };

        return Ok(vote);
    }
}


/// The function that reads the vote proof from the standard input
/// If there is an error at parsing the vote proof, it will ask the user to try again
fn read_vote_proof() -> Result<G1, String>{

    println!("\nEnter the proof of the ballot:");
    loop {
        // Read the next line from the standard input and try to parse it as a G1 element
        let mut vote_proof_str = String::new();
        io::stdin().read_line(&mut vote_proof_str)
            .map_err(|err| format!("Error reading the Vote Proof: {}", err))?;

        let vote_proof = match G1::from_str_c(&vote_proof_str) {
            Ok(vote_proof) => vote_proof,
            Err(err) => {
                eprintln!("{}", format!("There was an error parsing the Vote Proof: {}.\nPlease try again.", err).red());
                continue;
            }
        };

        return Ok(vote_proof);
    }
}


/// This function asks the user to provide the election id
/// It will return the election id as a string
/// If there is an error in the input, it will return an error
/// Note that we consider reading errors a fatal error and will exit the program
/// At the same time, we consider parsing errors as non-fatal and will ask the user to provide a valid data
pub(crate) fn get_election_id() -> Result<u64, String> {

    println!("\nPlease provide the Election Id:");

    loop {

        let mut election_id = String::new();

        io::stdin()
            .read_line(&mut election_id)
            .map_err(|err| format!("Error reading the Election Id: {}", err))?;

        let election_id = election_id.trim();

        // Convert election id to u64
        let election_id = match election_id.parse::<u64>() {
            Ok(election_id) => election_id,
            Err(err) => {
                eprintln!("{}", format!("There was an error parsing the Election Id: {}.\nPlease try again.", err).red());
                continue;
            }
        };

        return Ok(election_id);
    }

}