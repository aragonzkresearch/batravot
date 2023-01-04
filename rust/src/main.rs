extern crate core;

use ark_ff::{BigInteger256};
use rand::{Rng, SeedableRng, thread_rng};
use rand_chacha::ChaCha8Rng;

use batravot::curve_abstr::print_curve_params;
use batravot::election::ElectionSpecifiers;
use batravot::prover::generate_proof;
use batravot::converter::JSConverter;
use batravot::verifier::{mimic_solidity, verify_election};
use batravot::voter::{Vote, Voter};

fn main() {
    let mut rng = ChaCha8Rng::seed_from_u64(1u64);

    simulate_election(&mut rng);
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
    println!("Solidity election specifiers: \n\t{}\n", JSConverter::convert_specifiers(&election_specifiers));

    // Generate voter accounts
    let mut voters = Vec::new();
    for _ in 0..voter_count {
        let voter = Voter::new(rng);
        voters.push(voter);
    }
    println!("{} Voter public keys with Schnorr Signatures:", voter_count);
    for (i, voter) in voters.iter().enumerate() {
        let sign = &voter.generate_signature(rng);
        print!("\n\t{}", JSConverter::convert_voter(&voter, &sign));
        // This is to keep the output interpretable by javascript
        if i + 1 != voter_count {
            println!(",");
        } else {
            println!("\n");
        }
    }



    let census = voters.iter().map(|voter| voter.election_pbk.clone()).collect();

    // Generate votes for each voter and store them in ballots
    let mut ballots = Vec::new();
    let mut voted_for_ids = Vec::new(); // We need it for solidity
    let mut voted_against_ids = Vec::new(); // We need it for solidity
    for voter in voters {
        // Generate a random vote
        let vote = match  thread_rng().gen::<bool>() {
            true => {voted_for_ids.push(JSConverter::convert_address(voter.eth_address)); Vote::Yes},
            false => {voted_against_ids.push(JSConverter::convert_address(voter.eth_address)); Vote::No},
        };

        let ballot = voter.generate_ballot(election_id, vote, &election_specifiers);
        ballots.push(ballot);
    }
    println!("Voted for ids: \n\t[{}]", voted_for_ids.join(", "));
    println!("Voted against ids: \n\t[{}]", voted_against_ids.join(", "));


    // Generate proof
    let proof = generate_proof(&ballots);
    println!("Proof: \n\t{}\n", JSConverter::convert_g1(&proof.proof));

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



