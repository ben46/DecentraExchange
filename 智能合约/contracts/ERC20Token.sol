pragma solidity ^0.8.6;
import "./ERC20.sol";

contract ERC20Token is ERC20{

    constructor(
        string memory name,
        string memory symbol,
        uint256 initialBalance
    ) payable ERC20(name, symbol) {
        _mint(msg.sender, initialBalance);
    }



}