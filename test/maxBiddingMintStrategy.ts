import type { BigNumber } from "@ethersproject/bignumber";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import chai from "chai";
import { solidity } from "ethereum-waffle";
import { ethers } from "hardhat";

import { LibGOO, MaxBiddingMintStrategy, MockArtGobbler, MockGoo, MultiplyGobblerVault } from "../types/contracts";
import {
  LibGOO__factory,
  MaxBiddingMintStrategy__factory,
  MockArtGobbler__factory,
  MockGoo__factory,
  MultiplyGobblerVault__factory,
} from "../types/factories/contracts";

chai.use(solidity);
const { expect } = chai;

describe("Multiply Gobbler tests", () => {
  let mockArtGobbler: MockArtGobbler;
  let mockGoo: MockGoo;
  let multiplyGobbler: MultiplyGobblerVault;
  let maxBiddingMintStrategy: MaxBiddingMintStrategy;
  let libGoo: LibGOO;
  let deployer: SignerWithAddress;
  let john: SignerWithAddress;
  let wad: BigNumber;
  const zeroAddress: string = "0x0000000000000000000000000000000000000000";

  beforeEach("deploy contracts", async () => {
    [deployer, john] = await ethers.getSigners();
    wad = ethers.BigNumber.from("1000000000000000000");
    const mockFactory = new MockArtGobbler__factory(deployer);
    mockArtGobbler = await mockFactory.deploy();
    const libGOOFactory = new LibGOO__factory(deployer);
    libGoo = await libGOOFactory.deploy();
    const multiplyGobblerFactory = <MultiplyGobblerVault__factory>await ethers.getContractFactory(
      "MultiplyGobblerVault",
      {
        libraries: {
          LibGOO: libGoo.address,
        },
      },
    );
    const mockGooFactory = new MockGoo__factory(deployer);
    mockGoo = await mockGooFactory.deploy();
    multiplyGobbler = await multiplyGobblerFactory.deploy(mockArtGobbler.address, mockGoo.address, zeroAddress);

    // deploying the strategy
    const maxBiddingMintStrategyFactory = new MaxBiddingMintStrategy__factory(deployer);
    maxBiddingMintStrategy = await maxBiddingMintStrategyFactory.deploy(
      mockArtGobbler.address,
      multiplyGobbler.address,
    );
  });

  it("gobblerMintStrategy returns gobbler balance", async () => {
    expect(await maxBiddingMintStrategy.gobblerMintStrategy()).to.equal(0);
    await mockArtGobbler.setGooBalance(multiplyGobbler.address, wad);
    expect(await maxBiddingMintStrategy.gobblerMintStrategy()).to.equal(wad);
  });

  it("legendaryGobblerMintStrategy reverts if gobbler is unrevealed", async () => {
    await mockArtGobbler.unrevealGobbler(0);
    await expect(maxBiddingMintStrategy.legendaryGobblerMintStrategy([0])).to.be.revertedWith("UnrevealedGobbler");
  });

  it("legendaryGobblerMintStrategy returns gobblerIds", async () => {
    const gobblerIds = await maxBiddingMintStrategy.legendaryGobblerMintStrategy([0]);
    expect(gobblerIds.length).to.equal(1);
    expect(gobblerIds[0]).to.equal(0);
  });
});
