// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;

// Import the BN254 library
import "./BN254.sol";


library SchnorrKnowledgeProof {

    struct Proof {
        BN254.G1 t;
        uint256 s;
    }

    /**
     * We use the schnorr signature scheme described in Wikipedia - https://en.wikipedia.org/wiki/Schnorr_signature
     * As we do not care about the message, we consider that M is blank
     * For the hash function we use keccak256
     */
    function verify(BN254.G1 memory pubKey, Proof memory proof) internal view returns (bool) {

        // Generate challenge parameter C by combining hashes of both t and public key
        // Please note that we use for both Solidity and Rust the same hash function Keccak256
        uint256 c = uint256(keccak256(abi.encode(proof.t.X, proof.t.Y, pubKey.X, pubKey.Y))) % BN254.R;
        
        // Evaluate left hand side: g^s
        BN254.G1 memory lhs = BN254.mul(BN254.P1(), proof.s);
        
        // Evaluate right hand side: y^c * t
        BN254.G1 memory rhs = BN254.pointAdd(BN254.mul(pubKey, c), proof.t);

        // Check that lhs equals to rhs. If so, the proof is accepted
        return lhs.X == rhs.X && lhs.Y == rhs.Y;
    }
}

contract SchnorrKnowledgeProofTest  {

    /**
     * Check that Hashing of multiple arguments works
     */
    function hashTest(BN254.G1 memory pubKey, SchnorrKnowledgeProof.Proof memory proof, uint256 expectedHash) public view returns (bool) {
        uint256 hash = uint256(keccak256(abi.encode(proof.t.X, proof.t.Y, pubKey.X, pubKey.Y))) % BN254.R;
        
        return hash == expectedHash;
    }

    /**
      * Check that the contract receives the correct signature for the given public key
      */
    function testVerify(BN254.G1 memory pubKey, SchnorrKnowledgeProof.Proof memory proof) public view returns (bool) {
        return SchnorrKnowledgeProof.verify(pubKey, proof);
    }
}
