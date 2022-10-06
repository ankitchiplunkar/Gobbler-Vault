// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import { IERC721 } from "@openzeppelin/contracts/interfaces/IERC721.sol";

interface IArtGobbler is IERC721 {
    /*//////////////////////////////////////////////////////////////
                                VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    function transferGooFrom(
        address from,
        address to,
        uint256 gooAmount
    ) external returns (bool);

    function gooBalance(address user) external view returns (uint256);

    function getGobblerEmissionMultiple(uint256 gobblerId) external view returns (uint256);

    function getUserEmissionMultiple(address user) external view returns (uint256);

    function gobblerPrice() external view returns (uint256);

    /*//////////////////////////////////////////////////////////////
                        STATE-MODIFYING FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function mintFromGoo(uint256 maxPrice, bool useVirtualBalance) external returns (uint256 gobblerId);

    function mintLegendaryGobbler(uint256[] calldata gobblerIds) external returns (uint256 gobblerId);
}
