pragma solidity ^0.6.0;

import "./Address.sol";
import "./Create2.sol";
import "./ECDSA.sol";
import "./ReentrancyGuard.sol";
import "./ISmartWallet.sol";

contract Relayer is ReentrancyGuard {
    // TODO:  withdraw your money
    bytes public proxyBytecode;

    constructor(bytes memory _proxyBytecode) public {
        proxyBytecode = _proxyBytecode;
    }

    function relay(
        address to,
        bytes calldata toSig,
        bytes calldata relayData
    ) external payable nonReentrant {
        if (!Address.isContract(to)) {
            bytes32 toHash = keccak256(abi.encodePacked(to));
            address signer = ECDSA.recover(
                ECDSA.toEthSignedMessageHash(toHash),
                toSig
            );
            address walletAddress = deploySmartContract(signer);
            ISmartWallet(walletAddress).initialise(signer);
        }

        (bool success, ) = to.call(relayData);
        require(success, "Unsuccessful Relay");
    }

    function deploySmartContract(address user) internal returns (address) {
        return
            Create2.deploy(
                keccak256(abi.encodePacked(user)),
                abi.encodePacked(proxyBytecode)
            );
    }

    function getAccountAddressForUser(address user)
        public
        view
        returns (address)
    {
        return
            Create2.computeAddress(
                keccak256(abi.encodePacked(user)),
                abi.encodePacked(proxyBytecode)
            );
    }
}
