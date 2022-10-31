// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import { IArtGobbler } from "./IArtGobbler.sol";
import { IMintStrategy } from "./IMintStrategy.sol";
import { MultiplyGobblerVault } from "./MultiplyGobblerVault.sol";

/// @title Use all Goo to buy Gobblers
/// @author Ankit Chiplunkar
/// @notice Defines the strategy used to mint Gobblers and legendary Gobblers
contract MaxBiddingMintStrategy is IMintStrategy {
    // TODO write tests
    /*//////////////////////////////////////////////////////////////
                ART GOBBLERS CONTRACTS
    //////////////////////////////////////////////////////////////*/
    /// @notice The address of the ArtGobblers ERC721 token contract.
    IArtGobbler public immutable artGobbler;
    /// @notice The address of the Goo ERC20 token contract.
    MultiplyGobblerVault public immutable multiplyGobblerVault;

    error UnrevealedGobbler();

    constructor(address _artGobbler, address _multiplyGobblerVault) {
        artGobbler = IArtGobbler(_artGobbler);
        multiplyGobblerVault = MultiplyGobblerVault(_multiplyGobblerVault);
    }

    /// @notice Implements the strategy which will be used to buy Gobblers from virtual GOO
    /// @return Goo Amount which can be used to buy a Gobbler
    function gobblerMintStrategy() external view override returns (uint256) {
        return artGobbler.gooBalance(address(multiplyGobblerVault));
    }

    /// @notice Implements the strategy which will be used to buy Legendary Gobblers from Gobblers in the vault
    /// @dev Reverts if the Gobbler being used is unrevealed
    /// @param gobblerIds List of Gobbler IDs to be converted into a legendary Gobbler
    /// @return List of Gobbler IDs to be converted into a legendary Gobbler after a few checks
    function legendaryGobblerMintStrategy(uint256[] calldata gobblerIds)
        external
        view
        override
        returns (uint256[] memory)
    {
        for (uint256 i = 0; i < gobblerIds.length; i++) {
            if (artGobbler.getGobblerEmissionMultiple(gobblerIds[i]) == 0) revert UnrevealedGobbler();
        }
        return gobblerIds;
    }
}
