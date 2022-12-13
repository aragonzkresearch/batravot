use ark_ff::Zero;
use crate::curve_abstr::G1;
use crate::Vote;
use crate::voter::Ballot;

pub fn generate_proof(ballots: &Vec<Ballot>) -> ElectionResult {
    // Sum all the ballots proofs
    let mut ballot_proof_sum = G1::zero();
    let mut election_result = Vec::new();

    for ballot in ballots {
        ballot_proof_sum += &ballot.vote_proof;
        election_result.push((ballot.vote.clone(), ballot.pbk.clone()));
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