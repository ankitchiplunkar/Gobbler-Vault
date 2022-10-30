import type { BigNumber } from "@ethersproject/bignumber";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import chai from "chai";
import { solidity } from "ethereum-waffle";
import { ethers } from "hardhat";

import { LibGOO, MockArtGobbler, MockGoo, MultiplyGobblerVault } from "../types/contracts";
import {
  LibGOO__factory,
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
  let libGoo: LibGOO;
  let deployer: SignerWithAddress;
  let john: SignerWithAddress;
  let wad: BigNumber;

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
    multiplyGobbler = await multiplyGobblerFactory.deploy(mockArtGobbler.address, mockGoo.address);

    await mockArtGobbler.connect(deployer).mint();
    await mockArtGobbler.connect(deployer).setApprovalForAll(multiplyGobbler.address, true);
    await mockArtGobbler.connect(john).setApprovalForAll(multiplyGobbler.address, true);
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
    await multiplyGobbler.connect(deployer).mintGobbler();
    await multiplyGobbler.connect(deployer).mintGobbler();
    expect(await multiplyGobbler.totalMinted()).to.equal(3);
    expect(await multiplyGobbler.getGooDeposit(5)).to.equal(0);
    // total minted > 0 and 60 secs have elapsed
    await ethers.provider.send("evm_increaseTime", [60]);
    await ethers.provider.send("evm_mine", []);
    expect(await multiplyGobbler.totalMinted()).to.equal(3);
    let initialGoo = await libGoo.computeGOOBalance(0, 0, wad.mul(60));
    let finalGoo = await libGoo.computeGOOBalance(5, 0, wad.mul(60).div(86400));
    // adding this close to since the test is failing in CI for some reason
    expect(await multiplyGobbler.getGooDeposit(5)).to.closeTo(finalGoo.sub(initialGoo), 25261327590);
    // total minted > 0, 60 secs have elapsed and lastEmissionMultiple is nonzero
    await mockArtGobbler.setUserEmissionMultiple(multiplyGobbler.address, 10);
    await multiplyGobbler.connect(deployer).mintGobbler();
    await ethers.provider.send("evm_increaseTime", [60]);
    await ethers.provider.send("evm_mine", []);
    initialGoo = await libGoo.computeGOOBalance(10, 0, wad.mul(60).div(86400));
    finalGoo = await libGoo.computeGOOBalance(15, 0, wad.mul(60).div(86400));
    expect(await multiplyGobbler.getGooDeposit(5)).to.closeTo(finalGoo.sub(initialGoo), 25261327590);
  });

  it("gobbler strategy", async () => {
    const gooBalance = 10;
    await mockArtGobbler.setGooBalance(multiplyGobbler.address, gooBalance);
    expect(await multiplyGobbler.gobblerStrategy()).to.equal(gooBalance);
  });

  it("checks owner", async () => {
    expect(await multiplyGobbler.owner()).to.equal(deployer.address);
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

  it("cannot withdraw if gobbler is unrevealed", async () => {
    await multiplyGobbler.connect(deployer).deposit(0);
    await mockArtGobbler.setUserEmissionMultiple(multiplyGobbler.address, 5);
    const totalMinted = await multiplyGobbler.totalMinted();
    await multiplyGobbler.connect(deployer).mintGobbler();
    const mintedGobblerId = await multiplyGobbler.mintedGobbledId(totalMinted);
    await mockArtGobbler.unrevealGobbler(mintedGobblerId);
    await expect(multiplyGobbler.connect(deployer).withdraw(mintedGobblerId)).to.be.revertedWithCustomError(
      multiplyGobbler,
      "UnrevealedGobbler",
    );
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
    await multiplyGobbler.connect(deployer).mintGobbler();
    await multiplyGobbler.connect(deployer).mintGobbler();
    expect(await multiplyGobbler.totalMinted()).to.equal(3);
    await ethers.provider.send("evm_increaseTime", [60]);
    await ethers.provider.send("evm_mine", []);
    expect(await multiplyGobbler.getGooDeposit(5)).to.gt(0);
    await mockGoo.connect(deployer).approve(multiplyGobbler.address, wad.mul(1000));
    await multiplyGobbler.connect(deployer).deposit(0);
    expect(await multiplyGobbler.balanceOf(deployer.address)).to.equal(wad.mul(5));
    expect(await multiplyGobbler.totalSupply()).to.equal(wad.mul(5));
    expect(await mockArtGobbler.ownerOf(0)).to.equal(multiplyGobbler.address);
  });

  it("deposit when depositTax is non-zero", async () => {
    // minting 3 tokens to trigger deposit tax
    await multiplyGobbler.connect(deployer).mintGobbler();
    await multiplyGobbler.connect(deployer).mintGobbler();
    await multiplyGobbler.connect(deployer).mintGobbler();
    expect(await multiplyGobbler.totalSupply()).to.equal(0);
    expect(await multiplyGobbler.totalMinted()).to.equal(3);
    // transferring tokens to non-owner to check post tax balances
    await mockArtGobbler.connect(deployer).transferFrom(deployer.address, john.address, 0);
    await mockGoo.connect(deployer).transfer(john.address, wad.mul(100));
    await mockGoo.connect(john).approve(multiplyGobbler.address, wad.mul(100));
    await multiplyGobbler.connect(john).deposit(0);
    // verifying final balances
    expect(await multiplyGobbler.balanceOf(deployer.address)).to.equal(wad.mul(5).mul(5).div(1000));
    expect(await multiplyGobbler.balanceOf(john.address)).to.equal(wad.mul(5).mul(995).div(1000));
    expect(await multiplyGobbler.totalSupply()).to.equal(wad.mul(5));
    expect(await mockArtGobbler.ownerOf(0)).to.equal(multiplyGobbler.address);
  });

  describe("Test deposit with lag", async () => {
    it("reverts deposit with lag if total minted is zero", async () => {
      await expect(multiplyGobbler.connect(deployer).depositWithLag(0)).to.be.revertedWithCustomError(
        multiplyGobbler,
        "TotalMintedIsZero",
      );
    });

    it("deposit with lag", async () => {
      await multiplyGobbler.connect(deployer).mintGobbler();
      await multiplyGobbler.connect(deployer).depositWithLag(0);
      expect(await multiplyGobbler.laggingDeposit(deployer.address, 1)).to.equal(5);
      expect(await mockArtGobbler.ownerOf(0)).to.equal(multiplyGobbler.address);
    });

    it("withdraw lagged in same mint window", async () => {
      await multiplyGobbler.connect(deployer).mintGobbler();
      await multiplyGobbler.connect(deployer).depositWithLag(0);
      expect(await multiplyGobbler.laggingDeposit(deployer.address, 1)).to.equal(5);
      await multiplyGobbler.connect(deployer).withdrawLagged(0);
      expect(await multiplyGobbler.laggingDeposit(deployer.address, 1)).to.equal(0);
      expect(await mockArtGobbler.ownerOf(0)).to.equal(deployer.address);
      expect(await multiplyGobbler.balanceOf(deployer.address)).to.equal(0);
    });

    it("cannot withdraw lagged if gobbler is unrevealed", async () => {
      const totalMinted = await multiplyGobbler.totalMinted();
      await multiplyGobbler.connect(deployer).mintGobbler();
      const mintedGobblerId = await multiplyGobbler.mintedGobbledId(totalMinted);
      await mockArtGobbler.unrevealGobbler(mintedGobblerId);
      await multiplyGobbler.connect(deployer).depositWithLag(0);
      expect(await multiplyGobbler.laggingDeposit(deployer.address, 1)).to.equal(5);
      await expect(multiplyGobbler.connect(deployer).withdrawLagged(mintedGobblerId)).to.be.revertedWithCustomError(
        multiplyGobbler,
        "UnrevealedGobbler",
      );
    });

    it("cannot withdraw lagged after a mint", async () => {
      await multiplyGobbler.connect(deployer).mintGobbler();
      await multiplyGobbler.connect(deployer).depositWithLag(0);
      expect(await multiplyGobbler.laggingDeposit(deployer.address, 1)).to.equal(5);
      await multiplyGobbler.connect(deployer).mintGobbler();
      await expect(multiplyGobbler.connect(deployer).withdrawLagged(0)).to.be.reverted;
    });

    it("cannot claim lagged in same mint window", async () => {
      await multiplyGobbler.connect(deployer).mintGobbler();
      await multiplyGobbler.connect(deployer).depositWithLag(0);
      expect(await multiplyGobbler.laggingDeposit(deployer.address, 1)).to.equal(5);
      await expect(multiplyGobbler.connect(deployer).claimLagged([1])).to.be.revertedWithCustomError(
        multiplyGobbler,
        "ClaimingInLowerMintWindow",
      );
      expect(await multiplyGobbler.laggingDeposit(deployer.address, 1)).to.equal(5);
      expect(await mockArtGobbler.ownerOf(0)).to.equal(multiplyGobbler.address);
    });

    it("can claim lagged in seperate mint window", async () => {
      await multiplyGobbler.connect(deployer).mintGobbler();
      await mockGoo.connect(deployer).approve(multiplyGobbler.address, wad.mul(1000));
      await multiplyGobbler.connect(deployer).deposit(0);
      expect(await multiplyGobbler.balanceOf(deployer.address)).to.equal(wad.mul(5));
      await mockArtGobbler.connect(deployer).mint();
      await multiplyGobbler.connect(deployer).depositWithLag(2);
      expect(await multiplyGobbler.laggingDeposit(deployer.address, 1)).to.equal(5);
      // 1 more mint happened
      // the user can claim tokens now
      await multiplyGobbler.connect(deployer).mintGobbler();
      // assuming 5 multiplier per mint/deposit
      await mockArtGobbler.setUserEmissionMultiple(multiplyGobbler.address, 20);
      // conversion rate is 5/15
      expect(await multiplyGobbler.getConversionRate()).to.equal(wad.div(3));
      await multiplyGobbler.connect(deployer).claimLagged([1]);
      expect(await multiplyGobbler.laggingDeposit(deployer.address, 1)).to.equal(0);
      expect(await mockArtGobbler.ownerOf(0)).to.equal(multiplyGobbler.address);
      expect(await mockArtGobbler.ownerOf(2)).to.equal(multiplyGobbler.address);
      expect(await multiplyGobbler.balanceOf(deployer.address)).to.closeTo(wad.mul(5).add(wad.mul(5).div(3)), 10);
    });

    it("can claim lagged in seperate mint window after deposit tax", async () => {
      await multiplyGobbler.connect(deployer).mintGobbler();
      await mockGoo.connect(deployer).approve(multiplyGobbler.address, wad.mul(1000));
      await multiplyGobbler.connect(deployer).deposit(0);
      expect(await multiplyGobbler.balanceOf(deployer.address)).to.equal(wad.mul(5));
      await mockArtGobbler.connect(john).mint();
      await multiplyGobbler.connect(john).depositWithLag(2);
      expect(await multiplyGobbler.laggingDeposit(john.address, 1)).to.equal(5);
      // 2 more mints happened
      // the user can claim tokens now
      await multiplyGobbler.connect(deployer).mintGobbler();
      await multiplyGobbler.connect(deployer).mintGobbler();
      // total Minted is greater than 2 deposit tax will activate
      expect(await multiplyGobbler.totalMinted()).to.be.gt(2);
      // assuming 5 multiplier per mint/deposit
      await mockArtGobbler.setUserEmissionMultiple(multiplyGobbler.address, 25);
      // conversion rate is 5/20
      expect(await multiplyGobbler.getConversionRate()).to.equal(wad.div(4));
      await multiplyGobbler.connect(john).claimLagged([1]);
      expect(await multiplyGobbler.laggingDeposit(john.address, 1)).to.equal(0);
      expect(await mockArtGobbler.ownerOf(0)).to.equal(multiplyGobbler.address);
      expect(await mockArtGobbler.ownerOf(2)).to.equal(multiplyGobbler.address);
      expect(await multiplyGobbler.balanceOf(john.address)).to.equal(wad.mul(5).div(4).mul(995).div(1000));
      expect(await multiplyGobbler.balanceOf(deployer.address)).to.equal(
        wad.mul(5).add(wad.mul(5).div(4).mul(5).div(1000)),
      );
    });

    it("getConversionRate when totalLaggedMultiple > 0", async () => {
      await multiplyGobbler.connect(deployer).deposit(0);
      await mockArtGobbler.setUserEmissionMultiple(multiplyGobbler.address, 5);
      expect(await multiplyGobbler.getConversionRate()).to.equal(wad);

      // when multiplier and totalLaggedMultiple increases due to depositWithLag, conversion rate remains the same
      await multiplyGobbler.connect(deployer).mintGobbler();
      await mockArtGobbler.setUserEmissionMultiple(multiplyGobbler.address, 10);
      expect(await multiplyGobbler.getConversionRate()).to.equal(wad.div(2));
      await mockArtGobbler.connect(deployer).mint();
      await multiplyGobbler.connect(deployer).depositWithLag(2);
      await mockArtGobbler.setUserEmissionMultiple(multiplyGobbler.address, 15);
      expect(await multiplyGobbler.totalLaggedMultiple()).to.equal(5);
      expect(await multiplyGobbler.getConversionRate()).to.equal(wad.div(2));

      // when user withdraws supply conversion rate remains the same
      await multiplyGobbler.connect(deployer).withdrawLagged(0);
      await mockArtGobbler.setUserEmissionMultiple(multiplyGobbler.address, 10);
      expect(await multiplyGobbler.totalLaggedMultiple()).to.equal(0);
      expect(await multiplyGobbler.getConversionRate()).to.equal(wad.div(2));

      // when user claims tokens after mint
      await multiplyGobbler.connect(deployer).depositWithLag(0);
      await multiplyGobbler.connect(deployer).mintGobbler();
      await mockArtGobbler.setUserEmissionMultiple(multiplyGobbler.address, 20);
      expect(await multiplyGobbler.getConversionRate()).to.equal(wad.div(3));
      const totalMinted = await multiplyGobbler.totalMinted();
      await multiplyGobbler.claimLagged([totalMinted.sub(1)]);
      expect(await multiplyGobbler.balanceOf(deployer.address)).to.be.closeTo(wad.mul(20).div(3), 10);
      expect(await multiplyGobbler.totalLaggedMultiple()).to.equal(0);
      expect(await multiplyGobbler.getConversionRate()).to.equal(wad.div(3));
    });
  });

  // TODO: Test mintLegendaryGobbler
});
