// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import { IArtGobbler } from "./IArtGobbler.sol";
import { ERC721 } from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract MockArtGobbler is ERC721 {
    constructor() ERC721("Mock Art Gobbler", "MAG") {}

    uint256 public nextIndexToMint = 0;
    mapping(address => uint256) public userEmissionMultiple;
    mapping(address => uint256) public userGooBalance;
    uint256 public unrevealedGobbler = 100;

    function unrevealGobbler(uint256 id) external {
        unrevealedGobbler = id;
    }

    // hardcoding this to 5
    function getGobblerEmissionMultiple(uint256 gobblerID) external view returns (uint256) {
        if (gobblerID == unrevealedGobbler) {
            return 0;
        } else {
            return 5;
        }
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

    function mint() public returns (uint256) {
        _mint(msg.sender, nextIndexToMint);
        nextIndexToMint++;
        return nextIndexToMint - 1;
    }

    function mintFromGoo(uint256 maxPrice, bool useVirtualBalance) external returns (uint256 gobblerId) {
        return mint();
    }

    function addGoo(uint256 gooAmount) external {
        userGooBalance[msg.sender] += gooAmount;
    }
}
