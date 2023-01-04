use ark_bn254::Fq;
use ark_ec::ProjectiveCurve;
use web3::types::Address;

use crate::curve_abstr::{G1, G2, ScalarField};
use crate::election::ElectionSpecifiers;
use crate::voter::{Signature, Voter};

/**
 * Convert code to the format that we will use in hardhat
 * to interact with the smart contract
 */
pub struct JSConverter;

impl JSConverter {
    pub fn convert_g1(point: &G1) -> String {
        let affine = point.into_affine();
        let x = affine.x;
        let y = affine.y;
        format!("[{},{}]", JSConverter::convert_bi(&x), JSConverter::convert_bi(&y))
    }

    pub fn convert_g2(point: &G2) -> String {
        let affine = point.into_affine();
        let x = affine.x;
        let y = affine.y;
        format!("[[{},{}],[{},{}]]", JSConverter::convert_bi(&x.c1), JSConverter::convert_bi(&x.c0), JSConverter::convert_bi(&y.c1), JSConverter::convert_bi(&y.c0))
    }

    fn convert_bi(field: &Fq) -> String {
        format!("BigNumber.from(\'0x{}\')", field).replace("Fp256 \"(", "").replace(")\"", "")
    }

    pub fn convert_scalar(field: &ScalarField) -> String {
        format!("BigNumber.from(\'0x{}\')", field).replace("Fp256 \"(", "").replace(")\"", "")
    }

    pub fn covert_bytes_to_bigint(bytes: [u8; 32]) -> String {
        let mut bytes_repr = Vec::new();
        for i in 0..32 {
            let byte = bytes[i];
            bytes_repr.push(format!("{:02x}", byte));
        }
        return format!("BigNumber.from(\'0x{}\')", bytes_repr.join(""));
    }

    pub fn convert_address(address: Address) -> String {
        return format!("\'{:?}\'", address);
    }

    pub fn convert_signature(sign: &Signature) -> String {
        format!("[{},{}]", JSConverter::convert_scalar(&sign.s), JSConverter::convert_scalar(&sign.e))
    }

    pub fn convert_secret_key(sk: &[u8; 32]) -> String {
        format!("'0x{}'", hex::encode(sk))
    }

    pub fn convert_voter(voter: &Voter, sign: &Signature) -> String {
        format!("[{}, {}, {}, {}, {}]", voter.tokens, JSConverter::convert_secret_key(&voter.eth_prk), JSConverter::convert_address(voter.eth_address), JSConverter::convert_g1(&voter.election_pbk), JSConverter::convert_signature(sign))
    }

    pub fn convert_specifiers(specifier: &ElectionSpecifiers) -> String {
        format!("{},{},{},{}", JSConverter::convert_g1(&specifier.yes.0), JSConverter::convert_g2(&specifier.yes.1), JSConverter::convert_g1(&specifier.no.0), JSConverter::convert_g2(&specifier.no.1))
    }

}