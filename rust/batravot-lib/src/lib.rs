mod el_curve;
pub(crate) mod election_specifiers;
mod crypto;
pub(crate) mod types;
pub mod representation;

/// Re-export key functionality to consumers of the library
/// Re-export cryptography functions of the BatRaVot
pub use crypto::{voter, batcher, verifier};
pub use crypto::schnorr::SchnorrKnowledgeProof;
pub use el_curve::{G1, G2, ScalarField, CurveBaseField};

// Re-export useful structs
pub use election_specifiers::ElectionSpecifiers;
pub use types::{Vote};
