use std::ops::{Mul, Neg};
use ark_ec::{PairingEngine, ProjectiveCurve};
use ark_ff::{One, Zero};

use crate::curve_abstr::{Curve, G1, G2};
use crate::election::ElectionSpecifiers;
use crate::prover::ElectionResult;
use crate::voter::{Ballot, Vote};

pub fn verify_election(election_result: &ElectionResult, specifiers: &ElectionSpecifiers, census: &Vec<G1>) -> bool {

    // Sum all keys that voted yes
    // And sum all keys that voted no
    let mut sum_keys_voted_yes = G1::zero();
    let mut sum_keys_voted_no = G1::zero();

    for (vote, pbk) in &election_result.votes {
        // Check that the pbk is in the census
        if !census.contains(&pbk) {
            eprintln!("Public key not in census!");
            return false;
        }

        match vote {
            Vote::Yes => sum_keys_voted_yes += pbk,
            Vote::No => sum_keys_voted_no += pbk,
        };
    }

    // Compute the election proof pairing
    let lhs = Curve::pairing(election_result.proof.clone(), G2::prime_subgroup_generator());
    // Compute the product of pairing of the sum of keys that voted yes and the yes specifier
    // And the pairing of the sum of keys that voted no and the no specifier
    let rhs = Curve::pairing(sum_keys_voted_yes, specifiers.yes.1.clone()) * (Curve::pairing(sum_keys_voted_no, specifiers.no.1.clone()));

    // If the election proof is valid, the pairing of the election proof and the generator should be equal to the product of the pairings of the sum of keys that voted yes and the yes specifier
    lhs == rhs
}


/**
 * This function mimics the verification we do in solidity
 * Thus it is a good way to check if the proof will be accepted
 */
pub fn mimic_solidity(ballots : &Vec<Ballot>, proof: &G1, specifiers: &ElectionSpecifiers) {


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