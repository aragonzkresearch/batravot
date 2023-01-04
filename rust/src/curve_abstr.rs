use std::ops::Neg;
use ark_ec::ProjectiveCurve;
use ark_ff::{BigInteger256, PrimeField, Zero};
use sha256::digest;


// Re-export curve to abstract away the curve implementation
pub use ark_bn254 as curve;
pub use ark_bn254::Bn254 as Curve;

pub use curve::{G1Projective as G1, G2Projective as G2, Fr as ScalarField, Fq};
use crate::converter::JSConverter;


/**
 * Provides parameters that needs to be hardcoded for the curve
 * Inside of the smart contract
 */
pub fn print_curve_params() {
    // G1 and G2 are the generators of the curve
    println!("G1: {}", JSConverter::convert_g1(&G1::prime_subgroup_generator()));
    println!("G1 Zero: {}", JSConverter::convert_g1(&G1::zero()));
    println!("G2: {}", JSConverter::convert_g2(&G2::prime_subgroup_generator()));
    println!("G2Inverse: {}", JSConverter::convert_g2(&G2::prime_subgroup_generator().neg()));
    println!("Done printing curve params.\n\n");
}

pub(crate) fn hash(x: &Vec<u8>) -> (G1, G2) {
    let binding = digest(x.as_slice());
    let hash = binding.as_bytes();

    // Convert hash to a BigInteger256
    let mut hash_bytes = [0u64; 4];
    for i in 0..4 {
        hash_bytes[i] = u64::from_le_bytes(hash[i * 8..(i + 1) * 8].try_into().unwrap());
    }

    let scalar_hash = ScalarField::new(BigInteger256(hash_bytes));

    let g1hash = G1::prime_subgroup_generator().mul(scalar_hash.into_repr());
    let g2hash = G2::prime_subgroup_generator().mul(scalar_hash.into_repr());

    // Check that the g1hash is not the identity element
    assert!(g1hash != G1::zero());
    assert!(g2hash != G2::zero());

    (g1hash, g2hash)
}