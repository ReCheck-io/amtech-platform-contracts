// Copyright (C) 2020 LimeChain - Blockchain & DLT Solutions <https://limechain.tech>

pragma solidity ^0.6.6;

import "../node_modules/@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Whitelisting
 * @dev Manages whitelisting of accounts (EOA or contracts).
 */
contract Whitelisting is Ownable {
    // The whitelisted accounts storage
    mapping(address => bool) private whitelisted;
    mapping(address => bool) public whitelisters;

    event WhitelistedStatusModified(
        address indexed executor,
        address[] user,
        bool status
    );

    /**
     * @dev Throws if the sender is neither operator nor owner.
     */
    modifier onlyAuthorized() {
        require(
            whitelisters[msg.sender] || msg.sender == owner(),
            "Whitelisting: the caller is not whitelistOperator or owner"
        );
        _;
    }

    /**
     * @dev Adds/Removes whitelisted accounts.
     * @param _users The target accounts.
     * @param _isWhitelisted Set to true to whitelist accounts.
     */
    function setWhitelisted(address[] memory _users, bool _isWhitelisted)
        public
        onlyAuthorized
    {
        for (uint256 i = 0; i < _users.length; i++) {
            require(
                _users[i] != address(0),
                "Whitelisting: user is the zero address"
            );
            whitelisted[_users[i]] = _isWhitelisted;
        }
        emit WhitelistedStatusModified(msg.sender, _users, _isWhitelisted);
    }

    /**
     * @dev Checks if an account is whitelisted.
     * @param _user The target account.
     */
    function isWhitelisted(address _user) public view returns (bool) {
        return whitelisted[_user];
    }

    /**
     * @dev Adds/Removes whitelisters accounts.
     * @param _whitelister The target accounts.
     * @param _isWhitelister Set to true to add whitelister admin accounts.
     */

    function setWhitelister(address _whitelister, bool _isWhitelister)
        public
        onlyOwner
    {
        require(_whitelister != address(0));
        whitelisters[_whitelister] = _isWhitelister;
    }
}
