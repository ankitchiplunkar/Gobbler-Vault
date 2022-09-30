// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import { IArtGobbler } from "./IArtGobbler.sol";
import { ERC721 } from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract MockArtGobbler is ERC721 {
    constructor() ERC721("Mock Art Gobbler", "MAG") {}

    mapping(address => uint256) public userEmissionMultiple;
    mapping(address => uint256) public userGooBalance;

    // hardcoding this to 5
    function getGobblerEmissionMultiple(uint256 gobblerID) external pure returns (uint256) {
        return 5;
    }

    function setUserEmissionMultiple(address user, uint256 emissionMultiple) external {
        userEmissionMultiple[user] = emissionMultiple;
    }

    function getUserEmissionMultiple(address user) external view returns (uint256) {
        return userEmissionMultiple[user];
    }

    function gooBalance(address user) external view returns (uint256) {
        return userGooBalance[user];
    }

    function setGooBalance(address user, uint256 _gooBalance) external {
        userGooBalance[user] = _gooBalance;
    }

    function gobblerPrice() external pure returns (uint256) {
        return 10**18;
    }

    function mint(uint256 tokenId) external {
        _mint(msg.sender, tokenId);
    }
}
