use std::ops::Neg;
use ark_ec::{ProjectiveCurve};
use ark_ff::{BigInteger, BigInteger256, Field, PrimeField, Zero};
use rand::{Rng, thread_rng};
use crate::curve_abstr::{SolidityConverter, print_curve_params};

use crate::election::ElectionSpecifiers;
use crate::prover::generate_proof;
use crate::verifier::verify_election;
use crate::voter::{Vote, Voter};

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
    let voter_count = 1;

    // Generate voter accounts
    let mut voters = Vec::new();
    for _ in 0..voter_count {
        let voter = Voter::new(&mut rng);
        println!("Voter public key: {}", SolidityConverter::convert_g1(&voter.pbk));
        voters.push(voter);
    }



    // Election parameters
    let election_id = BigInteger256::from(1); // TODO - change this to a real election ID
    let election_specifiers = ElectionSpecifiers::new(election_id);
    // The order of specifiers is: yesG1, yesG2, noG1, noG2
    println!("Solidity election specifiers: {}", election_specifiers.to_solidity());

    let census = voters.iter().map(|voter| voter.pbk.clone()).collect();

    // Generate votes for each voter and store them in ballots
    let mut ballots = Vec::new();
    for voter in voters {
        // Generate a random vote
        // let vote = match thread_rng().gen::<bool>() {
        //     true => Vote::Yes,
        //     false => Vote::No,
        // };
        let vote = Vote::Yes;
        let ballot = voter.generate_ballot(election_id, vote, &election_specifiers);
        println!("Ballot: {}", ballot);
        ballots.push(ballot);
    }

    // Generate proof
    let proof = generate_proof(ballots);
    println!("Proof: {}", SolidityConverter::convert_g1(&proof.proof));

    let vote_count = proof.votes.len();
    let yes_vote_count = proof.votes.iter().filter(|(vote, _)| *vote == Vote::Yes).count();

    // Verify proof
    let result = verify_election(proof, election_specifiers, census);

    if result {
        // Print the vote results with amount of yes out of all
        println!("Verified result: {}/{} in favour", yes_vote_count, vote_count);
    } else {
        eprintln!("Proof failed!");
    }


}


