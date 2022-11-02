import { ethers } from "hardhat";

import { MaxBiddingMintStrategy__factory, MultiplyGobblerVault__factory } from "../types/factories/contracts";

async function main(): Promise<void> {
  // Hardhat always runs the compile task when running scripts through it.
  // If this runs in a standalone fashion you may want to call compile manually
  // to make sure everything is compiled
  // await run("compile");
  // We get the contract to deploy
  const artGobblerGoerli = "0xd79AEC30B07384EEabd81cCDE06644ba2DA39527";
  const gooGoerli = "0x4125d8C1d07f5900ee8Fa83c36F2BD67E513f236";
  const [deployer] = await ethers.getSigners();
  const zeroAddress: string = "0x0000000000000000000000000000000000000000";

  console.log(await deployer.getBalance());
  const multiplyGobblerFactory = <MultiplyGobblerVault__factory>await ethers.getContractFactory(
    "MultiplyGobblerVault",
    {
      libraries: {
        LibGOO: "0xd637af1db8635b29edf462Cb01c0fe5E11902F3E",
      },
    },
  );
  const multiplyGobbler = await multiplyGobblerFactory.deploy(artGobblerGoerli, gooGoerli, zeroAddress);
  console.log(multiplyGobbler.address);

  // deploying the strategy
  const maxBiddingMintStrategyFactory = new MaxBiddingMintStrategy__factory(deployer);
  const maxBiddingMintStrategy = await maxBiddingMintStrategyFactory.deploy(artGobblerGoerli, multiplyGobbler.address);
  await multiplyGobbler.connect(deployer).changeMintStrategy(maxBiddingMintStrategy.address);
  console.log(maxBiddingMintStrategy.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });
