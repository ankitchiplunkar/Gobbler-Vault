// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import { IArtGobbler } from "./IArtGobbler.sol";
import { LibGOO } from "./LibGOO.sol";
import { ERC20 } from "solmate/src/tokens/ERC20.sol";
import { ERC721TokenReceiver } from "solmate/src/tokens/ERC721.sol";
import { toDaysWadUnsafe } from "solmate/src/utils/SignedWadMath.sol";

contract MultiplyGobblerVault is ERC20, ERC721TokenReceiver {
    IArtGobbler public immutable artGobbler;

    constructor(address _artGobbler) ERC20("Multiply Gobbler", "mGOB", 18) {
        artGobbler = IArtGobbler(_artGobbler);
    }

    // Vault will keep on buying more Gobblers
    // this means that the conversion rate cannot remain 10**18
    function getConversionRate() public view returns (uint256) {
        if (totalSupply > 0) {
            uint256 vaultMultiple = artGobbler.getUserEmissionMultiple(address(this));
            return totalSupply / vaultMultiple;
        }
        return 10**18;
    }

    // Calculates extra Goo produced by a Gobbler in time block.timestamp
    function getGooDebt(uint256 multiplier) public view returns (uint256) {
        return
            LibGOO.computeGOOBalance(
                artGobbler.getUserData(address(this)).emissionMultiple + multiplier,
                artGobbler.getUserData(address(this)).lastBalance,
                uint256(toDaysWadUnsafe(block.timestamp - artGobbler.getUserData(address(this)).lastTimestamp))
            ) - artGobbler.gooBalance(address(this));
    }

    // Deposit Gobbler into the vault and get mGOB tokens proportional to multiplier of the Gobbler
    // This requires an approve before the deposit
    function deposit(uint256 id) public {
        // multiplier of to be deposited gobbler
        uint256 multiplier = artGobbler.getGobblerEmissionMultiple(id);
        // transfer art gobbler into the vault
        artGobbler.safeTransferFrom(msg.sender, address(this), id);
        // transfer go debt into the vault
        artGobbler.transferGooFrom(msg.sender, address(this), getGooDebt(multiplier));
        // mint the mGOB tokens to depositor
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
    function mintGobbler() public {
        artGobbler.mintFromGoo(gobblerStrategy(), true);
    }

    // Any address can call this function and mint a Legendary Gobbler
    // If there are enough virtual Goo in then the vault can mint a Gobbler
    function mintLegendaryGobbler(uint256[] calldata gobblerIds) public {
        artGobbler.mintLegendaryGobbler(gobblerIds);
    }
}
