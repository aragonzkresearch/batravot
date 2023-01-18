use ark_ff::BigInteger256;
use colored::Colorize;
use batravot_lib::ElectionSpecifiers;
use batravot_lib::representation::{SolidityRepresentable};
use crate::common::get_election_id;

/// This function verifies that the election specifiers are correct by comparing them to the ones in the blockchain
/// It will request the user to provide the election specifiers and the election id
/// It will then use the election id to regenerate the election specifiers and compare them to the ones provided by the user
/// If they are the same, then the election specifiers are correct
/// If they are different, then the election specifiers are incorrect and there is a possible attack on the election
pub(crate) fn generate_specifiers() -> Result<(), String> {
    // Describe what the current mode is
    println!("{}", "Generating the election specifiers".green());

    // Read the election id from the standard input
    let election_id = get_election_id()
        .map_err(|err| format!("Error reading election id: {}", err))?;

    // Generate the election specifiers
    let election_specifiers = ElectionSpecifiers::new(BigInteger256::from(election_id));

    // Print the election specifiers
    println!("\n");
    println!("----------------------------------------");
    println!("Election specifiers For.G1:     {}", election_specifiers.forr.0.solidity_repr());
    println!("Election specifiers For.G2:     {}", election_specifiers.forr.1.solidity_repr());
    println!("Election specifiers Against.G1: {}", election_specifiers.against.0.solidity_repr());
    println!("Election specifiers Against.G2: {}", election_specifiers.against.1.solidity_repr());
    println!("----------------------------------------");

    Ok(())
}
