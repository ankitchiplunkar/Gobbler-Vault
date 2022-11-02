import type { BigNumber } from "@ethersproject/bignumber";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import chai from "chai";
import { solidity } from "ethereum-waffle";
import { ethers } from "hardhat";

import { LibGOO, MaxBiddingMintStrategy, MockArtGobbler, MockGoo, MultiplyGobblerVault } from "../types/contracts";
import {
  IArtGobbler__factory,
  LibGOO__factory,
  MaxBiddingMintStrategy__factory,
  MockArtGobbler__factory,
  MockGoo__factory,
  MultiplyGobblerVault__factory,
} from "../types/factories/contracts";

async function main(): Promise<void> {
  // Hardhat always runs the compile task when running scripts through it.
  // If this runs in a standalone fashion you may want to call compile manually
  // to make sure everything is compiled
  // await run("compile");
  // We get the contract to deploy
  let artGobblerGoerli = "0xd79AEC30B07384EEabd81cCDE06644ba2DA39527";
  let gooGoerli = "0x4125d8C1d07f5900ee8Fa83c36F2BD67E513f236";
  let address = "0xdb3d3AF153cB02f0Bc44621Db82289280e93500F";

  const artGobbler = await IArtGobbler__factory.connect(artGobblerGoerli, ethers.providers);
  console.log(artGobbler.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });
