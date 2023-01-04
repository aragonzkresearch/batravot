// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;

// Import the BN254 library
import "./BN254.sol";


library SchnorrSignature {

    struct Sign {
        uint256 s;
        uint256 e;
    }

    /**
     * We use the schnorr signature scheme described in Wikipedia - https://en.wikipedia.org/wiki/Schnorr_signature
     * As we do not care about the message, we consider that M is blank
     * For the hash function we use keccak256
     */
    function verify(BN254.G1 memory pubKey, Sign memory sign) internal view returns (bool) {
        require(sign.e != 0, "`e` cannot be 0");

        BN254.G1 memory gS = BN254.mul(BN254.P1(), sign.s);
        BN254.G1 memory yE = BN254.mul(pubKey, sign.e);
        BN254.G1 memory rV = BN254.pointAdd(gS, yE);

        // Please note that we use for both Solidity and Rust the same hash function
        // And we hash the point in the same way - only the X coordinate
        uint256 eComputed = uint256(keccak256(abi.encodePacked(rV.X))) % BN254.R;
        return eComputed == sign.e;
    }

}

// This is a test contract to verify the Schnorr signature is working
contract SchnorrSignatureTest {

    /**
      * Check that the contract receives the correct signature for the given public key
      */
    function verifySignature(BN254.G1 memory pubKey, SchnorrSignature.Sign memory sign) public view returns (bool) {
        uint256 k = 0x269A2F04B8A92C5C13F4E3EFFB1CA64AE90F34805543270B3C9E6120309687DC;
        BN254.G1 memory r = BN254.mul(BN254.P1(), k);
        BN254.G1 memory r_used = BN254.G1 ({
            X: 0x0F50DC7AEBC8141536AE3BF799E1030ED88B019EECCD384F7812AA99EB460126,
            Y: 0x081560BBCB84357D0E01038EA2484A6498B59B9DD67EB810E8A2F374DF2E830F
        });

        require(r.X == r_used.X, "r X incorrect");
        require(r.Y == r_used.Y, "r Y incorrect");

        uint256 hash = uint256(keccak256(abi.encodePacked(r.X)));
        uint256 hash_used = 0x697b0d82f3c7b97aa03262e0d18a6233bc25da9a5c6cf87e75b6e81464fa604e;
        require(hash == hash_used, "hash incorrect");
        uint256 e = hash % BN254.R;
        require(e == sign.e, "e incorrect");
        
        // We could not check s because of an overflow during the multiplication
        // To do the check we would have to multiply in the field, which is not implemented
        
        return SchnorrSignature.verify(pubKey, sign);
    }
}
