use ark_ec::group::Group;
use ark_ec::ProjectiveCurve;
use ark_ff::{BigInteger, PrimeField};
use ark_std::rand::Rng;
use ark_std::UniformRand;
use sha3::{Keccak256, Digest};
use crate::el_curve::{G1, ScalarField};

/// Represents a Schnorr Knowledge Proof
/// We use it to prove that the voter is the owner of the private key
/// t: The first part of the proof, initial randomness
/// s: The second part of the proof
pub struct  SchnorrKnowledgeProof {
    pub t: G1,
    pub s: ScalarField,
}

impl SchnorrKnowledgeProof {
    /// Function to create a [Schnorr Knowledge Proof](https://en.wikipedia.org/wiki/Proof_of_knowledge)
    /// We use Fiat-Shamir Heuristic to make the protocol non interactive
    /// prk: The private key of the voter
    /// rng: A random number generator
    /// Returns a Schnorr Knowledge Proof
    pub fn generate_key_proof(prk: &ScalarField, rng: &mut impl Rng) -> Self {

        // Generate a random scalar field element and a corresponding point

        let r = ScalarField::rand(rng);
        let t = G1::prime_subgroup_generator().mul(r.into_repr());

        // Generate a public key
        let y = G1::prime_subgroup_generator().mul(prk.into_repr());

        // Compute challenge using Fiat-Shamir Heuristic
        // We concatenate the coordinates of both points t and public key
        let c : ScalarField = SchnorrKnowledgeProof::hash_points_into_scalar_field(vec![&t, &y]);

        // Computer proof
        let s = r + c * prk;

        SchnorrKnowledgeProof {
            t,
            s,
        }
    }
    

    /// Function to verify a Schnorr Knowledge Proof
    /// y: The public key of the voter
    /// Returns true if the signature is valid, false otherwise
    pub fn verify(self: &Self, y: &G1) -> bool {

        // Computer left hand side as g^s
        let lhs = G1::prime_subgroup_generator().mul(self.s.into_repr());

        // Compute challenge using Fiat-Shamir Heuristic, same as computed by the prover
        // We concatenate the coordinates of both points t and public key
        let c : ScalarField = SchnorrKnowledgeProof::hash_points_into_scalar_field(vec![&self.t, &y]);

        // Computer right hand side as y^c * t
        let rhs: G1 = y.mul(&c) + &self.t;

        // Check that the sides match
        lhs == rhs
    }

    /// Function to hash a point into a scalar
    /// Uses Keccak256 to hash the point into a scalar
    /// point: The elliptic curve point to hash
    /// returns a scalar field element
    fn hash_points_into_scalar_field(points: Vec<&G1>) -> ScalarField {
        // We use Big Endian throughout as Keccak has Big Endian output in Rust
        // As we create a hash of a set of points, we iterate through them and
        // Generate a vec containing all their affine coordinates in order (X, Y)
        let mut accumulator = Vec::new();
        for point in points {
            accumulator.append(&mut point.into_affine().x.into_repr().to_bytes_be());
            accumulator.append(&mut point.into_affine().y.into_repr().to_bytes_be());
        }

        // Generate a hash
        let hash = Keccak256::digest(accumulator);
        ScalarField::from_be_bytes_mod_order(hash.as_slice())
    }
}

#[test]
fn test_schnorr_signature() {
    let mut rng = ark_std::test_rng();
    let prk = ScalarField::rand(&mut rng);
    let pbk = G1::prime_subgroup_generator().mul(prk.into_repr());

    let proof = SchnorrKnowledgeProof::generate_key_proof(&prk, &mut rng);

    assert!(proof.verify(&pbk));
}
