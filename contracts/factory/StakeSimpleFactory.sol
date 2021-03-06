// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;

import "../interfaces/IStakeContractFactory.sol";
import {StakeSimpleProxy} from "../stake/StakeSimpleProxy.sol";
import "../common/AccessRoleCommon.sol";

/// @title A factory that creates a stake contract
contract StakeSimpleFactory is AccessRoleCommon, IStakeContractFactory {
    address public stakeSimpleLogic;

    /// @dev constructor of StakeSimpleFactory
    /// @param _stakeSimpleLogic the logic address used in StakeSimpleFactory
    constructor(address _stakeSimpleLogic) {
        require(
            _stakeSimpleLogic != address(0),
            "StakeSimpleFactory: logic zero"
        );
        stakeSimpleLogic = _stakeSimpleLogic;
    }

    /// @dev Create a stake contract that can operate the staked amount as a DeFi project.
    /// @param _addr array of [token, paytoken, vault, defiAddr]
    /// @param _intdata array of [saleStartBlock, startBlock, periodBlocks]
    /// @param owner  owner address
    /// @return contract address
    function create(
        address[4] calldata _addr,
        address _registry,
        uint256[3] calldata _intdata,
        address owner
    ) external override returns (address) {
        StakeSimpleProxy proxy = new StakeSimpleProxy(stakeSimpleLogic);
        require(address(proxy) != address(0), "StakeSimpleFactory: proxy zero");

        proxy.setInit(_addr, _registry, _intdata);
        proxy.grantRole(ADMIN_ROLE, owner);
        proxy.revokeRole(ADMIN_ROLE, address(this));

        return address(proxy);
    }
}
