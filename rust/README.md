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
1. The voter, who is the person who wants to vote. They generate a vote ballot, and send it to the Batcher or directly to the Verifier (in our case Ethereum contract).
2. The Batcher, the person who batches the vote ballots together. They generate a batch proof, and send it to the Verifier (in our case Ethereum contract).
3. The Verifier, the person who verifies the batch proof and tallies the votes. In our case, this is the Ethereum contract.

## Components

The code consists of two parts:
1. The Rust backend, which is used to generate the vote ballots and batch proofs. 
2. The Solidity contract, which is used to verify the batch proofs and tally the votes. 

## Usage

### Install Dependencies
1. Install Rust and Cargo. You can find instructions [here](https://www.rust-lang.org/tools/install).
2. [Optional] Install the Node and NPM. You can find instructions [here](https://nodejs.org/en/download/).

### [Optional] Deploy the contract

You can use the smart contract deployed to the Sepolia testnet [here](https://sepolia.etherscan.io/address/0x6aB39dE24B1D60813320c28D9B5bf1688195d088#writeContract), or deploy your own.

You can deploy your own contract by running the following command:
```
 cd solidity
 npx hardhat run scripts/deploy.js --network <network>
```
where `<network>` is the network you want to deploy to. You can find and change the list of networks in the `solidity/hardhat.config.js` file.
Make sure to also provide the environment variables for the Ethereum `PRIVATE_KEY` and the network `API_URL` you want to deploy to.

**Note:** this script will deploy both the batravot contract and the token contracts. If you want to deploy only the batravot contract and use an existing token, you will need to change the `deploy.js` file.

### Register as a voter

Before you can start voting in the protocol, you need to register as a voter. This will require you to create a special Voting Private Key and corresponding Voting Public Key, 
as well as the proof that you are the owner of the Voting Public Key. You can do this by running the following command:

```
  cargo run -p batravot-voter -- keyproof
```
Follow the prompts to generate the Voting Private Key, Voting Public Key, and the proof.

You will then need to call the `registerVoter` function in the contract with the Voting Public Key and the proof. You can use Etherscan to do this.
The address you will call the function from will then be associated with the Voting Public Key, and will be used to estimate how many voting power you have.


Alternatively, you can also delegate your voting power to another address. This will allow you to vote on behalf of the other address. The key feature is that
this does not require to lock your tokens. To do so, the person who would like to delegate their voting power will need to call the `registerVoter` function,
however, instead of proving their own Voting Public Key, they need to specify the Voting Public Key of the person they would like to delegate their voting power to.
The person should also provide them with the proof that they are the owner of the Voting Public Key.

### Start a new Election

To start a new election, you will need to call the `createElection` function in the contract. You can use Etherscan to do this.
The function will require you to provide the topic as well as an Election Specifier. The Election Specifier is a unique identifier for the election, and is used by the protocol.

Anyone can generate this Election Specifier, by running the following command:

```
  cargo run -p batravot-voter -- spec
```

As each specifier is unique to an election, you will be asked to provide the election id. Make sure that the election id is equal to the next election id in the contract.

### Generate a Vote Ballot

Now, once you have registered as a voter in the contract and started an election, you can vote.

To vote, you will need a Voting Private Key we have generated earlier as well as the election id you will be voting in. To generate a vote ballot, run the following command:

```
  cargo run -p batravot-voter -- vote
```

Follow the prompts to provide the Voting Private Key and the election id. The command will generate a vote ballot.

You can then either send the vote ballot to the Batcher, or directly to the Verifier (in our case the contract). To send the vote ballot to the contract, you can use Etherscan to call the `vote` function in the contract.

### Aggregate the Votes

As a Batcher you should now aggregate the votes you have received from the voters. The protocol is done in such way, that you can not
fake the votes, however you can reduce the overall gas cost by batching the votes together. To do this, you will need to run the following command:

```
  cargo run -p batravot-batcher 
```

This will start an interactive prompt, where you will be asked to provide the election id, the number of voters, and the vote ballots.
There is another option to provide the vote ballots as a file. For that, run the following command:

```
  cargo run -p batravot-batcher -- --file <file>
```

where `<file>` is the path to the file containing the vote ballots. The file should contain one vote ballot per line in the following format:

```
  <voting public key>|<vote>|<vote proof>|<voter ethereum address>
```

where `<voting public key>` is the voting public key of the voter, `<vote proof>` is the vote proof generated by the voter, 
`<vote>` is the vote the voter has cast, with values either `for` (`+`) or `against` (`-`), and `<voter ethereum address>` is the Ethereum address of the voter.

The command will generate a batch proof, which you can then send to the Verifier (in our case the contract). To send the batch proof to the contract, you can use Etherscan to call the `submitVotesWithProof` function in the contract.
The reason we also need to provide the Ethereum address of the voter is that the contract needs to know which address voted how.

### Verify the Votes

The vote verification is done automatically when the `submitVotesWithProof` function is called. The contract will verify the batch proof and tally the votes if the proof is correct.
The contract also stores information about how each Voter Public Key voted, so if someone tries to vote twice, the contract only accept the last vote.

### Close the Election

Once the election is over, you can close it by calling the `closeElection` function in the contract. This will calculate the result of the election.
The current mechanism is set to evaluate the voting power based on the amount of token someone has when the `closeElection` function is called.
However, as no other logic of the protocol depends on the voting power, it can be changed to any other mechanism.

