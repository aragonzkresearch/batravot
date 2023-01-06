use ark_ec::ProjectiveCurve;
use ark_ec::short_weierstrass_jacobian::{GroupAffine, GroupProjective};
use ark_ff::{BigInteger, BigInteger256, PrimeField};
use web3::types::Address;

use crate::el_curve::{curve, CurveBaseField, CurveExtensionField, ScalarField};
use crate::{ElectionSpecifiers, G1, G2, SchnorrSignature};

/// This trait is used to convert a complex type to a type that Solidity can understand
pub trait SolidityRepresentable {
    fn solidity_repr(&self) -> String;
}
/// This trait is used to convert a complex type to a type that Java Script can understand
pub trait JavaScriptRepresentable {
    fn javascript_repr(&self) -> String;
}
/// This trait is the same as the `FromStr` trait, but it returns a `Result`
/// The reason for creating this trait is that the `FromStr` could not be implemented for the external types
pub trait FromStrCustom {
    type Err;
    fn from_str_c(s: &str) -> Result<Self, Self::Err> where Self: Sized;
}

impl SolidityRepresentable for BigInteger256 {
    fn solidity_repr(&self) -> String {
        let bytes = self.to_bytes_be();
        format!("0x{}", hex::encode(bytes))
    }
}
impl JavaScriptRepresentable for BigInteger256 {
    fn javascript_repr(&self) -> String {
        let bytes = self.to_bytes_be();
        format!("BigNumber.from(\"0x{}\")", hex::encode(bytes))
    }
}
impl FromStrCustom for BigInteger256 {
    type Err = String;

    /// Converts a string to a `BigInteger256`
    /// Accepts the following formats: `0x...` and `...`, where `...` is a hex string of 32 bytes (64 characters)
    /// # Arguments
    /// * `s` - The string to parse
    /// # Returns
    /// * `Ok(BigInteger256)` - If the string is valid
    /// * `Err(String)` - If the string is invalid
    /// # Example
    /// ```
    /// use ark_ff::BigInteger256;
    /// use std::str::FromStr;
    /// use batravot_lib::representation::FromStrCustom;
    /// let big_int = BigInteger256::from_str_c("0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef").unwrap();
    /// ```
    fn from_str_c(s: &str) -> Result<Self, Self::Err> {
        // Remove the 0x prefix if exists
        let s_parsed = s.trim().replace("0x", "");
        if s_parsed.len() != 64 {
            return Err(format!("Invalid string length for BigInteger256: got {}, expected 64", s.len()));
        };

        let bytes = hex::decode(s_parsed).map_err(|e| e.to_string())?;
        // Convert the bytes vector to a vector of bits in the big endian format
        let mut bits = Vec::new();
        for i in 0..32 {
            let byte = bytes[i];
            for j in 0..8 {
                bits.push((byte >> (7 - j)) & 1 == 1);
            }
        }
        let repr = BigInteger256::from_bits_be(bits.as_slice());

        Ok(repr)
    }
}




impl SolidityRepresentable for ScalarField {
    fn solidity_repr(&self) -> String {
        self.into_repr().solidity_repr()
    }
}
impl JavaScriptRepresentable for ScalarField {
    fn javascript_repr(&self) -> String {
        self.into_repr().javascript_repr()
    }
}
impl FromStrCustom for ScalarField {
    type Err = String;

    /// Converts a string to a `ScalarField`
    /// Accepts the following formats: `0x...` and `...`, where `...` is a hex string of 32 bytes (64 characters)
    /// # Arguments
    /// * `s` - The string to parse
    /// # Returns
    /// * `Ok(ScalarField)` - If the string is valid
    /// * `Err(String)` - If the string is invalid
    /// # Example
    /// ```
    /// use batravot_lib::representation::FromStrCustom;
    /// use batravot_lib::ScalarField;
    /// let scalar_field = ScalarField::from_str_c("0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef").unwrap();
    /// ```
    fn from_str_c(s: &str) -> Result<Self, Self::Err> {
        let repr = BigInteger256::from_str_c(s)?;
        let scalar_field = ScalarField::from(repr);
        Ok(scalar_field)
    }
}

impl SolidityRepresentable for CurveBaseField {
    fn solidity_repr(&self) -> String {
        self.into_repr().solidity_repr()
    }
}
impl JavaScriptRepresentable for CurveBaseField {
    fn javascript_repr(&self) -> String {
        self.into_repr().javascript_repr()
    }
}
impl FromStrCustom for CurveBaseField {
    type Err = String;

    /// Converts a string to a `CurveBaseField`
    /// Accepts the following formats: `0x...` and `...`, where `...` is a hex string of 32 bytes (64 characters)
    /// # Arguments
    /// * `s` - The string to parse
    /// # Returns
    /// * `Ok(CurveBaseField)` - If the string is valid
    /// * `Err(String)` - If the string is invalid
    /// # Example
    /// ```
    /// use batravot_lib::representation::FromStrCustom;
    /// use batravot_lib::CurveBaseField;
    /// let fq = CurveBaseField::from_str_c("0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef").unwrap();
    /// ```
    fn from_str_c(s: &str) -> Result<Self, Self::Err> {
        let repr = BigInteger256::from_str_c(s)?;
        Ok(CurveBaseField::from(repr))
    }
}

impl SolidityRepresentable for GroupProjective<curve::g1::Parameters> {
    fn solidity_repr(&self) -> String {
        let affine = self.into_affine();
        format!("[{},{}]", affine.x.solidity_repr(), affine.y.solidity_repr())
    }
}
impl JavaScriptRepresentable for GroupProjective<curve::g1::Parameters> {
    fn javascript_repr(&self) -> String {
        let affine = self.into_affine();
        format!("[{} , {}]", affine.x.javascript_repr(), affine.y.javascript_repr())
    }
}
impl FromStrCustom for GroupProjective<curve::g1::Parameters> {
    type Err = String;

    /// Converts a string to a `G1` point
    /// Accepts the following formats: `[0x... , 0x...]` or `0x...,0x...`, where `...` is a hex string of 32 bytes (64 characters)
    /// # Arguments
    /// * `s` - The string to parse
    /// # Returns
    /// * `Ok(G1)` - If the string is valid
    /// * `Err(String)` - If the string is invalid
    /// # Example
    /// ```
    /// use batravot_lib::G1;
    /// use batravot_lib::representation::FromStrCustom;
    /// let point_g1 = G1::from_str_c("0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef,0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef").unwrap();
    /// ```
    fn from_str_c(s: &str) -> Result<Self, Self::Err> {

        let parsed_s = s.trim().replace(" ", "").replace("[", "").replace("]", "");
        let (x, y) = parsed_s.split_once(",").ok_or("Invalid G1 point format")?;
        let x = CurveBaseField::from_str_c(x)?;
        let y = CurveBaseField::from_str_c(y)?;

        let point = G1::from(GroupAffine::<curve::g1::Parameters>::new(x, y, false));

        Ok(point)
    }
}


impl SolidityRepresentable for GroupProjective<curve::g2::Parameters> {
    fn solidity_repr(&self) -> String {
        let affine = self.into_affine();
        format!("[{},{},{},{}]", affine.x.c1.solidity_repr(), affine.x.c0.solidity_repr(), affine.y.c1.solidity_repr(), affine.y.c0.solidity_repr())
    }
}
impl JavaScriptRepresentable for GroupProjective<curve::g2::Parameters> {
    fn javascript_repr(&self) -> String {
        let affine = self.into_affine();
        format!("[[{} , {}], [{} , {}]]", affine.x.c1.javascript_repr(), affine.x.c0.javascript_repr(), affine.y.c1.javascript_repr(), affine.y.c0.javascript_repr())
    }
}
impl FromStrCustom for GroupProjective<curve::g2::Parameters> {
    type Err = String;

    /// Converts a string to a `G2` point
    /// Accepts the following formats: `[[0x... , 0x...], [0x... , 0x...]]` or `0x...,0x...,0x...,0x...`, which stands for `x_c1, x_c0, y_c1, y_c0`,
    /// where `...` is a hex string of 32 bytes (64 characters) for each coordinate.
    ///
    /// # Arguments
    /// * `s` - The string to parse
    /// # Returns
    /// * `Ok(G2)` - If the string is valid
    /// * `Err(String)` - If the string is invalid
    /// # Example
    /// ```
    /// use batravot_lib::G2;
    /// use batravot_lib::representation::FromStrCustom;
    /// let point_g2 = G2::from_str_c("0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef,0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef,0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef,0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef").unwrap();
    /// ```
    fn from_str_c(s: &str) -> Result<Self, Self::Err> {

        let elements: Vec<Result<CurveBaseField, String>> = s.trim().replace(" ", "").replace("[", "").replace("]", "").split(",")
            .map(|base_field| CurveBaseField::from_str_c(base_field)).collect();

        if elements.len() != 4 {
            return Err("Invalid G2 point format".to_string());
        }

        let x_c1 = elements[0].clone().map_err(|e| e.to_string())?;
        let x_c0 = elements[1].clone().map_err(|e| e.to_string())?;
        let y_c1 = elements[2].clone().map_err(|e| e.to_string())?;
        let y_c0 = elements[3].clone().map_err(|e| e.to_string())?;


        let x = CurveExtensionField::new(x_c0, x_c1);
        let y = CurveExtensionField::new(y_c0, y_c1);

        let point = G2::from(GroupAffine::<curve::g2::Parameters>::new(x, y, false));

        Ok(point)
    }
}

impl SolidityRepresentable for SchnorrSignature {
    fn solidity_repr(&self) -> String {
        format!("[{},{}]", self.s.solidity_repr(), self.e.solidity_repr())
    }
}
impl JavaScriptRepresentable for SchnorrSignature {
    fn javascript_repr(&self) -> String {
        format!("[{} , {}]", self.s.javascript_repr(), self.e.javascript_repr())
    }
}


impl SolidityRepresentable for ElectionSpecifiers {
    fn solidity_repr(&self) -> String {
        format!("{}, {}, {}, {}", self.forr.0.solidity_repr(), self.forr.1.solidity_repr(), self.against.0.solidity_repr(), self.against.1.solidity_repr())
    }
}
impl JavaScriptRepresentable for ElectionSpecifiers {
    fn javascript_repr(&self) -> String {
        format!("{}, {}, {}, {}", self.forr.0.javascript_repr(), self.forr.1.javascript_repr(), self.against.0.javascript_repr(), self.against.1.javascript_repr())
    }
}


impl SolidityRepresentable for Address {
    fn solidity_repr(&self) -> String {
        format!("0x{}", hex::encode(self.0))
    }
}
impl JavaScriptRepresentable for Address {
    fn javascript_repr(&self) -> String {
        format!("BigNumber.from(\"0x{}\")", hex::encode(self.0))
    }
}
impl FromStrCustom for Address {
    type Err = String;

    fn from_str_c(s: &str) -> Result<Self, Self::Err> where Self: Sized {
        let s = s.trim().replace(" ", "").replace("0x", "");
        let bytes = hex::decode(s).map_err(|e| e.to_string())?;
        if bytes.len() != 20 {
            return Err(format!("Invalid address length: expected 20, got {}", bytes.len()));
        }
        Ok(Address::from_slice(bytes.as_slice()))
    }
}

#[cfg(test)]
mod test_representations {
    use ark_std::rand::SeedableRng;
    use ark_std::UniformRand;
    use rand_chacha::ChaChaRng;
    use super::*;

    #[test]
    fn test_big_integer_256_representations() {
        let rng = &mut ChaChaRng::seed_from_u64(1231275789u64);
        let big_int = BigInteger256::rand(rng);
        let big_int_str = big_int.solidity_repr();
        let big_int_parsed = BigInteger256::from_str_c(&big_int_str).unwrap();
        assert_eq!(big_int, big_int_parsed);
    }

    #[test]
    fn big_integer_of_1() {
        let big_int = BigInteger256::from(1);
        let big_int_str = big_int.solidity_repr();
        let big_int_parsed = BigInteger256::from_str_c(&big_int_str).unwrap();
        assert_eq!(big_int, big_int_parsed);
    }

    #[test]
    fn test_base_field_representations() {
        let rng = &mut ChaChaRng::seed_from_u64(1231275789u64);
        let base_field = CurveBaseField::rand(rng);
        let base_field_str = base_field.solidity_repr();
        let base_field_parsed = CurveBaseField::from_str_c(&base_field_str).unwrap();
        assert_eq!(base_field, base_field_parsed);
    }

    #[test]
    fn base_field_of_1() {
        let base_field = CurveBaseField::from(1);
        let base_field_str = base_field.solidity_repr();
        let base_field_parsed = CurveBaseField::from_str_c(&base_field_str).unwrap();
        assert_eq!(base_field, base_field_parsed);
    }

    #[test]
    fn test_scalar_field_representations() {
        let rng = &mut ChaChaRng::seed_from_u64(1231275789u64);
        let scalar_field = ScalarField::rand(rng);
        let scalar_field_str = scalar_field.solidity_repr();
        let scalar_field_parsed = ScalarField::from_str_c(&scalar_field_str).unwrap();
        assert_eq!(scalar_field, scalar_field_parsed);
    }

    #[test]
    fn test_g1_representations() {
        let rng = &mut ChaChaRng::seed_from_u64(1231275789u64);
        let g1 = G1::rand(rng);
        let g1_str = g1.solidity_repr();
        // Take a substring of the string to remove the [ and ] characters
        let g1_str = &g1_str[1..g1_str.len()-1];
        let g1_parsed = G1::from_str_c(&g1_str).unwrap();
        assert_eq!(g1, g1_parsed);
    }

    #[test]
    fn parses_bn254_g1_generator_correctly() {
        let g1 = G1::prime_subgroup_generator();
        let g1_parsed = G1::from_str_c("[0x0000000000000000000000000000000000000000000000000000000000000001, 0x0000000000000000000000000000000000000000000000000000000000000002]").unwrap();
        assert_eq!(g1, g1_parsed);
    }

    #[test]
    fn generates_a_correct_bn254_generator_representation() {
        let g1 = G1::prime_subgroup_generator();
        let g1_str = g1.solidity_repr();
        assert_eq!(g1_str, "[0x0000000000000000000000000000000000000000000000000000000000000001 , 0x0000000000000000000000000000000000000000000000000000000000000002]");
    }

    #[test]
    fn test_g2_representations() {
        let rng = &mut ChaChaRng::seed_from_u64(1231275789u64);
        let g2 = G2::rand(rng);
        let g2_str = g2.solidity_repr();
        // Take a substring of the string to remove the [ and ] characters
        let g2_str = g2_str.replace("[", "").replace("]", "");
        let g2_parsed = G2::from_str_c(&g2_str).unwrap();
        assert_eq!(g2, g2_parsed);
    }



    #[test]
    fn test_address_representations() {
        let rng = &mut ChaChaRng::seed_from_u64(1231275789u64);
        let address = Address::rand(rng);
        let address_str = address.solidity_repr();
        let address_parsed = Address::from_str_c(&address_str).unwrap();
        assert_eq!(address, address_parsed);
    }


}