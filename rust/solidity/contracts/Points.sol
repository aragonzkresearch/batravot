// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;

library Points {
    struct G1 {
        uint X;
        uint Y;
    }

    struct G2 {
        uint[2] X;
        uint[2] Y;
    }


    /**
     * The generator point of G1
     */
    function P1() internal pure returns (G1 memory) {
        return  G1(
            0x0000000000000000000000000000000000000000000000000000000000000001,
            0x0000000000000000000000000000000000000000000000000000000000000002);
    }


    /**
     * The generator point of G2
     */
    function P2() internal pure returns (G2 memory ) {
        return G2(
            [0x198E9393920D483A7260BFB731FB5D25F1AA493335A9E71297E485B7AEF312C2,
            0x1800DEEF121F1E76426A00665E5C4479674322D4F75EDADD46DEBD5CD992F6ED],

            [0x090689D0585FF075EC9E99AD690C3395BC4B313370B38EF355ACDADCD122975B,
            0x12C85EA5DB8C6DEB4AAB71808DCB408FE3D1E7690C43D37B4CE6CC0166FA7DAA]
        );
    }

    /**
     * The inverse of a generator P2
     */
    function P2Neg() internal pure returns (G2 memory ) {
        return G2(
            [0x198E9393920D483A7260BFB731FB5D25F1AA493335A9E71297E485B7AEF312C2,
            0x1800DEEF121F1E76426A00665E5C4479674322D4F75EDADD46DEBD5CD992F6ED],

            [0x275DC4A288D1AFB3CBB1AC09187524C7DB36395DF7BE3B99E673B13A075A65EC,
            0x1D9BEFCD05A5323E6DA4D435F3B617CDB3AF83285C2DF711EF39C01571827F9D]
        );
    }

    function naiveEqual(G1 memory a, G1 memory b) internal pure returns (bool) {
        return a.X == b.X && a.Y == b.Y;
    }

    /// @return the result of computing the pairing check
    /// e(p1[0], p2[0]) *  .... * e(p1[n], p2[n]) == 1
    /// For example pairing([P1(), P1().negate()], [P2(), P2()]) should
    /// return true.
    function pairing(G1[] memory p1, G2[] memory p2) internal view returns (bool) {
        require(p1.length == p2.length,"pairing-lengths-failed");
        uint elements = p1.length;
        uint inputSize = elements * 6;
        uint[] memory input = new uint[](inputSize);
        for (uint i = 0; i < elements; i++)
        {
            input[i * 6 + 0] = p1[i].X;
            input[i * 6 + 1] = p1[i].Y;
            input[i * 6 + 2] = p2[i].X[0];
            input[i * 6 + 3] = p2[i].X[1];
            input[i * 6 + 4] = p2[i].Y[0];
            input[i * 6 + 5] = p2[i].Y[1];
        }
        uint[1] memory out;
        bool success;
        // solium-disable-next-line security/no-inline-assembly
        assembly {
            success := staticcall(sub(gas(), 2000), 8, add(input, 0x20), mul(inputSize, 0x20), out, 0x20)
        // Use "invalid" to make gas estimation work
            switch success case 0 { invalid() }
        }
        require(success,"pairing-opcode-failed");
        return out[0] != 0;
    }
    /// @return the negation of p, i.e. p.add(p.negate()) should be zero.
    function negate(G1 memory p) internal pure returns (G1 memory) {
        // The prime q in the base field F_q for G1
        uint q = 21888242871839275222246405745257275088696311157297823662689037894645226208583;
        if (p.X == 0 && p.Y == 0)
            return G1(0, 0);
        return G1(p.X, q - (p.Y % q));
    }

    /// return the sum of two points of G1
    function pointAdd(G1 memory p1, G1 memory p2) internal returns (G1 memory r) {
        uint[4] memory input;
        input[0] = p1.X;
        input[1] = p1.Y;
        input[2] = p2.X;
        input[3] = p2.Y;
        bool success;
        assembly {
            success := call(sub(gas(), 2000), 6, 0, input, 0xc0, r, 0x60)
        // Use "invalid" to make gas estimation work
            switch success case 0 {invalid()}
        }
        require(success);
    }

    /// return the product of a point on G1 and a scalar, i.e.
    /// p == p.mul(1) and p.add(p) == p.mul(2) for all points p.
    function mul(G1 memory p, uint   s) internal returns (G1 memory r) {
        uint[3] memory input;
        input[0] = p.X;
        input[1] = p.Y;
        input[2] = s;
        bool success;
        assembly {
            success := call(sub(gas(), 2000), 7, 0, input, 0x80, r, 0x60)
        // Use "invalid" to make gas estimation work
            switch success case 0 {invalid()}
        }
        require(success);
    }

    /**
     * Hash a message value to the G1 point
     */
    function hashToG1(bytes memory message) internal returns (G1 memory) {
        uint256 h = uint256(keccak256(message));

        G1 memory hG1 = mul(P1(), h);
        while (!naiveEqual(hG1, P1())) {
            hG1 = mul(P1(), h);
        }

        return hG1;
    }
}
