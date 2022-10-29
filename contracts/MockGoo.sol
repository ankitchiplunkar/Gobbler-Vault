// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockGoo is ERC20 {
    constructor() ERC20("Mock Goo", "Goo") {
        _mint(msg.sender, 1e21);
    }
}
