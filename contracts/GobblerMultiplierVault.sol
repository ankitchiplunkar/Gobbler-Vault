// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import { IArtGobbler } from "./IArtGobbler.sol";
import { ERC20 } from "solmate/src/tokens/ERC20.sol";

contract GobblerMultiplierVault is ERC20 {
    IArtGobbler public immutable artGobbler;

    constructor(address _artGobbler) ERC20("Gobbler Multiplier", "GOBM", 18) {
        artGobbler = IArtGobbler(_artGobbler);
    }

    // Vault will keep on buying more Gobblers
    // this means that the conversion rate cannot remain 1
    function getConversionRate() public view returns (uint256) {
        if (totalSupply > 0) {
            uint256 vaultMultiple = artGobbler.getUserEmissionMultiple(address(this));
            return totalSupply / vaultMultiple;
        }
        return 10**18;
    }

    // Deposit Gobbler into the vault
    // This requires an approve before the deposit
    function deposit(uint256 id) public {
        // transfer art gobbler into the vault
        artGobbler.safeTransferFrom(msg.sender, address(this), id);
        // multiplier of deposited gobbler
        uint256 multiplier = artGobbler.getGobblerEmissionMultiple(id);
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

    // Any address can call this function and mint a Gobbler
    // if there is enough virtual Goo in then the vault can mint a Gobbler
    function mintGobbler() public {
        // We implement a Greedy stratergy here, i.e. we buy a Gobbler as soon as it is buyable
        artGobbler.mintFromGoo(artGobbler.gooBalance(address(this)), true);
    }

    // Any address can call this function and mint a Legendary Gobbler
    // If there are enough virtual Goo in then the vault can mint a Gobbler
    function mintLegendaryGobbler(uint256[] calldata gobblerIds) public {
        artGobbler.mintLegendaryGobbler(gobblerIds);
    }
}
