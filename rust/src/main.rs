extern crate core;

use std::ops::{Add, Div, Mul, Neg};

use ark_ec::{PairingEngine, ProjectiveCurve};
use ark_ff::{BigInteger256, One, PrimeField, Zero};
use ark_std::UniformRand;
use rand::{Rng, SeedableRng, thread_rng};
use rand_chacha::ChaCha8Rng;


use crate::curve_abstr::{SolidityConverter, print_curve_params, G1, G2, Curve, curve, ScalarField};

use crate::election::ElectionSpecifiers;
use crate::prover::generate_proof;
use crate::verifier::verify_election;
use crate::voter::{Ballot, Vote, Voter};

mod voter;
mod election;
mod prover;
mod verifier;
mod curve_abstr;

fn main() {
    let mut rng = ChaCha8Rng::seed_from_u64(1u64);

    simulate_election(&mut rng);
}


fn simulate_schnorr_signature<T : Rng>(rng: &mut T) {
    let voter = Voter::new(rng);

    let pub_key = SolidityConverter::convert_g1(&voter.pbk);
    println!("Public key: {}", pub_key);
    let priv_key = SolidityConverter::convert_scalar(&voter.prk);
    println!("Private key: {}", priv_key);
    let sign = &voter.generate_signature(rng);
    println!("Signature: {{ s : {}, e : {}}} ", SolidityConverter::convert_scalar(&sign.s), SolidityConverter::convert_scalar(&sign.e));
}

fn simulate_election<T : Rng>(rng: &mut T) {
    // Print the curve parameters
    print_curve_params();

    // Setup parameters
    let voter_count = 1; // TODO - make this a command line input
    let election_id = BigInteger256::from(0); // TODO - make this a command line input


    // Election parameters
    let election_specifiers = ElectionSpecifiers::new(election_id);
    // The order of specifiers is: yesG1, yesG2, noG1, noG2
    println!("Solidity election specifiers: \n\t{}\n", election_specifiers.to_solidity());


    let rand_sc_point = ScalarField::rand(rng);
    println!("Random scalar field point to verify at: {}", &rand_sc_point);

    // Generate voter accounts
    let mut voters = Vec::new();
    for _ in 0..voter_count {
        let voter = Voter::new(rng);
        voters.push(voter);
    }
    println!("{} Voter public keys with Schnorr Signatures:", voter_count);
    for (i, voter) in voters.iter().enumerate() {
        let sign = &voter.generate_signature(rng);
        print!("\n\t[{}, {}, {}]", SolidityConverter::convert_g1(&voter.pbk), SolidityConverter::convert_scalar(&sign.s), SolidityConverter::convert_scalar(&sign.e));
        if i + 1 != voter_count {
            println!(",");
        } else {
            println!("\n");
        }
    }



    let census = voters.iter().map(|voter| voter.pbk.clone()).collect();

    // Generate votes for each voter and store them in ballots
    let mut ballots = Vec::new();
    let mut voted_for_ids = Vec::new(); // We need it for solidity
    let mut voted_against_ids = Vec::new(); // We need it for solidity
    for (i, voter) in voters.iter().enumerate() {
        // Generate a random vote
        let vote = match thread_rng().gen::<bool>() {
            true => {voted_for_ids.push(i); Vote::Yes},
            false => {voted_against_ids.push(i); Vote::No},
        };

        let ballot = voter.generate_ballot(election_id, vote, &election_specifiers);
        ballots.push(ballot);
    }
    println!("Voted for ids: \n\t{:?}", voted_for_ids);
    println!("Voted against ids: \n\t{:?}", voted_against_ids);


    // Generate proof
    let proof = generate_proof(&ballots);
    println!("Proof: \n\t{}\n", SolidityConverter::convert_g1(&proof.proof));

    let vote_count = proof.votes.len();
    let yes_vote_count = proof.votes.iter().filter(|(vote, _)| *vote == Vote::Yes).count();

    // Verify proof
    let result = verify_election(&proof, &election_specifiers, &census);

    if result {
        // Print the vote results with amount of yes out of all
        println!("Verified result: {}/{} in favour", yes_vote_count, vote_count);
    } else {
        eprintln!("Proof failed!");
    }

    // Run the solidity proof to check the proof correctness
    mimic_solidity(&ballots, &proof.proof, &election_specifiers);
}

/**
 * This function mimics the verification we do in solidity
 * Thus it is a good way to check if the proof will be accepted
 */
fn mimic_solidity(ballots : &Vec<Ballot>, proof: &G1, specifiers: &ElectionSpecifiers) {


    let mut for_key_sum = G1::zero();
    let mut against_key_sum = G1::zero();

    for ballot in ballots {
        match ballot.vote {
            Vote::Yes => for_key_sum += ballot.pbk.clone() ,
            Vote::No => against_key_sum += ballot.pbk.clone(),
        };
    }

    if against_key_sum == G1::zero() {
        let key_sum_pairing = Curve::pairing(for_key_sum, specifiers.yes.1.clone());
        let proof_pairing = Curve::pairing(proof.clone(), G2::prime_subgroup_generator().neg());
        let product = key_sum_pairing.mul(proof_pairing);
        assert!(product.is_one());
    } else if for_key_sum == G1::zero() {
        let key_sum_pairing = Curve::pairing(against_key_sum, specifiers.no.1.clone());
        let proof_pairing = Curve::pairing(proof.clone(), G2::prime_subgroup_generator().neg());
        let product = key_sum_pairing.mul(proof_pairing);
        assert!(product.is_one());
    } else {
        let against_key_sum_pairing = Curve::pairing(against_key_sum.clone(), specifiers.no.1.clone());
        let for_key_sum_pairing = Curve::pairing(for_key_sum.clone(), specifiers.yes.1.clone());
        let proof_pairing = Curve::pairing(proof.clone(), G2::prime_subgroup_generator().neg());
        let product = for_key_sum_pairing.mul(proof_pairing).mul(against_key_sum_pairing);
        assert!(product.is_one());
    }
    println!("Solidity verification in Rust passed!");

}

