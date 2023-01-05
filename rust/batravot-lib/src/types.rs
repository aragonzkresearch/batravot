use crate::election_specifiers;
use crate::el_curve::{G1, ScalarField};
use crate::voter::generate_vote_proof;

/// Represents a single vote of a voter
///
/// # Examples
/// ```
/// use batravot_lib::Vote;
///
/// let vote = Vote::For;
/// ```
///
#[derive(Debug, PartialEq)]
pub enum Vote {
    For,
    Against,
}


/// Represents a single ballot submitted by a voter
/// vote: The vote of the voter
/// vote_proof: A proof that the vote is valid
/// pbk: The public key of the voter
pub struct Ballot {
    pub vote: Vote,
    pub vote_proof: G1,
    pub pbk: G1,
}


