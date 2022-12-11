use ark_ec::ProjectiveCurve;
use ark_ff::{BigInteger, BigInteger256, Field, PrimeField, Zero};
use sha256::digest;
use crate::curve_abstr::{SolidityConverter, hash, G1, G2};

pub struct ElectionSpecifiers {
    pub(crate) no: (G1, G2),
    pub(crate) yes: (G1, G2),
}

impl ElectionSpecifiers {
    pub fn new(election_id: BigInteger256) -> ElectionSpecifiers {
        let mut no_unhashed_specifier = election_id.to_bytes_le(); no_unhashed_specifier.push(0u8);
        let mut yes_unhashed_specifier = election_id.to_bytes_le(); yes_unhashed_specifier.push(1u8);

        let no = hash(&no_unhashed_specifier);
        let yes = hash(&yes_unhashed_specifier);

        ElectionSpecifiers {
            no,
            yes,
        }
    }

    pub fn check_specifiers(&self, election_id: BigInteger256) -> bool {
        let recreated_specifiers = ElectionSpecifiers::new(election_id);

        self.no == recreated_specifiers.no && self.yes == recreated_specifiers.yes
    }


    pub fn to_solidity(&self) -> String {
        format!("{},{},{},{}", SolidityConverter::convert_g1(&self.no.0), SolidityConverter::convert_g2(&self.no.1), SolidityConverter::convert_g1(&self.yes.0), SolidityConverter::convert_g2(&self.yes.1))
    }





}

