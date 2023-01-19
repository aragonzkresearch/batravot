# BatRaVot Implementation for Ethereum 

This is a Rust implementation of the BatRaVot voting protocol. It is designed to support low gas const voting based on the amount of ERC20 tokens a user holds.
It is also easy to extend to support ERC721 tokens as well as alternative voting methods.

You can read more about the protocol in the [article](https://research.aragon.org/snarv.html).

## Project Status

This is a PoC implementation of the protocol. It is not production ready and should not be used in production.

## Description

The protocol is designed to make the voting process cheaper on the Ethereum chain. It achieves this by batching multiple votes together off-chain into a single transaction. 
This is done by generating a vote ballot for each voter, that contains a vote proof, and then combining all vote proofs into a single proof, that is then send to the Ethereum.
The Ethereum contract then verifies the proof and tallies the votes.

There are three types of participants in the protocol:
1. The **Voter**, who is the person who wants to vote. They generate a vote ballot, and send it to the Batcher or directly to the Verifier (in our case Ethereum contract).
2. The **Batcher**, the person who batches the vote ballots together. They generate a batch proof, and send it to the Verifier (in our case Ethereum contract).
3. The **Verifier**, the person who verifies the batch proof and tallies the votes. In our case, this is the Ethereum contract.

## Components

The code consists of two parts:
1. The Rust backend, which is used to generate the vote ballots and batch proofs. 
2. The Solidity contract, which is used to verify the batch proofs and tally the votes. 


