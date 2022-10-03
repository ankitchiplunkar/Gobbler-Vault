// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import { IArtGobbler } from "./IArtGobbler.sol";
import { ERC20 } from "solmate/src/tokens/ERC20.sol";
import { ERC721TokenReceiver } from "solmate/src/tokens/ERC721.sol";
import { LibGOO } from "./LibGOO.sol";
import { toDaysWadUnsafe } from "solmate/src/utils/SignedWadMath.sol";

contract MultiplyGobblerVault is ERC20, ERC721TokenReceiver {
    IArtGobbler public immutable artGobbler;
    uint256 public lastMintEmissionMultiple;
    uint256 public lastMintGooBalance;
    uint256 public lastMintTimestamp;
    uint256 public totalMinted = 0;

    // TODO: add error messages
    error GooDepositFailed();

    // TODO: add events

    constructor(address _artGobbler) ERC20("Multiply Gobbler", "mGOB", 18) {
        artGobbler = IArtGobbler(_artGobbler);
    }

    // TODO: add a view function to calculate APR

    // Vault will keep on buying more Gobblers
    // this means that the conversion rate cannot remain 10**18
    function getConversionRate() public view returns (uint256) {
        if (totalSupply > 0) {
            uint256 vaultMultiple = artGobbler.getUserEmissionMultiple(address(this));
            return totalSupply / vaultMultiple;
        }
        return 10**18;
    }

    // Used to calculate Goo to be deposited with a Gobbler
    // getGooDeposit is the extra Goo produced by a Gobbler from last mint to block.timestamp
    function getGooDeposit(uint256 multiplier) public view returns (uint256) {
        // Do not take any goo deposit till the first mint
        // this will expose the vault for MEV etc in the first mint
        // intention is to test teh vault till the first mint anyways
        // second option is to update the lastMint values at the first deposit
        if (totalMinted == 0) return 0;
        return
            LibGOO.computeGOOBalance(
                lastMintEmissionMultiple + multiplier,
                lastMintGooBalance,
                uint256(toDaysWadUnsafe(block.timestamp - lastMintTimestamp))
            ) -
            LibGOO.computeGOOBalance(
                lastMintEmissionMultiple,
                lastMintGooBalance,
                uint256(toDaysWadUnsafe(block.timestamp - lastMintTimestamp))
            );
    }

    // Deposit Gobbler into the vault and get mGOB tokens proportional to multiplier of the Gobbler
    // This requires an approve before the deposit
    function deposit(uint256 id) public {
        // multiplier of to be deposited gobbler
        uint256 multiplier = artGobbler.getGobblerEmissionMultiple(id);
        // transfer art gobbler into the vault
        artGobbler.safeTransferFrom(msg.sender, address(this), id);
        // transfer go debt into the vault
        bool success = artGobbler.transferGooFrom(msg.sender, address(this), getGooDeposit(multiplier));
        if (!success) revert GooDepositFailed();
        // mint the mGOB tokens to depositor
        // TODO: implement deposit tax
        _mint(msg.sender, multiplier * getConversionRate());
    }

    // Withdraw a Gobbler from the vault
    function withdraw(uint256 id) public {
        // multiplier of to be withdrawn gobbler
        uint256 multiplier = artGobbler.getGobblerEmissionMultiple(id);
        // burn the mGOB tokens to depositor
        _burn(msg.sender, multiplier * getConversionRate());
        // transfer art gobbler to the withdrawer
        artGobbler.transferFrom(address(this), msg.sender, id);
    }

    // Implements the strategy which will be used to buy Gobblers from virtual GOO
    // Currently implements the MAX BIDDING strategy!
    function gobblerStrategy() public view returns (uint256) {
        return artGobbler.gooBalance(address(this));
    }

    // Any address can call this function and mint a Gobbler
    // Strategy should return Goo > GobblerPrice() for the transaction to succeed
    // Also stores emissionMultiple, GooBalance and Timestamp at time of mint
    // If someone withdraws Gobblers before calling this function (in expectation of paying less Goo balance on Deposit)
    // They will lose out on minted multiplier rewards by the time they deposit
    function mintGobbler() public {
        artGobbler.mintFromGoo(gobblerStrategy(), true);
        lastMintEmissionMultiple = artGobbler.getUserEmissionMultiple(address(this));
        lastMintGooBalance = artGobbler.gooBalance(address(this));
        lastMintTimestamp = block.timestamp;
        totalMinted += 1;
    }

    // Any address can call this function and mint a Legendary Gobbler
    // If there are enough virtual Goo in then the vault can mint a Gobbler
    function mintLegendaryGobbler(uint256[] calldata gobblerIds) public {
        artGobbler.mintLegendaryGobbler(gobblerIds);
    }
}
