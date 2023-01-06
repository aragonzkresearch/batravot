use colored::Colorize;
use rand::Rng;
use batravot_lib::representation::SolidityRepresentable;
use batravot_lib::{SchnorrSignature, voter};
use crate::common::get_election_prk;

/// This function generates a Schnorr key proof for the voter to prove that they own the private key
/// It will request the user to provide the election private key
/// It will then generate the Schnorr key proof and print it to the screen
pub(crate) fn generate_schnorr_key_proof(rng: &mut impl Rng) -> Result<(), String> {
    // Describe what the current mode is
    println!("{}", "Generating a Schnorr key proof for the voter".green());

    // Get the election private key of the voter
    let election_prk = get_election_prk(rng)?;
    let election_pbk = voter::generate_public_key(&election_prk);

    // Generate a Schnorr key proof
    let schnorr_key_proof = SchnorrSignature::generate_key_proof(&election_prk, rng);

    // Print out the information of the Schnorr key proof to the user
    println!("\n");
    println!("----------------------------------------");
    println!("Please submit the following data to register your key:");
    println!("Public key:         {}", election_pbk.solidity_repr());
    println!("Schnorr key proof:  {}", schnorr_key_proof.solidity_repr());
    println!("----------------------------------------");

    Ok(())
}