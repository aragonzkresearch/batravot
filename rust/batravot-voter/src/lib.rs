use std::{io, process};
use rand::Rng;
use batravot_lib::{ElectionSpecifiers, ScalarField, Vote, voter};
use batravot_lib::representation::SolidityRepresentable;
use colored::Colorize;

/// The main logic function.
/// It will request the user to provide the data and then will generate the data
pub fn run(rng: &mut impl Rng) -> Result<(), String> {

    // Clean the screen
    println!("\n\n");

    // Get the election private key of the voter and convert it to a scalar field
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
        Vote::For => &specifiers.yes.0,
        Vote::Against => &specifiers.no.0,
    };
    let vote_proof = voter::generate_vote_proof(&election_prk, &vote_specifier);


    // Print the ballot information
    println!("\n");
    println!("Please send the following data to the election batcher:");
    println!("Public key: {}", election_pbk.solidity_repr());
    println!("Vote proof: {}", vote_proof.solidity_repr());
    println!("Vote:       {:?}", vote);

    Ok(())
}

/// This function asks the user to select how they want to vote
/// The user can choose between `for` or `against`, case insensitive.
/// Function can also accept `+` as `for` and `-` as `against`
/// It will return the vote as a `Vote` enum
fn get_vote() -> Result<Vote, String> {

    // Ask the user to select how they want to vote
    println!("How do you want to vote?");
    println!("[+] For");
    println!("[-] Against");
    loop {
        let mut vote = String::new();
        io::stdin().read_line(&mut vote)
            .map_err(|err| format!("Error reading vote choice: {}", err))?;

        // Convert the vote to lowercase
        let vote = vote.to_lowercase();

        // Check if the vote is yes or no
        return Ok(if vote.contains("for") || vote.contains("+") {
            Vote::For
        } else if vote.contains("against") || vote.contains("-") {
            Vote::Against
        } else {
            eprintln!("{}", "Invalid vote choice. Please try again".red());
            continue;
        });
    }

}


/// This function asks the user to provide the election id
/// It will return the election id as a string
/// If there is an error in the input, it will return an error
/// Note that we consider reading errors a fatal error and will exit the program
/// At the same time, we consider parsing errors as non-fatal and will ask the user to provide a valid data
fn get_election_id() -> Result<u64, String> {

    println!("Please provide the election id:");

    loop {

        let mut election_id = String::new();

        io::stdin()
            .read_line(&mut election_id)
            .map_err(|err| format!("Error reading election id: {}", err))?;

        let election_id = election_id.trim();

        // Convert election id to u64
        let election_id = match election_id.parse::<u64>() {
            Ok(election_id) => election_id,
            Err(err) => {
                eprintln!("{}", format!("There was an error parsing election id: {}.\nPlease provide a valid election id", err).red());
                continue;
            }
        };

        return Ok(election_id);
    }

}

/// This function asks the user to select the private key to use for the election
/// In case the user has not yet generated a private key, it will generate one
/// Alternatively, the user can provide a private key in hex format
/// Note that we consider reading errors a fatal error and will exit the program
/// At the same time, we consider parsing errors as non-fatal and will ask the user to provide a valid data
fn get_election_prk(rng: &mut impl Rng) -> Result<ScalarField, String> {


    loop {
        println!("Do you want to use the preexisting or generate a new election private key?");
        println!("1 - Use a preexisting election private key");
        println!("2 - Generate a new election private key");
        println!("3 - Exit");
        let mut choice = String::new();
        io::stdin().read_line(&mut choice)
            .map_err(|err| format!("Failed to read selected option for election private key: {}", err))?;

        let election_private_key = match choice.trim() {
            "1" => {
                println!("Please provide the preexisting election private key:");
                println!("And example of a valid election private key is: 0x0000000000000000000000000000000000000000000000000000000000000001");
                let mut raw_election_private_key = String::new();
                io::stdin().read_line(&mut raw_election_private_key)
                    .map_err(|err| format!("Failed to read election private key: {}", err))?;

                // First, we remove the 0x prefix if it exists and any whitespace
                let cleaned_election_private_key = raw_election_private_key.trim().replace("0x", "");
                // Then, we convert the hex string to a byte array
                let election_private_key = match hex::decode(cleaned_election_private_key) {
                    Ok(election_private_key) => election_private_key,
                    Err(err) => {
                        eprintln!("{}", format!("Failed to decode election private key: {}.\nPlease provide a valid election private key", err).red());
                        continue;
                    }
                };

                if election_private_key.len() != 32 {
                    eprintln!("{}", format!("The election private key must be 32 bytes long. Provided key is {} bytes long.\nPlease provide a valid election private key", election_private_key.len()).red());
                    continue;
                }
                election_private_key
            }
            "2" => {
                let mut election_private_key = [0; 32];
                rng.fill_bytes(&mut election_private_key);
                println!("Generated a private key: 0x{}", hex::encode(election_private_key));

                election_private_key.to_vec()
            }
            "3" => {
                eprintln!("{}", "Exiting...".red());
                process::exit(0);
            }
            _ => {
                eprintln!("{}", "Invalid choice. Please try again.".red());
                continue;
            }
        };

        return Ok(voter::convert_private_key(&election_private_key));
    }
}