# Multiply Gobbler Vault

Multiply Gobbler Vault **multiplies** your Gobblers.

1. Users can [deposit](https://github.com/ankitchiplunkar/Gobbler-Vault/blob/main/contracts/MultiplyGobblerVault.sol#L27) their Gobblers in the vault and receive ERC20 compliant `mGOB` tokens in return, proportional to the multiplier of the deposited Gobbler.
2. Similarly users can [withdraw](https://github.com/ankitchiplunkar/Gobbler-Vault/blob/main/contracts/MultiplyGobblerVault.sol#L37) any Gobbler from the vault by burning `mGOB` tokens proportional to the multiplier of the withdrawn Gobbler.
3. `mGOB` can be bought, sold or LP'ed on Uniswap.
4. The Goo generated from the vault can be used to [mint](https://github.com/ankitchiplunkar/Gobbler-Vault/blob/main/contracts/MultiplyGobblerVault.sol#L54) Gobblers based on a strategy.
5. Current [strategy](https://github.com/ankitchiplunkar/Gobbler-Vault/blob/main/contracts/MultiplyGobblerVault.sol#L48) is MAX BIDDING!, i.e. buy Gobbler as soon as enough GOO is available.
6. When Gobblers are in the vault then the vault can also [mint](https://github.com/ankitchiplunkar/Gobbler-Vault/blob/main/contracts/MultiplyGobblerVault.sol#L60) a Legendary Gobbler. 
7. As more multiplier gets accumulated into the vault, price of `mGOB` [appreciates](https://github.com/ankitchiplunkar/Gobbler-Vault/blob/main/contracts/MultiplyGobblerVault.sol#L17). If a user deposits a Gobbler and Vault mints another Gobbler (using Goo) then a user can withdraw twice the amount of Gobblers for the same amount of mGOB tokens. i.e. **Multiplying your Gobblers**


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

[MIT](./LICENSE.md) © Paul Razvan Berg
