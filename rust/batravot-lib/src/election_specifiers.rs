use std::ops::Deref;
use ark_ff::{BigInteger, BigInteger256};
use sha3::{Digest, Keccak256};

use crate::el_curve::{convert_to_point, G1, G2};


///! This module contains the logic to help with the election process
///! It contains the logic to create the election specifiers as well as the logic to check the election specifiers

/// The election specifiers are used to generate the ballots for a given election
#[derive(PartialEq)]
pub struct ElectionSpecifiers {
    pub no: (G1, G2),
    pub yes: (G1, G2),
}


impl ElectionSpecifiers {
    /// The function creates the election specifiers from the election id
    /// The election id is a 256 bit number that is used to uniquely identify an election
    /// We hash the election id with a 0 or 1 to create the election specifiers
    /// We then convert the hash to a point on the curve and the curve extension
    /// The election specifiers are then the points on the curve and the curve extension
    pub fn new(election_id: BigInteger256) -> ElectionSpecifiers {
        // We combine the election id with a 0 to create the base of no specifier
        let mut no_unhashed_specifier = election_id.to_bytes_le();
        no_unhashed_specifier.push(0u8);
        // We combine the election id with a 1 to create the base of yes specifier
        let mut yes_unhashed_specifier = election_id.to_bytes_le();
        yes_unhashed_specifier.push(1u8);

        let no = Self::hash_into_ec_points(no_unhashed_specifier.deref());
        let yes = Self::hash_into_ec_points(yes_unhashed_specifier.deref());

        let specifier = ElectionSpecifiers {
            no,
            yes,
        };

        specifier
    }
    
    pub fn from(election_id: u64) -> ElectionSpecifiers {
        // We convert the election id to a 256 bit number
        let election_id = BigInteger256::from(election_id);
        Self::new(election_id)
    }

    /// This function hashes the provided bytes into a point on the curve and the curve extension
    /// The function uses the Keccak256 hash function to hash the bytes
    fn hash_into_ec_points(value: &[u8]) -> (G1, G2) {

        let hash = Keccak256::digest(value);

        return convert_to_point(hash.as_slice());
    }


    /// This function check that the provided election specifiers have been generated from the provided election id
    pub fn check_specifiers(&self, election_id: BigInteger256) -> bool {
        let recreated_specifiers = ElectionSpecifiers::new(election_id);

        // Check that the recreated specifiers are the same as the provided specifiers
        self == &recreated_specifiers
    }
}
