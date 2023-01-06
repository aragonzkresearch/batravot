/// Voter is the person who votes in the election.
pub mod voter {
    use ark_ec::group::Group;
    use ark_ec::ProjectiveCurve;
    use ark_ff::PrimeField;
    use crate::el_curve::{G1, ScalarField};

    /// This function generates a vote proof from a correct specifier and a private key
    /// specifier: The correct specifier for the vote
    /// prk: The private key of the voter
    /// return: The vote proof
    pub fn generate_vote_proof(prk: &ScalarField, specifier: &G1) -> G1 {
        (&specifier).mul(prk)
    }

    /// This function based on the voters private key generates a public key
    /// prk: The private key of the voter
    /// return: The public key of the voter
    pub fn generate_public_key(prk: &ScalarField) -> G1 {
        (&G1::prime_subgroup_generator()).mul(prk)
    }

    /// This function generates a [ScalarField] private key from a [Vec<u8>]
    /// prk: The private key of the voter as a [Vec<u8>]
    /// return: The private key of the voter as a [ScalarField]
    pub fn convert_private_key(prk: &[u8]) -> ScalarField {
        ScalarField::from_be_bytes_mod_order(prk)
    }
}

/// Batcher is the person who batches the votes and generates the election proof
pub mod batcher {
    use ark_ff::Zero;
    use crate::el_curve::G1;

    /// This function generates a proof for vote aggregation
    /// vote_proofs: The proofs of the votes to aggregate
    pub fn generate_batched_election_proof(vote_proofs: &Vec<&G1>) -> G1 {

        // The proof is the sum of all the vote proofs
        let proof = vote_proofs.iter()
            .fold(G1::zero(), |acc, x| acc + *x);

        proof
    }

    #[cfg(test)]
    mod tests {
        use ark_ec::ProjectiveCurve;
        use crate::ScalarField;
        use super::*;

        #[test]
        fn test_generate_aggregation_proof() {
            let proof1 = G1::prime_subgroup_generator();
            let proof2 = G1::prime_subgroup_generator().mul(ScalarField::from(2u64).0);
            let proof3 = G1::prime_subgroup_generator().mul(ScalarField::from(3u64).0);

            let proofs = vec![&proof1, &proof2, &proof3];

            let proof = generate_batched_election_proof(&proofs);

            assert_eq!(proof, proof1 + proof2 + proof3);
        }

        #[test]
        fn election_proof_of_one_proof_equals_to_that_proof() {
            let proof = G1::prime_subgroup_generator();
            let proof_vec = vec![&proof];
            let aggregation_proof = generate_batched_election_proof(&proof_vec);
            assert_eq!(proof, aggregation_proof);
        }
    }
}

/// Verifier is the person who verifies the election proof to check if the election is valid
pub mod verifier {
    use std::ops::Neg;
    use ark_ec::{PairingEngine, ProjectiveCurve};
    use ark_ff::{One, Zero};
    use crate::el_curve::{Curve, G1, G2};
    use crate::election_specifiers;

    /// This function verifies votes proof
    /// It requires operations on G2, which are not supported inside the current EVM
    /// yes_vote_keys: The public keys of the voters who voted yes
    /// no_vote_keys: The public keys of the voters who voted no
    /// proof: The proof that the votes are valid
    /// specifiers: The election specifiers
    pub fn validate_election_proof(for_vote_keys: &Vec<G1>, against_vote_keys: &Vec<G1>, proof: &G1, specifiers: &election_specifiers::ElectionSpecifiers) -> bool {
        // Calculate the sum of all the vote proofs for those who voted yes and no
        let for_vote_sum = for_vote_keys.iter()
            .fold(G1::zero(), |acc, x| acc + x);

        let against_vote_sum = against_vote_keys.iter()
            .fold(G1::zero(), |acc, x| acc + x);

        // Compute the proof pairing
        let lhs = Curve::pairing(proof.clone(), G2::prime_subgroup_generator());
        // Compute the product of pairing of the sum of keys that voted yes and the yes specifier
        // And the pairing of the sum of keys that voted no and the no specifier
        let rhs =
            Curve::pairing(for_vote_sum, specifiers.forr.1.clone())
                *
                (Curve::pairing(against_vote_sum, specifiers.against.1.clone()));

        // If the election proof is valid, the pairing of the valid votes and the generator should be equal to the product of the pairings of the sum of keys that voted yes and the yes specifier
        lhs == rhs
    }

    /// This function verifies votes proof
    /// It requires only operations on G1, which makes it compatible with the EVM
    /// yes_vote_keys: The public keys of the voters who voted yes
    /// no_vote_keys: The public keys of the voters who voted no
    /// proof: The proof that the votes are valid
    /// specifiers: The election specifiers
    pub fn validate_election_proof_evm(for_vote_keys: &Vec<G1>, against_vote_keys: &Vec<G1>, proof: &G1, specifiers: &election_specifiers::ElectionSpecifiers) -> bool {
        // Calculate the sum of all the vote proofs for those who voted yes and no
        let for_key_sum = for_vote_keys.iter()
            .fold(G1::zero(), |acc, x| acc + x);

        let against_key_sum = against_vote_keys.iter()
            .fold(G1::zero(), |acc, x| acc + x);

        // We will branch based on if there were voters or not for particular type
        // We will calculate the product of correct pairings
        let proof_pairing = Curve::pairing(proof.clone(), G2::prime_subgroup_generator().neg());
        let product = proof_pairing * if against_vote_keys.is_empty() {
            Curve::pairing(for_key_sum, specifiers.forr.1.clone())
        } else if for_vote_keys.is_empty() {
            Curve::pairing(against_key_sum, specifiers.against.1.clone())
        } else {
            let against_key_sum_pairing = Curve::pairing(against_key_sum.clone(), specifiers.against.1.clone());
            let for_key_sum_pairing = Curve::pairing(for_key_sum.clone(), specifiers.forr.1.clone());
            against_key_sum_pairing * for_key_sum_pairing
        };

        // If the product is one, everything went as planned
        product.is_one()
    }
}



pub(crate) mod schnorr;