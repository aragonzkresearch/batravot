use std::ops::{Add, Div, Mul, Neg};
use ark_bn254::Fr;
use ark_ec::{AffineCurve, PairingEngine, ProjectiveCurve};
use ark_ff::{BigInteger, BigInteger256, Field, One, PrimeField, Zero};
use rand::{Rng, thread_rng};
use crate::curve_abstr::{SolidityConverter, print_curve_params, G1, G2, Curve, curve};

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
    // Print the curve parameters
    print_curve_params();

    // Setup parameters
    let mut rng = thread_rng();
    let voter_count = 5;

    // Generate voter accounts
    let mut voters = Vec::new();
    for _ in 0..voter_count {
        let voter = Voter::new(&mut rng);
        voters.push(voter);
    }
    println!("Voter public keys: {}", voters.iter().map(|voter| SolidityConverter::convert_g1(&voter.pbk)).collect::<Vec<String>>().join(","));


    // Election parameters
    let election_id = BigInteger256::from(1); // TODO - change this to a real election ID
    let election_specifiers = ElectionSpecifiers::new(election_id);
    // The order of specifiers is: yesG1, yesG2, noG1, noG2
    println!("Solidity election specifiers: {}", election_specifiers.to_solidity());

    let census = voters.iter().map(|voter| voter.pbk.clone()).collect();

    // Generate votes for each voter and store them in ballots
    let mut ballots = Vec::new();
    let mut voted_for_ids = Vec::new(); // We need it for solidity
    let mut voted_against_ids = Vec::new(); // We need it for solidity
    for (i, voter) in voters.iter().enumerate() {
        // Generate a random vote
        let vote = match thread_rng().gen::<bool>() { // TODO - change this to a real random vote
            true => {voted_for_ids.push(i); Vote::Yes},
            false => {voted_against_ids.push(i); Vote::No},
        };
        let ballot = voter.generate_ballot(election_id, vote, &election_specifiers);
        ballots.push(ballot);
    }
    println!("Voted for ids: {:?}", voted_for_ids);
    println!("Voted against ids: {:?}", voted_against_ids);


    // Generate proof
    let proof = generate_proof(&ballots);
    println!("Proof: {}", SolidityConverter::convert_g1(&proof.proof));

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

