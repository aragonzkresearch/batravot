use ark_ff::Zero;
use crate::{G1, Vote};
use crate::voter::Ballot;

pub fn generate_proof(ballots: Vec<Ballot>) -> ElectionResult {
    // Sum all the ballots proofs
    let mut ballot_proof_sum = G1::zero();
    let mut election_result = Vec::new();

    for ballot in ballots {
        ballot_proof_sum += ballot.vote_proof;
        election_result.push((ballot.vote, ballot.pbk));
    }

    return ElectionResult {
        proof: ballot_proof_sum,
        votes: election_result,
    }
}

#[derive(Debug)]
pub struct ElectionResult {
    pub proof: G1,
    pub votes: Vec<(Vote, G1)>
}