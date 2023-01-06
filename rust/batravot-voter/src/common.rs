use std::{io, process};
use colored::Colorize;
use rand::{Rng};
use batravot_lib::{ScalarField, voter};

/// This function asks the user to select the private key to use for the election
/// In case the user has not yet generated a private key, it will generate one
/// Alternatively, the user can provide a private key in hex format
/// Note that we consider reading errors a fatal error and will exit the program
/// At the same time, we consider parsing errors as non-fatal and will ask the user to provide a valid data
/// We use rng to generate the private key if the user does not provide one
pub(crate) fn get_election_prk(rng: &mut impl Rng) -> Result<ScalarField, String> {


    loop {
        println!("\nDo you want to use the preexisting or generate a new election private key?");
        println!("1 - Use a preexisting election private key");
        println!("2 - Generate a new election private key");
        println!("3 - Exit");
        let mut choice = String::new();
        io::stdin().read_line(&mut choice)
            .map_err(|err| format!("Failed to read selected option for election private key: {}", err))?;

        let election_private_key = match choice.trim() {
            "1" => {
                println!("\nPlease provide the preexisting election private key:");
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

/// This function asks the user to provide the election id
/// It will return the election id as a string
/// If there is an error in the input, it will return an error
/// Note that we consider reading errors a fatal error and will exit the program
/// At the same time, we consider parsing errors as non-fatal and will ask the user to provide a valid data
pub(crate) fn get_election_id() -> Result<u64, String> {

    println!("\nPlease provide the election id:");

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
                eprintln!("{}", format!("There was an error parsing the Election Id: {}.\nPlease provide a valid election id", err).red());
                continue;
            }
        };

        return Ok(election_id);
    }

}