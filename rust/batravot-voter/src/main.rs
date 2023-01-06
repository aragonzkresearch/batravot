use std::{env, process};
use batravot_voter::{ExecutionMode, run};

/// This is the main function that initiates the Voter application
/// If there are any errors in the execution and prints them in error stream
fn main() {

    // Random number generator for the voter
    let mut rng = rand::thread_rng();

    // Read the first argument from the command line
    // This is used to determine the execution mode of the application
    let args: Vec<String> = env::args().collect();
    let mode = if args.len() < 2 {
        eprintln!("Please provide an execution mode. The available modes are:");
        eprintln!("  - {}:    Generate a Vote Ballot", ExecutionMode::GenerateBallot);
        eprintln!("  - {}:    Generate a Schnorr Key Proof", ExecutionMode::GenerateKeyProof);
        eprintln!("  - {}:    Generate specifiers for the Election Id", ExecutionMode::GenerateSpecifiers);
        process::exit(1);
    } else {
        &args[1]
    };

    run(mode, &mut rng).unwrap_or_else(|err| {
        eprintln!("An error occurred: {}", err);
        process::exit(1);
    });
}