use ark_ec::ProjectiveCurve;
use ark_ec::short_weierstrass_jacobian::GroupProjective;
use ark_ff::{BigInteger, BigInteger256};

use crate::el_curve::{curve, CurveBaseField, ScalarField};

/// This trait is used to convert a complex type to a type that Solidity can understand
pub trait SolidityRepresentable {
    fn solidity_repr(&self) -> String;
}
/// This trait is used to convert a complex type to a type that Java Script can understand
trait JavaScriptRepresentable {
    fn javascript_repr(&self) -> String;
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

impl SolidityRepresentable for ScalarField {
    fn solidity_repr(&self) -> String {
        self.0.solidity_repr()
    }
}
impl JavaScriptRepresentable for ScalarField {
    fn javascript_repr(&self) -> String {
        self.0.javascript_repr()
    }
}

impl SolidityRepresentable for CurveBaseField {
    fn solidity_repr(&self) -> String {
        self.0.solidity_repr()
    }
}
impl JavaScriptRepresentable for CurveBaseField {
    fn javascript_repr(&self) -> String {
        self.0.javascript_repr()
    }
}

impl SolidityRepresentable for GroupProjective<curve::g1::Parameters> {
    fn solidity_repr(&self) -> String {
        let affine = self.into_affine();
        format!("[{}, {}]", affine.x.solidity_repr(), affine.y.solidity_repr())
    }
}
impl JavaScriptRepresentable for GroupProjective<curve::g1::Parameters> {
    fn javascript_repr(&self) -> String {
        let affine = self.into_affine();
        format!("[{}, {}]", affine.x.javascript_repr(), affine.y.javascript_repr())
    }
}


impl SolidityRepresentable for GroupProjective<curve::g2::Parameters> {
    fn solidity_repr(&self) -> String {
        let affine = self.into_affine();
        format!("[[{}, {}], [{}, {}]]", affine.x.c1.solidity_repr(), affine.x.c0.solidity_repr(), affine.y.c1.solidity_repr(), affine.y.c0.solidity_repr())
    }
}
impl JavaScriptRepresentable for GroupProjective<curve::g2::Parameters> {
    fn javascript_repr(&self) -> String {
        let affine = self.into_affine();
        format!("[[{}, {}], [{}, {}]]", affine.x.c1.javascript_repr(), affine.x.c0.javascript_repr(), affine.y.c1.javascript_repr(), affine.y.c0.javascript_repr())
    }
}