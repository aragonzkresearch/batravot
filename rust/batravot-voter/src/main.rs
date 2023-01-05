use std::process;
use batravot_voter::run;

/// This is the main function that initiates the Voter application
/// If there are any errors in the execution and prints them in error stream
fn main() {

    // Random number generator for the voter
    let mut rng = rand::thread_rng();

    run(&mut rng).unwrap_or_else(|err| {
        eprintln!("An error occurred: {}", err);
        process::exit(1);
    });
}