use ark_ff::{BigInteger256, One, PrimeField, Zero};
use ark_ec::ProjectiveCurve;



///! This module contains the all of the elliptic curve logic.
///! It additionally re-export curve to abstract away the curve implementation.


/// The abstract representation of the elliptic curve crate
/// It is sufficient to change the curve implementation here and the rest of the code
///  will start using the new curve due to how the re-export works.
pub use ark_bn254 as curve;
/// The abstract representation of the elliptic curve object
pub use ark_bn254::Bn254 as Curve;

/// Explicit re-exports of useful curve primitives
pub use curve::{G1Projective as G1, G2Projective as G2, Fr as ScalarField, Fq as CurveBaseField};

/// The function converts an array of bytes to a point on the curve as well as on curve extension
pub(crate) fn convert_to_point(x: &[u8]) -> (G1, G2) {

    // If the point is not on the curve, we increment the value by 1 and try again
    let mut scalar = ScalarField::from_be_bytes_mod_order(x);

    loop {


        let g1hash = G1::prime_subgroup_generator().mul(scalar.into_repr());
        let g2hash = G2::prime_subgroup_generator().mul(scalar.into_repr());

        // Check that the g1hash and g2hash are not equal to the identity element
        // If they are, we need to try again and increment the scalar_hash by 1
        // Otherwise, we return the point on the curve
        if !g1hash.is_zero() && !g2hash.is_zero() {
            return (g1hash, g2hash);
        }
        
        scalar += ScalarField::one();
    }

}