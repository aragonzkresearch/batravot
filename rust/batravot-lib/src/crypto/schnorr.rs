use ark_ec::ProjectiveCurve;
use ark_ff::{BigInteger, PrimeField};
use ark_std::rand::Rng;
use ark_std::UniformRand;
use sha3::{Keccak256, Digest};
use crate::el_curve::{G1, ScalarField};

/// Represents a Schnorr signature
/// We use Schnorr signatures to prove that the voter is the owner of the private key
/// e: The first part of the signature
/// s: The second part of the signature
pub struct SchnorrSignature {
    pub e: ScalarField,
    pub s: ScalarField,
}

impl SchnorrSignature {
    /// Function to create a Schnorr signature
    /// prk: The private key of the voter
    /// rng: A random number generator
    /// Returns a Schnorr signature
    pub fn generate_key_proof(prk: &ScalarField, rng: &mut impl Rng) -> SchnorrSignature {

        let k = ScalarField::rand(rng);
        let r = G1::prime_subgroup_generator().mul(k.clone().into_repr());

        let e = Self::hash_point_into_scalar(&r);

        let s = k - e.clone() * prk.clone();

        SchnorrSignature {
            e,
            s,
        }
    }
    

    /// Function to verify a Schnorr signature
    /// pbk: The public key of the voter
    /// signature: The signature to verify
    /// Returns true if the signature is valid, false otherwise
    pub fn verify(pbk: &G1, signature: &SchnorrSignature) -> bool {
        let r = G1::prime_subgroup_generator().mul(signature.s.clone().into_repr()) + pbk.clone().mul(signature.e.clone().into_repr());

        let e_computed = Self::hash_point_into_scalar(&r);

        e_computed == signature.e
    }

    /// Function to hash a point into a scalar
    /// Uses Keccak256 to hash the point into a scalar
    /// point: The elliptic curve point to hash
    /// returns a scalar field element
    fn hash_point_into_scalar(r: &G1) -> ScalarField {
        // We use Big Endian throughout as Keccak has Big Endian output in Rust
        let hash = Keccak256::digest(r.into_affine().x.into_repr().to_bytes_be().as_slice());
        ScalarField::from_be_bytes_mod_order(hash.as_slice())
    }
}

#[test]
fn test_schnorr_signature() {
    let mut rng = ark_std::test_rng();
    let prk = ScalarField::rand(&mut rng);
    let pbk = G1::prime_subgroup_generator().mul(prk.into_repr());

    let signature = SchnorrSignature::generate_key_proof(&prk, &mut rng);

    assert!(SchnorrSignature::verify(&pbk, &signature));
}
