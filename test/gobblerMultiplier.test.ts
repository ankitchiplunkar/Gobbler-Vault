import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import chai from "chai";
import { solidity } from "ethereum-waffle";
import { ethers } from "hardhat";

import { MockArtGobbler, MultiplyGobblerVault } from "../types/contracts";
import { MockArtGobbler__factory, MultiplyGobblerVault__factory } from "../types/factories/contracts";

chai.use(solidity);
const { expect } = chai;

describe("Multiply Gobbler tests", () => {
  let mockArtGobbler: MockArtGobbler;
  let multiplyGobbler: MultiplyGobblerVault;
  let deployer: SignerWithAddress;

  beforeEach("deploy contracts", async () => {
    [deployer] = await ethers.getSigners();
    const mockFactory = new MockArtGobbler__factory(deployer);
    mockArtGobbler = await mockFactory.deploy();
    const multiplyGobblerFactory = new MultiplyGobblerVault__factory(deployer);
    multiplyGobbler = await multiplyGobblerFactory.deploy(mockArtGobbler.address);

    await mockArtGobbler.connect(deployer).mint();
    await mockArtGobbler.connect(deployer).setApprovalForAll(multiplyGobbler.address, true);
  });

  it("getConversionRate when totalSupply 0", async () => {
    const conversionRate = ethers.BigNumber.from("1000000000000000000");
    expect(await multiplyGobbler.getConversionRate()).to.equal(conversionRate);
  });

  it("fresh deposit", async () => {
    const balanceAfter = ethers.BigNumber.from("5000000000000000000");
    expect(await multiplyGobbler.balanceOf(deployer.address)).to.equal(0);
    await multiplyGobbler.connect(deployer).deposit(0);
    expect(await multiplyGobbler.balanceOf(deployer.address)).to.equal(balanceAfter);
    expect(await multiplyGobbler.totalSupply()).to.equal(balanceAfter);
    expect(await mockArtGobbler.ownerOf(0)).to.equal(multiplyGobbler.address);
  });

  it("getConversionRate when totalSupply > 0", async () => {
    const conversionRate = ethers.BigNumber.from("1000000000000000000");
    await multiplyGobbler.connect(deployer).deposit(0);
    await mockArtGobbler.setUserEmissionMultiple(multiplyGobbler.address, 5);
    expect(await multiplyGobbler.getConversionRate()).to.equal(conversionRate);

    // when multiplier increases due to new Gobbler mints, conversion rate decreases
    await mockArtGobbler.setUserEmissionMultiple(multiplyGobbler.address, 10);
    expect(await multiplyGobbler.getConversionRate()).to.equal(conversionRate.div(2));
  });

  it("deposit when there are more multipliers due to extra minting", async () => {
    await multiplyGobbler.connect(deployer).deposit(0);
    const balanceBefore = ethers.BigNumber.from("5000000000000000000");
    expect(await multiplyGobbler.balanceOf(deployer.address)).to.equal(balanceBefore);
    expect(await multiplyGobbler.totalSupply()).to.equal(balanceBefore);
    expect(await mockArtGobbler.ownerOf(0)).to.equal(multiplyGobbler.address);
    await mockArtGobbler.setUserEmissionMultiple(multiplyGobbler.address, 10);
    await mockArtGobbler.connect(deployer).mint();
    await multiplyGobbler.connect(deployer).deposit(1);
    // due to change in conversion rate lesser tokens are transferred to user
    const balanceAfter = ethers.BigNumber.from("7500000000000000000");
    expect(await multiplyGobbler.balanceOf(deployer.address)).to.equal(balanceAfter);
    expect(await multiplyGobbler.totalSupply()).to.equal(balanceAfter);
    expect(await mockArtGobbler.ownerOf(0)).to.equal(multiplyGobbler.address);
    expect(await mockArtGobbler.ownerOf(1)).to.equal(multiplyGobbler.address);
  });

  it("withdraw", async () => {
    await multiplyGobbler.connect(deployer).deposit(0);
    await mockArtGobbler.setUserEmissionMultiple(multiplyGobbler.address, 5);
    const balanceBefore = ethers.BigNumber.from("5000000000000000000");
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
    const balanceBefore = ethers.BigNumber.from("5000000000000000000");
    expect(await multiplyGobbler.balanceOf(deployer.address)).to.equal(balanceBefore);
    expect(await mockArtGobbler.ownerOf(0)).to.equal(multiplyGobbler.address);
    await multiplyGobbler.connect(deployer).withdraw(0);
    const balanceAfter = ethers.BigNumber.from("2500000000000000000");
    expect(await multiplyGobbler.balanceOf(deployer.address)).to.equal(balanceAfter);
    expect(await mockArtGobbler.ownerOf(0)).to.equal(deployer.address);
  });

  it("gobbler strategy", async () => {
    const gooBalance = 10;
    await mockArtGobbler.setGooBalance(multiplyGobbler.address, gooBalance);
    expect(await multiplyGobbler.gobblerStrategy()).to.equal(gooBalance);
  });

  it("test MintFromGoo function", async () => {
    await multiplyGobbler.connect(deployer).deposit(0);
    await multiplyGobbler.connect(deployer).mintGobbler();
    await mockArtGobbler.setUserEmissionMultiple(multiplyGobbler.address, 10);
    const balanceBefore = ethers.BigNumber.from("5000000000000000000");
    expect(await multiplyGobbler.balanceOf(deployer.address)).to.equal(balanceBefore);
    expect(await mockArtGobbler.ownerOf(0)).to.equal(multiplyGobbler.address);
    await multiplyGobbler.connect(deployer).withdraw(0);
    const balanceAfter = ethers.BigNumber.from("2500000000000000000");
    expect(await multiplyGobbler.balanceOf(deployer.address)).to.equal(balanceAfter);
    expect(await mockArtGobbler.ownerOf(0)).to.equal(deployer.address);
    await mockArtGobbler.setUserEmissionMultiple(multiplyGobbler.address, 5);
    await multiplyGobbler.connect(deployer).withdraw(1);
    expect(await multiplyGobbler.balanceOf(deployer.address)).to.equal(0);
    expect(await mockArtGobbler.ownerOf(1)).to.equal(deployer.address);
  });

  // TODO: Test mintGobbler
  // TODO: Test mintLegendaryGobbler
});
