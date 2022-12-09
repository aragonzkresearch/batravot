use ark_ec::ProjectiveCurve;
use ark_ff::{BigInteger, BigInteger256, Field, PrimeField, Zero};
use sha256::digest;
use crate::{G1, G2, ScalarField};

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
}

fn hash(x: &Vec<u8>) -> (G1, G2) {
    let binding = digest(x.as_slice());
    let hash = binding.as_bytes();

    let scalar_hash = ScalarField::from_random_bytes(hash).unwrap();

    let g1hash = G1::prime_subgroup_generator().mul(scalar_hash.into_repr());
    let g2hash = G2::prime_subgroup_generator().mul(scalar_hash.into_repr());

    // Check that the g1hash is not the identity element
    assert!(g1hash != G1::zero());
    assert!(g2hash != G2::zero());

    (g1hash, g2hash)
}