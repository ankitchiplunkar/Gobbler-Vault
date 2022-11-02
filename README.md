# Multiply Gobbler Vault

Multiply Gobbler Vault **multiplies** your Gobblers.

## What is its purpose?

Increases accessibility!

- Gobbler holders can stake their Gobbler in the vault and let the vault manage buying of new Gobbler.
- Gobblers are only 10k but mGobs are many. Users who cannot get in a mint can buy mGOB and partake in the upside of the Gobbler ecosystem.

## How does it work?

1. Users can `deposit` their Gobblers in the vault and receive ERC20 compliant `mGOB` tokens in return, proportional to the multiplier of the deposited Gobbler.
2. Similarly users can `withdraw` any Gobbler from the vault by burning `mGOB` tokens proportional to the multiplier of the withdrawn Gobbler.
3. `mGOB` can be bought, sold or LP'ed on Uniswap.
4. The Goo generated from the vault can be used to `mint` Gobblers based on a strategy.
5. Current strategy is MAX BIDDING!, i.e. buy Gobbler as soon as enough GOO is available.
6. When Gobblers are in the vault then the vault can also `mint` a Legendary Gobbler.
7. As more multiplier gets accumulated into the vault, price of `mGOB` appreciates. If a user deposits a Gobbler and the Vault mints another Gobbler (using Goo) then the user can withdraw twice the amount of Gobblers for the same amount of `mGOB` tokens. i.e. **Multiplying your Gobblers**

## Who can use this?

Gobbler's are inflationary. Holders will have to **actively** mint Gobblers using Goo else they will lose market share in an inflationary game.

- **Artists**: Want to not be diluted but don't know the optimal strategy or cannot actively play. Deposit your Gobbler.
- **6, 7, 8 multipliers**: Analysis shows that players who hold Gobblers with 9 multipliers will buy all the Gobblers in first 2 months (if MAX BIDDING), hattip [paco0x](https://twitter.com/paco0x). Want to participate in the first 2 months? Deposit your Gobbler.
- **Gobbler sellers**: Want to sell your gobbler ASAP but don't know hoz to price it efficiently on Opensea? Deposit your Gobbler and sell `mGOB` on Uniswap (you will get the floor price)
- **Gobbler buyers**: Want to buy a Gobbler but dont have enough Goo. Buy `mGOB` on Uniswap and withdraw a Gobbler.

## Deployments

### Goerli

LibGOO = [0xd637af1db8635b29edf462Cb01c0fe5E11902F3E](https://goerli.etherscan.io/address/0xd637af1db8635b29edf462Cb01c0fe5E11902F3E#code)

MultiplyGobblerVault =
[0x94f6e4a405e0088944C4D23B58405238289DeCF2](https://goerli.etherscan.io/address/0x94f6e4a405e0088944C4D23B58405238289DeCF2#code)

MaxBiddingMintStrategy =
[0xa6fC5ef4359783146258f6051cf6457b349B94A1](https://goerli.etherscan.io/address/0xa6fC5ef4359783146258f6051cf6457b349B94A1#code)

## Usage

### Pre Requisites

Before being able to run any command, you need to create a `.env` file and set a BIP-39 compatible mnemonic as an environment variable. You can follow the example in `.env.example`. If you don't already have a mnemonic, you can use this [website](https://iancoleman.io/bip39/) to generate one.

Then, proceed with installing dependencies:

```sh
$ yarn install
```

### Compile

Compile the smart contracts with Hardhat:

```sh
$ yarn compile
```

### TypeChain

Compile the smart contracts and generate TypeChain bindings:

```sh
$ yarn typechain
```

### Test

Run the tests with Hardhat:

```sh
$ yarn test
```

### Lint Solidity

Lint the Solidity code:

```sh
$ yarn lint:sol
```

### Lint TypeScript

Lint the TypeScript code:

```sh
$ yarn lint:ts
```

### Coverage

Generate the code coverage report:

```sh
$ yarn coverage
```

### Clean

Delete the smart contract artifacts, the coverage reports and the Hardhat cache:

```sh
$ yarn clean
```

## License

[MIT](./LICENSE.md)

Template © Paul Razvan Berg
