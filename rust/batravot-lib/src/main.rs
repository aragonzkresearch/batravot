use std::fs::File;
use std::io;
use std::io::{BufWriter, stdout, Write};
use std::path::Path;
use ark_ff::{BigInteger256};
use ark_std::rand::Rng;
use ark_std::{UniformRand};
use ark_std::rand::prelude::StdRng;
use secp256k1::{PublicKey, Secp256k1, SecretKey};
use sha3::{Keccak256, Digest};
use web3::types::{Address, H160};
use batravot_lib;
use batravot_lib::{G1, ScalarField, SchnorrKnowledgeProof, representation::JavaScriptRepresentable, Vote, ElectionSpecifiers};
use batravot_lib::batcher::generate_batched_election_proof;
use batravot_lib::representation::{Representable, RepresentationConfig};
use batravot_lib::verifier::validate_election_proof;
use batravot_lib::voter::{generate_public_key, generate_vote_proof};


struct Voter {
    prk: ScalarField,
    pbk: G1,
    vote: Vote,
    key_proof: SchnorrKnowledgeProof,
    vote_proof: G1,
    tokens: u32,
    eth_address: Address,
    eth_private_key: SecretKey,
}


fn main() {

    // Randomness we will use in our simulation
    let mut rng = ark_std::test_rng();
    
    // If there is a --solidity flag, we will print in a solidity format
    // Otherwise, we will print in a JavaScript format
    let mut representation = RepresentationConfig::JavaScript;
    for arg in std::env::args() {
        if arg == "--solidity" {
            representation = RepresentationConfig::Solidity;
        }
    }

    // Ask user for the number of voters and their voting preferences
    let (for_voter_amount, against_voter_amount) = get_election_setup();

    // Select the election id
    let election_id = BigInteger256::from(1);

    // Simulate the election
    simulate_election(&mut rng, for_voter_amount, against_voter_amount, election_id, representation);
    
}

fn get_election_setup() -> (u32, u32) {
    // As we are running in a MultiSig mode, we only need to care about the amount of `FOR` voters

    println!("Enter the amount of `FOR` election voters:");
    let for_voter_amount : u32;

    loop {
        let mut amount_raw = String::new();
        io::stdin().read_line(&mut amount_raw).expect("Failed to read line");
        for_voter_amount = match amount_raw.trim().parse() {
            Ok(num) => num,
            Err(_) => {
                println!("Please enter a valid number");
                continue;
            }
        };
        break;
    }


    // We don't need to ask for the amount of `AGAINST` voters, as we do not need them for the MultiSig mode
    (for_voter_amount, 0)
}


fn simulate_election(mut rng: &mut StdRng, for_voter_amount: u32, against_voter_amount: u32, election_id: BigInteger256, repr_conf: RepresentationConfig) {
    let specifiers = ElectionSpecifiers::new(election_id);

    let mut for_voters = Vec::new();
    for _ in 0..for_voter_amount {
        for_voters.push(generate_voter(&mut rng, &specifiers.forr.0, Vote::For));
    }

    let mut agaist_voters = Vec::new();
    for _ in 0..against_voter_amount {
        agaist_voters.push(generate_voter(&mut rng, &specifiers.against.0, Vote::Against));
    }


    let mut voters = Vec::new();
    voters.append(&mut for_voters.iter().map(|v| v.clone()).collect());
    voters.append(&mut agaist_voters.iter().map(|v| v.clone()).collect());


    let election_proof = generate_batched_election_proof(&voters.iter().map(|voter| { &voter.vote_proof }).collect());


    let correct = validate_election_proof(
        &for_voters.iter().map(|voter| &voter.pbk).collect(),
        &agaist_voters.iter().map(|voter| &voter.pbk).collect(),
        &election_proof,
        &specifiers
    );

    let evm_correct = validate_election_proof(
        &for_voters.iter().map(|voter| &voter.pbk).collect(),
        &agaist_voters.iter().map(|voter| &voter.pbk).collect(),
        &election_proof,
        &specifiers
    );

    assert!(correct, "Vote check failed");
    assert!(evm_correct, "EVM vote check failed");

    println!("Checks passed, printing the details of the election...");

    // Print the election details to a file if the size is bigger than 20 voters
    let mut out_writer: Box<dyn Write> = if voters.len() > 20 {
        println!("The election is too big to print, printing to a file instead");
        let file = File::create("election_details.txt").unwrap();
        let writer = BufWriter::new(file);
        Box::new(writer)
    } else {
        Box::new(stdout())
    };

    // Rewrite all the printlns to write to the file
    out_writer.write(format!("Election Id:\n {}\n", election_id.repr(&repr_conf)).as_bytes()).unwrap();
    out_writer.write(format!("Specifiers:\n {}\n", specifiers.repr(&repr_conf)).as_bytes()).unwrap();

    out_writer.write(format!("Voters:\n").as_bytes()).unwrap();


    for (i, voter) in voters.iter().enumerate() {
        out_writer.write(format!("(voters[{i}], pks[{i}], sigs[{i}]) = ({}, {}, {});\n", voter.eth_address.repr(&repr_conf), voter.pbk.repr(&repr_conf), voter.key_proof.repr(&repr_conf)).as_bytes()).unwrap();
    }

    out_writer.write(format!("\n").as_bytes()).unwrap();



    out_writer.write(format!("For voters:\n [{}]\n", for_voters.iter().map(|voter| voter.eth_address.repr(&repr_conf)).collect::<Vec<String>>().join(", ")).as_bytes()).unwrap();

    out_writer.write(format!("Against voters:\n [{}]\n", agaist_voters.iter().map(|voter| voter.eth_address.repr(&repr_conf)).collect::<Vec<String>>().join(", ")).as_bytes()).unwrap();


    // The rest of the printlns are not that big, so we can just print them normally
    println!("Election Proof:\n {}\n", election_proof.repr(&repr_conf));


    println!("Total votes: {}", for_voters.len() + agaist_voters.len());
    println!("For votes: {}", for_voters.len());
    println!("Total tokens: {}", voters.iter().map(|voter| voter.tokens).sum::<u32>());
    println!("For tokens: {}", for_voters.iter().map(|voter| voter.tokens).sum::<u32>());

}


fn generate_voter(mut rng: &mut impl Rng, vote_specifier: &G1, vote: Vote) -> Voter {
    let prk = ScalarField::rand(&mut rng);
    let pbk = generate_public_key(&prk);


    let vote_proof = generate_vote_proof(&prk, vote_specifier);
    let key_proof = SchnorrKnowledgeProof::generate_key_proof(&prk, &mut rng);


    let secp = Secp256k1::new();

    // Generate a new private key
    // Generate a random 32 byte array
    let mut secret_key_bytes = [0u8; 32];
    rng.fill_bytes(&mut secret_key_bytes);
    secret_key_bytes[0] &= 0b0111_1111; // Make sure the first bit is 0 to prevent invalid private keys

    let secret_key = SecretKey::from_slice(secret_key_bytes.as_ref()).unwrap();

    // Get the public key from the private key
    let public_key = PublicKey::from_secret_key(&secp, &secret_key);

    // Generate the Ethereum address from the public key
    let address = Address::from(H160::from_slice(Keccak256::digest(&public_key.serialize_uncompressed()[1..])[12..].as_ref()));

    // Generate a random amount of tokens
    let tokens = 5u32.pow(rng.gen_range(0..3)) * 2u32.pow(rng.gen_range(0..4));

    Voter {
        prk,
        pbk,
        vote,
        key_proof,
        vote_proof,
        tokens,
        eth_address: address,
        eth_private_key: secret_key,
    }
}