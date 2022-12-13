use ark_ec::group::Group;
use ark_ec::{PairingEngine, ProjectiveCurve};
use ark_ff::{BigInteger256, Zero};
use crate::curve_abstr::{G1, G2};
use crate::{Curve, curve_abstr, ElectionSpecifiers, Vote};
use crate::prover::ElectionResult;

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