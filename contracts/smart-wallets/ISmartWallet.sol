pragma experimental ABIEncoderV2;
pragma solidity ^0.6.0;

interface ISmartWallet {
    function initialise(address owner) external;
    function execute(
        address[] calldata target,
        uint256[] calldata relayerReward,
        uint256[] calldata value,
        bytes[] calldata data,
        bytes[] calldata dataHashSignature
    ) external payable returns (bool);
}
