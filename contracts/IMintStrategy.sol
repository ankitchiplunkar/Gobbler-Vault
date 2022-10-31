// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

interface IMintStrategy {
    /// @notice Implements the strategy which will be used to buy Gobblers from virtual GOO
    /// @return Goo Amount which can be used to buy a Gobbler
    function gobblerMintStrategy() external returns (uint256);

    /// @notice Implements the strategy which will be used to buy Legendary Gobblers from Gobblers in the vault
    /// @param gobblerIds List of Gobbler IDs to be converted into a legendary Gobbler
    /// @return List of Gobbler IDs to be converted into a legendary Gobbler after a few checks
    function legendaryGobblerMintStrategy(uint256[] calldata gobblerIds) external returns (uint256[] memory);
}
