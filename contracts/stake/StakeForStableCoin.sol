//SPDX-License-Identifier: Unlicense
pragma solidity ^0.7.0;

import {IStake1Vault} from "../interfaces/IStake1Vault.sol";
//import { IERC20 } from "../interfaces/IERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../libraries/LibTokenStake1.sol";
import "./Stake1Storage.sol";
import "../connection/YearnV2Staker.sol";
import {
    ERC165Checker
} from "@openzeppelin/contracts/introspection/ERC165Checker.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";

contract StakeForStableCoin is YearnV2Staker {
    using SafeERC20 for IERC20;

    modifier lock() {
        require(_lock == 0, "Stake1Vault: LOCKED");
        _lock = 1;
        _;
        _lock = 0;
    }

    event Claimed(address indexed from, uint256 amount, uint256 currentBlcok);
    event Withdrawal(
        address indexed from,
        address indexed to,
        uint256 amount,
        uint256 currentBlcok
    );

    constructor() {
        _setRoleAdmin(ADMIN_ROLE, ADMIN_ROLE);
        _setupRole(ADMIN_ROLE, msg.sender);
    }

    /// @dev Initialize
    function initialize(
        address _token,
        address _paytoken,
        address _vault,
        uint256 _saleStartBlock,
        uint256 _startBlock,
        uint256 _period
    ) external onlyOwner {
        require(
            _token != address(0) &&
                _vault != address(0) &&
                _saleStartBlock <= _startBlock
        );
        token = _token;
        paytoken = _paytoken;
        vault = _vault;
        if (_saleStartBlock == 0) saleStartBlock = block.number;
        else saleStartBlock = _saleStartBlock;
        if (_startBlock == 0) startBlock = block.number;
        else startBlock = _startBlock;
        endBlock = startBlock + _period;
    }

    receive() external payable {
        // stake(msg.value);
    }

    /*
    /// call yearnV2Vault
    fallback() external payable{
        _fallback();
    }

    function _fallback() internal {
        address _impl = yearnV2Vault();
        //uint256 value = msg.value;

        require(
            _impl != address(0),
            "YearnV2Staker: yearnV2Vault is zero"
        );
        assembly {
            // Copy msg.data. We take full control of memory in this inline assembly
            // block because it will not return to Solidity code. We overwrite the
            // Solidity scratch pad at memory position 0.
            calldatacopy(0, 0, calldatasize())

            // Call the implementation.
            // out and outsize are 0 because we don't know the size yet.
            //let result := delegatecall(gas(), _impl, 0, calldatasize(), 0, 0)
            let result := call(gas(), _impl, 0, 0, calldatasize(), 0, 0)

            // Copy the returned data.
            returndatacopy(0, 0, returndatasize())

            switch result
                // delegatecall returns 0 on error.
                case 0 {
                    revert(0, returndatasize())
                }
                default {
                    return(0, returndatasize())
                }
        }
    }
    */
    /// @dev Stake amount
    function stake(uint256 _amount) public payable {
        require(
            (paytoken == address(0) && msg.value > 0) ||
                (paytoken != address(0) && _amount > 0),
            "Stake1: amount is zero"
        );
        require(
            block.number >= saleStartBlock && saleStartBlock < startBlock,
            "Stake1: period is unavailable"
        );

        uint256 amount = _amount;
        if (paytoken == address(0)) amount = msg.value;

        LibTokenStake1.StakedAmount storage staked = userStaked[msg.sender];
        staked.amount += amount;
        totalStakedAmount += amount;
        if (paytoken != address(0))
            require(
                IERC20(paytoken).transferFrom(msg.sender, address(this), amount)
            );
    }

    /// @dev To withdraw
    function withdraw() external {
        require(
            endBlock > 0 && endBlock < block.number,
            "Stake1: on staking period"
        );
        LibTokenStake1.StakedAmount storage staked = userStaked[msg.sender];

        uint256 amount = staked.amount;

        // TODO: restaking reward
        require(
            staked.amount > 0 && staked.releasedAmount <= staked.amount,
            "Stake1: releasedAmount > stakedAmount"
        );

        staked.releasedAmount = staked.amount;
        staked.releasedBlock = block.number;
        staked.released = true;

        // check if we send in ethers or in tokens
        if (paytoken == address(0)) {
            address payable self = address(uint160(address(this)));
            require(self.balance >= amount);
            (bool success, ) = msg.sender.call{value: amount}("");
            require(success, "Stake1: withdraw eth send failed.");
        } else {
            require(
                IERC20(paytoken).transfer(msg.sender, amount),
                "Stake1: withdraw transfer fail"
            );
        }

        emit Withdrawal(address(this), msg.sender, amount, block.number);
    }

    /// @dev Claim for reward
    function claim() external lock {
        require(
            IStake1Vault(vault).saleClosed() == true,
            "Stake1: disclose sale."
        );
        address account = msg.sender;
        uint256 rewardClaim = 0;
        uint256 currentBlock = block.number;

        LibTokenStake1.StakedAmount storage staked = userStaked[account];
        require(staked.claimedBlock < endBlock, "Stake1: claimed");

        rewardClaim = canRewardAmount(account);

        require(rewardClaim > 0, "Stake1: reward is zero");

        uint256 rewardTotal =
            IStake1Vault(vault).totalRewardAmount(address(this));
        require(
            (rewardClaimedTotal + rewardClaim) <= rewardTotal,
            "Stake1: total reward exceeds"
        );

        staked.claimedBlock = currentBlock;
        staked.claimedAmount += rewardClaim;
        rewardClaimedTotal += rewardClaim;

        require(IStake1Vault(vault).claim(account, rewardClaim));

        emit Claimed(account, rewardClaim, currentBlock);
    }

    /// @dev Returns the amount that can be rewarded
    function canRewardAmount(address account) public view returns (uint256) {
        uint256 reward = 0;
        if (
            block.number < startBlock ||
            userStaked[account].amount == 0 ||
            userStaked[account].claimedBlock > endBlock ||
            userStaked[account].claimedBlock > block.number
        ) {
            reward = 0;
        } else {
            uint256 startR = startBlock;
            uint256 endR = endBlock;
            if (startR < userStaked[account].claimedBlock)
                startR = userStaked[account].claimedBlock;
            if (block.number < endR) endR = block.number;

            uint256[] memory orderedEndBlocks =
                IStake1Vault(vault).orderedEndBlocksAll();

            if (orderedEndBlocks.length > 0) {
                uint256 _end = 0;
                uint256 _total = 0;
                uint256 blockTotalReward = 0;
                blockTotalReward = IStake1Vault(vault).blockTotalReward();

                for (uint256 i = 0; i < orderedEndBlocks.length; i++) {
                    _end = orderedEndBlocks[i];
                    _total = IStake1Vault(vault).stakeEndBlockTotal(_end);

                    if (endR <= _end) {
                        reward +=
                            (blockTotalReward *
                                (endR - startR) *
                                userStaked[account].amount) /
                            _total;
                        break;
                    } else {
                        reward +=
                            (blockTotalReward *
                                (_end - startR) *
                                userStaked[account].amount) /
                            _total;
                        startR = _end;
                    }
                }
            }
        }
        return reward;
    }
}