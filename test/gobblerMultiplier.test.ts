import type { BigNumber } from "@ethersproject/bignumber";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import chai from "chai";
import { solidity } from "ethereum-waffle";
import { ethers } from "hardhat";

import { LibGOO, MockArtGobbler, MultiplyGobblerVault } from "../types/contracts";
import { LibGOO__factory, MockArtGobbler__factory, MultiplyGobblerVault__factory } from "../types/factories/contracts";

chai.use(solidity);
const { expect } = chai;

describe("Multiply Gobbler tests", () => {
  let mockArtGobbler: MockArtGobbler;
  let multiplyGobbler: MultiplyGobblerVault;
  let libGoo: LibGOO;
  let deployer: SignerWithAddress;
  let wad: BigNumber;

  beforeEach("deploy contracts", async () => {
    [deployer] = await ethers.getSigners();
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
    multiplyGobbler = await multiplyGobblerFactory.deploy(mockArtGobbler.address);

    await mockArtGobbler.connect(deployer).mint();
    await mockArtGobbler.connect(deployer).setApprovalForAll(multiplyGobbler.address, true);
  });

  // Testing view functions
  it("getConversionRate when totalSupply 0", async () => {
    expect(await multiplyGobbler.getConversionRate()).to.equal(wad);
  });

  it("getConversionRate when totalSupply > 0", async () => {
    await multiplyGobbler.connect(deployer).deposit(0);
    await mockArtGobbler.setUserEmissionMultiple(multiplyGobbler.address, 5);
    expect(await multiplyGobbler.getConversionRate()).to.equal(wad);

    // when multiplier increases due to new Gobbler mints, conversion rate decreases
    await mockArtGobbler.setUserEmissionMultiple(multiplyGobbler.address, 10);
    expect(await multiplyGobbler.getConversionRate()).to.equal(wad.div(2));
  });

  it("getGooDeposit", async () => {
    // totalMinted = 0
    expect(await multiplyGobbler.totalMinted()).to.equal(0);
    expect(await multiplyGobbler.getGooDeposit(5)).to.equal(0);
    // total minted is non zero but no time has passed
    await multiplyGobbler.connect(deployer).mintGobbler();
    expect(await multiplyGobbler.totalMinted()).to.equal(1);
    expect(await multiplyGobbler.getGooDeposit(5)).to.equal(0);
    // total minted > 0 and 60 secs have elapsed
    await ethers.provider.send("evm_increaseTime", [60]);
    await ethers.provider.send("evm_mine", []);
    expect(await multiplyGobbler.totalMinted()).to.equal(1);
    let initialGoo = await libGoo.computeGOOBalance(0, 0, wad.mul(60));
    let finalGoo = await libGoo.computeGOOBalance(5, 0, wad.mul(60).div(86400));
    expect(await multiplyGobbler.getGooDeposit(5)).to.equal(finalGoo.sub(initialGoo));
    // total minted > 0, 60 secs have elapsed and lastEmissionMultiple is nonzero
    await mockArtGobbler.setUserEmissionMultiple(multiplyGobbler.address, 10);
    await multiplyGobbler.connect(deployer).mintGobbler();
    await ethers.provider.send("evm_increaseTime", [60]);
    await ethers.provider.send("evm_mine", []);
    initialGoo = await libGoo.computeGOOBalance(10, 0, wad.mul(60).div(86400));
    finalGoo = await libGoo.computeGOOBalance(15, 0, wad.mul(60).div(86400));
    expect(await multiplyGobbler.getGooDeposit(5)).to.equal(finalGoo.sub(initialGoo));
  });

  // Testing state changing functions
  it("fresh deposit", async () => {
    const balanceAfter = wad.mul(5);
    expect(await multiplyGobbler.balanceOf(deployer.address)).to.equal(0);
    await multiplyGobbler.connect(deployer).deposit(0);
    expect(await multiplyGobbler.balanceOf(deployer.address)).to.equal(balanceAfter);
    expect(await multiplyGobbler.totalSupply()).to.equal(balanceAfter);
    expect(await mockArtGobbler.ownerOf(0)).to.equal(multiplyGobbler.address);
  });

  it("deposit when there are more multipliers due to extra minting", async () => {
    await multiplyGobbler.connect(deployer).deposit(0);
    const balanceBefore = wad.mul(5);
    expect(await multiplyGobbler.balanceOf(deployer.address)).to.equal(balanceBefore);
    expect(await multiplyGobbler.totalSupply()).to.equal(balanceBefore);
    expect(await mockArtGobbler.ownerOf(0)).to.equal(multiplyGobbler.address);
    await mockArtGobbler.setUserEmissionMultiple(multiplyGobbler.address, 10);
    await mockArtGobbler.connect(deployer).mint();
    await multiplyGobbler.connect(deployer).deposit(1);
    // due to change in conversion rate lesser tokens are transferred to user
    const balanceAfter = wad.mul(75).div(10);
    expect(await multiplyGobbler.balanceOf(deployer.address)).to.equal(balanceAfter);
    expect(await multiplyGobbler.totalSupply()).to.equal(balanceAfter);
    expect(await mockArtGobbler.ownerOf(0)).to.equal(multiplyGobbler.address);
    expect(await mockArtGobbler.ownerOf(1)).to.equal(multiplyGobbler.address);
  });

  it("withdraw", async () => {
    await multiplyGobbler.connect(deployer).deposit(0);
    await mockArtGobbler.setUserEmissionMultiple(multiplyGobbler.address, 5);
    const balanceBefore = wad.mul(5);
    expect(await multiplyGobbler.balanceOf(deployer.address)).to.equal(balanceBefore);
    expect(await mockArtGobbler.ownerOf(0)).to.equal(multiplyGobbler.address);
    await multiplyGobbler.connect(deployer).withdraw(0);
    const balanceAfter = ethers.BigNumber.from("0");
    expect(await multiplyGobbler.balanceOf(deployer.address)).to.equal(balanceAfter);
    expect(await mockArtGobbler.ownerOf(0)).to.equal(deployer.address);
  });

  it("withdraw when there are more multipliers due to mint", async () => {
    await multiplyGobbler.connect(deployer).deposit(0);
    await mockArtGobbler.setUserEmissionMultiple(multiplyGobbler.address, 10);
    const balanceBefore = wad.mul(5);
    expect(await multiplyGobbler.balanceOf(deployer.address)).to.equal(balanceBefore);
    expect(await mockArtGobbler.ownerOf(0)).to.equal(multiplyGobbler.address);
    await multiplyGobbler.connect(deployer).withdraw(0);
    const balanceAfter = wad.mul(25).div(10);
    expect(await multiplyGobbler.balanceOf(deployer.address)).to.equal(balanceAfter);
    expect(await mockArtGobbler.ownerOf(0)).to.equal(deployer.address);
  });

  it("gobbler strategy", async () => {
    const gooBalance = 10;
    await mockArtGobbler.setGooBalance(multiplyGobbler.address, gooBalance);
    expect(await multiplyGobbler.gobblerStrategy()).to.equal(gooBalance);
  });

  it("MintFromGoo", async () => {
    await multiplyGobbler.connect(deployer).deposit(0);
    expect(await multiplyGobbler.totalMinted()).to.equal(0);
    await multiplyGobbler.connect(deployer).mintGobbler();
    expect(await multiplyGobbler.totalMinted()).to.equal(1);
    await mockArtGobbler.setUserEmissionMultiple(multiplyGobbler.address, 10);
    const balanceBefore = wad.mul(5);
    expect(await multiplyGobbler.balanceOf(deployer.address)).to.equal(balanceBefore);
    expect(await mockArtGobbler.ownerOf(0)).to.equal(multiplyGobbler.address);
    await multiplyGobbler.connect(deployer).withdraw(0);
    const balanceAfter = wad.mul(25).div(10);
    expect(await multiplyGobbler.balanceOf(deployer.address)).to.equal(balanceAfter);
    expect(await mockArtGobbler.ownerOf(0)).to.equal(deployer.address);
    await mockArtGobbler.setUserEmissionMultiple(multiplyGobbler.address, 5);
    await multiplyGobbler.connect(deployer).withdraw(1);
    expect(await multiplyGobbler.balanceOf(deployer.address)).to.equal(0);
    expect(await mockArtGobbler.ownerOf(1)).to.equal(deployer.address);
  });

  it("deposit when gooDeposit is non zero", async () => {
    await multiplyGobbler.connect(deployer).mintGobbler();
    expect(await multiplyGobbler.totalMinted()).to.equal(1);
    await ethers.provider.send("evm_increaseTime", [60]);
    await ethers.provider.send("evm_mine", []);
    expect(await multiplyGobbler.getGooDeposit(5)).to.gt(0);
    await multiplyGobbler.connect(deployer).deposit(0);
    expect(await multiplyGobbler.balanceOf(deployer.address)).to.equal(wad.mul(5));
    expect(await multiplyGobbler.totalSupply()).to.equal(wad.mul(5));
    expect(await mockArtGobbler.ownerOf(0)).to.equal(multiplyGobbler.address);
  });

  // TODO: Test mintLegendaryGobbler
});
