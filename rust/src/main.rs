// We use the BLS12-381 curve for this version.
use ark_bls12_381::{G1Projective as G1, G2Projective as G2, Fr as ScalarField};
use ark_ec::{ProjectiveCurve};
use ark_ff::{BigInteger, BigInteger256, Field, PrimeField, Zero};
use rand::{Rng, thread_rng};

use crate::election::ElectionSpecifiers;
use crate::prover::generate_proof;
use crate::verifier::verify_election;
use crate::voter::{Vote, Voter};

mod voter;
mod utils;
mod election;
mod prover;
mod verifier;


fn main() {
    // Setup parameters
    let mut rng = thread_rng();
    let voter_count = 10;

    // Generate voter accounts
    let mut voters = Vec::new();
    for _ in 0..voter_count {
        voters.push(Voter::new(&mut rng));
    }

    // Election parameters
    let election_id = BigInteger256::from(1);
    let election_specifiers = ElectionSpecifiers::new(election_id);
    println!("Election specifiers: {} : {}", election_specifiers.yes.0, election_specifiers.yes.1);
    let census = voters.iter().map(|voter| voter.pbk.clone()).collect();

    // Generate votes for each voter and store them in ballots
    let mut ballots = Vec::new();
    for voter in voters {
        // Generate a random vote
        let vote = match thread_rng().gen::<bool>() {
            true => Vote::Yes,
            false => Vote::No,
        };
        let ballot = voter.generate_ballot(election_id, vote, &election_specifiers);
        println!("Ballot: {:?}", ballot);
        ballots.push(ballot);
    }

    // Generate proof
    let proof = generate_proof(ballots);

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


