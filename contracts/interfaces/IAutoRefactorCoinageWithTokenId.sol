// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;

interface IAutoRefactorCoinageWithTokenId {
    function factor() external view returns (uint256);

    function setFactor(uint256 _factor) external returns (uint256);

    function burn(address tokenOwner, uint256 tokenId, uint256 amount) external;

    function mint(address tokenOwner, uint256 tokenId, uint256 amount) external returns (bool);

    function totalSupply() external view returns (uint256);

    function balanceOf(uint256 tokenId) external view returns (uint256);

    function burnTokenId(address tokenOwner, uint256 tokenId) external ;
}
