use std::fmt;
use ark_ec::group::Group;
use ark_ec::ProjectiveCurve;
use ark_ff::{BigInteger, BigInteger256, PrimeField};
use ark_std::UniformRand;
use rand::Rng;
use crate::curve_abstr::{G1, ScalarField};
use crate::{ElectionSpecifiers, SolidityConverter};


/**
 * A voter is a struct that contains the private and public keys of a voter.
 * The private key is a scalar field element, and the public key is a point on the G1 curve.
 */
pub struct Voter {
    pub prk: ScalarField,
    pub pbk: G1,
}

impl Voter {
    /**
     * Create a new voter with a random private key and public key
     */
    pub fn new<T: Rng>(rng: &mut T) -> Self {
        // A random scalar field element
        let prk = ScalarField::rand(rng);
        // prk * G1
        let pbk = G1::prime_subgroup_generator().mul(prk.into_repr());

        Self {
            prk,
            pbk,
        }
    }

    /**
     * Generate a ballot for a given election
     */
    pub fn generate_ballot(&self, election_id: BigInteger256, vote: Vote, specifiers: &ElectionSpecifiers) -> Ballot {

        // We first need to check that the specifiers we have obtained from online are correct
        specifiers.check_specifiers(election_id);

        // Choose correct specifier based on vote
        let specifier = match vote {
            Vote::Yes => &specifiers.yes.0,
            Vote::No => &specifiers.no.0,
        };

        // Generate a vote proof
        // [specifiers in G1] * prk
        let vote_proof = specifier.mul(&self.prk);

        // Generate a ballot
        let ballot = Ballot {
            vote,
            vote_proof,
            pbk: self.pbk.clone()
        };

        ballot
    }

    /**
     * Generate a Schnorr signature to prove that the voter is the owner of the private key
     * Corresponding to the public key
     */
    pub fn generate_signature<T: Rng>(&self, rng: &mut T) -> Signature {

        let k = ScalarField::rand(rng);
        let r = G1::prime_subgroup_generator().mul(k.clone().into_repr());

        let e = {
            // We use Big Endian throughout as Keccak has Big Endian output in Rust
            let hash = web3::signing::keccak256(r.into_affine().x.into_repr().to_bytes_be().as_slice());
            ScalarField::from_be_bytes_mod_order(hash.as_slice())
        };

        let s = k - e.clone() * self.prk.clone();
        
        Signature {
            e,
            s,
        }
    }

}


/**
 * A vote is a choice of either yes or no.
 */
#[derive(Debug, PartialEq, Clone)]
pub enum Vote {
    Yes,
    No,
}

/**
 * A ballot is generated by the voter and contains:
 * 1. The vote
 * 2. A proof that the vote is valid
 * 3. Voter public key
 */
#[derive(Clone)]
pub struct Ballot {
    pub vote: Vote,
    pub vote_proof: G1,
    pub pbk: G1,
}

// Overwrite the default Display implementation to print the vote_proof and pbk as affine points
impl fmt::Display for Ballot {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "Ballot: Vote: {:?}, Vote proof: {}, Voter public key: {}", self.vote, SolidityConverter::convert_g1(&self.vote_proof), SolidityConverter::convert_g1(&self.pbk))
    }
}

/**
 * A signature is generated by the voter and contains:
 * 1. A keccak256 hash of a random number
 * 2. A Schnorr signature
 */
pub struct Signature {
    pub e: ScalarField,
    pub s: ScalarField,
}

