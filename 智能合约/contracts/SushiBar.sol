// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract SushiBar is ERC20("FreshSushi", "fSushi") {
    using SafeERC20 for IERC20;

    IERC20 public vestingToken;

    event Enter(
        address indexed user,
        uint256 vestingInAmount,
        uint256 mintedAmount
    );
    event Leave(
        address indexed user,
        uint256 vestingOutAmount,
        uint256 burnedAmount
    );
    event ShareRevenue(uint256 amount);

    constructor(IERC20 _vestingToken) {
        vestingToken = _vestingToken;
    }

    function enter(uint256 _amount) external {
        if (_amount > 0) {
            uint256 totalLockedTokenSupply = vestingToken.balanceOf(
                address(this)
            );//当前总锁仓

            uint256 totalFreshSushi = totalSupply();//当前mint出去的币

            //把bob的vest代币转入本合约中
            vestingToken.transferFrom(msg.sender, address(this), _amount);
            uint256 mintAmount;
            // 如果不存在 fSushi，则按照投入的金额 1:1 铸造它
            if (totalFreshSushi == 0 || totalLockedTokenSupply == 0) { // 第一次锁定
                mintAmount = _amount;
            } else {
                // 计算并铸造 blp 价值的 fSushi 数量。 比例会随着时间的推移而改变
                uint256 shareOfFreshSushi = (_amount * totalFreshSushi) /
                    totalLockedTokenSupply;//用户amaount * 当前mint出去的币 / 当前总锁仓

                mintAmount = shareOfFreshSushi; // 用户能mint出去的币的数量
            }
            //并且给bob凭证
            _mint(msg.sender, mintAmount);
            emit Enter(msg.sender, _amount, mintAmount);
        }
    }

    function leave(uint256 _shareOfFreshSushi) external {
        if (_shareOfFreshSushi > 0) {
            uint256 totalVestedTokenSupply = vestingToken.balanceOf(
                address(this)
            );
            uint256 totalFreshSushi = totalSupply();
            // Calculates the amount of vestingToken the fSushi are worth
            uint256 amount = (_shareOfFreshSushi * totalVestedTokenSupply) /
                totalFreshSushi;
            _burn(msg.sender, _shareOfFreshSushi);
            vestingToken.transfer(msg.sender, amount);

            emit Leave(msg.sender, amount, _shareOfFreshSushi);
        }
    }

    function shareRevenue(uint256 _amount) external {
        vestingToken.transferFrom(msg.sender, address(this), _amount);
        emit ShareRevenue(_amount);
    }
}
