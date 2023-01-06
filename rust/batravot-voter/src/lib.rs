use std::{fmt};
use rand::Rng;

mod generate_ballot;
mod generate_schnorr;
mod verify_specifiers;
mod common;

use generate_schnorr::generate_schnorr_key_proof;
use generate_ballot::generate_ballot;
use verify_specifiers::verify_specifiers;

/// The main logic function, it selects the correct function based on the command line arguments
pub fn run(mode: &String, rng: &mut impl Rng) -> Result<(), String> {

    let mode = ExecutionMode::from_str(mode)?;
    match mode {
        ExecutionMode::GenerateBallot => {
            generate_ballot(rng)
        },
        ExecutionMode::GenerateKeyProof => {
            generate_schnorr_key_proof(rng)
        },
        ExecutionMode::VerifySpecifiers => {
            verify_specifiers()
        },
    }

}



/// Execution mode of the voter application
/// This is used to determine what the user wants to do
/// The default is to generate a vote ballot
/// Another generates a Schnorr key proof to verify that they own the private key
/// Another verifies that the election specifiers are correct
pub enum ExecutionMode {
    GenerateBallot,
    GenerateKeyProof,
    VerifySpecifiers,
}

impl fmt::Display for ExecutionMode {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        let str = match self {
            ExecutionMode::GenerateBallot => "vote",
            ExecutionMode::GenerateKeyProof => "key",
            ExecutionMode::VerifySpecifiers => "spec",
        };
        write!(f, "{}", str)
    }
}

impl ExecutionMode {
    /// Convert a string to an execution mode
    /// This is used to parse the first argument of the command line
    pub fn from_str(s: &str) -> Result<ExecutionMode, String> {
        if s == ExecutionMode::GenerateBallot.to_string() {
            Ok(ExecutionMode::GenerateBallot)
        } else if s == ExecutionMode::GenerateKeyProof.to_string() {
            Ok(ExecutionMode::GenerateKeyProof)
        } else if s == ExecutionMode::VerifySpecifiers.to_string() {
            Ok(ExecutionMode::VerifySpecifiers)
        } else {
            Err(format!("The execution mode {} is not supported", s))
        }
    }
}
