import { ethers } from "hardhat";

import { IArtGobbler__factory } from "../types/factories/contracts";

async function main(): Promise<void> {
  // Hardhat always runs the compile task when running scripts through it.
  // If this runs in a standalone fashion you may want to call compile manually
  // to make sure everything is compiled
  // await run("compile");
  // We get the contract to deploy
  const artGobblerGoerli = "0xd79AEC30B07384EEabd81cCDE06644ba2DA39527";

  const artGobbler = IArtGobbler__factory.connect(artGobblerGoerli, ethers.providers);
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
