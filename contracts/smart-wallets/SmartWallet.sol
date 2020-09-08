pragma experimental ABIEncoderV2;
pragma solidity ^0.6.0;

import "./ECDSA.sol";

contract SmartWallet {
    uint256 public nonce;
    bool public initialised;
    bool internal _notEntered;
    enum SignerState {None, Guardian, Owner}
    mapping(address => SignerState) public isSigner;

    event LogActionAuthorised(uint256 nonce, address signer);
    event LogActionExecuted(
        uint256 nonce,
        address target,
        uint256 relayerReward,
        uint256 value,
        bytes data,
        bytes dataHashSignature
    );
    event LogRewardsPaid(uint256 nonce, address relayer, uint256 rewardPaid);
    event LogOwnerAdded(address addedOwner);
    event LogGuardianAdded(address addedGuardian);
    event LogOwnerRemoved(address removedOwner);
    event LogGuardianRemoved(address removedGuardian);

    receive() external payable {}

    /**
     * @param owner - initial owner of the smart wallet
     */
    function initialise(address owner) external {
        require(!initialised);
        isSigner[owner] = SignerState.Owner;
        _notEntered = true;
        initialised = true;
    }

    /**
     * @dev - returns the signer of a given dataHash
     * @param dataHash - the original hash that was signed
     * @param sig - the signature produced by signing dataHash
     */
    function getSigner(bytes32 dataHash, bytes memory sig)
        public
        pure
        returns (address signer)
    {
        return ECDSA.recover(ECDSA.toEthSignedMessageHash(dataHash), sig);
    }

    /**
     * @dev Internal function used to verify that given meta transaction is signed by the owner.
     * All the params + nonce get packed and hashed and then this hash is used as originalData to recover the signature in the last param
     * @param relayerReward - the reward that should be sent back to the relayer
     * @param target - the address that is being called
     * @param value - the value to be included by this transaction
     * @param data - the calldata to be included by this transaction
     * @param dataHashSignature - the result of owner.sign(keccak(previous params + nonce))
     * @return isValid - true if signed by owner, false otherwise
     */
    function isValidOwnerTransaction(
        uint256 relayerReward,
        address target,
        uint256 value,
        bytes memory data,
        bytes memory dataHashSignature
    ) internal view returns (bool isValid) {
        bytes32 dataHash = keccak256(
            abi.encodePacked(data, relayerReward, value, target, nonce)
        );
        address signer = getSigner(dataHash, dataHashSignature);
        return (isSigner[signer] == SignerState.Owner);
    }

    /**
     * @dev Internal function used to verify that given meta transaction is signed by the owner or guardian.
     * All the params + nonce get packed and hashed and then this hash is used as originalData to recover the signature in the last param
     * Check the params of the previous function
     * @return isValid - true if signed by owner or guardian, false otherwise
     */
    function isValidPriviligedTransaction(
        uint256 relayerReward,
        address target,
        uint256 value,
        bytes memory data,
        bytes memory dataHashSignature
    ) internal view returns (bool isValid) {
        bytes32 dataHash = keccak256(
            abi.encodePacked(data, relayerReward, value, target, nonce)
        );
        address signer = getSigner(dataHash, dataHashSignature);
        return (isSigner[signer] >= SignerState.Guardian);
    }

    modifier onlySelf {
        require(msg.sender == address(this));
        _;
    }

    modifier nonReentrant() {
        // On the first call to nonReentrant, _notEntered will be true
        require(_notEntered, "ReentrancyGuard: reentrant call");

        // Any calls to nonReentrant after this point will fail
        _notEntered = false;

        _;

        // By storing the original value once again, a refund is triggered (see
        // https://eips.ethereum.org/EIPS/eip-2200)
        _notEntered = true;
    }

    modifier onlyOwner(bytes32 dataHash, bytes memory dataSig) {
        address signer = getSigner(dataHash, dataSig);
        require(isSigner[signer] == SignerState.Owner);
        _;
    }

    modifier onlyPrivileged(bytes32 dataHash, bytes memory dataSig) {
        address signer = getSigner(dataHash, dataSig);
        require(isSigner[signer] >= SignerState.Guardian);
        _;
    }

    /**
     * @dev Can only be called by execute
     * Adds owner to this smart wallet. Should be authorised by guardian or owner
     * @param _signer - the new owner address
     * @param addressHash - hash of the signer address
     * @param addressSig - signature produced by owner or guardian of the hash of the signer
     */
    function addOwner(
        address _signer,
        bytes32 addressHash,
        bytes memory addressSig
    ) public onlySelf onlyPrivileged(addressHash, addressSig) {
        require(_signer != address(0x0));
        require(keccak256(abi.encodePacked(_signer)) == addressHash);
        isSigner[_signer] = SignerState.Owner;
        emit LogOwnerAdded(_signer);
    }

    /**
     * @dev Can only be called by execute
     * Adds guardian to this smart wallet. Should be authorised by owner
     * @param _guardian - the new guardian address
     * @param addressHash - hash of the guardian address
     * @param addressSig - signature produced by owner of the hash of the guardian
     */
    function addGuardian(
        address _guardian,
        bytes32 addressHash,
        bytes memory addressSig
    ) public onlySelf onlyOwner(addressHash, addressSig) {
        require(_guardian != address(0x0));
        require(keccak256(abi.encodePacked(_guardian)) == addressHash);
        isSigner[_guardian] = SignerState.Guardian;
        emit LogGuardianAdded(_guardian);
    }

    /**
     * @dev Can only be called by execute
     * Removes guardian of this smart wallet. Should be authorised by owner
     * @param _guardian - the old guardian address
     * @param addressHash - hash of the guardian address
     * @param addressSig - signature produced by owner of the hash of the guardian
     */
    function removeGuardian(
        address _guardian,
        bytes32 addressHash,
        bytes memory addressSig
    ) public onlySelf onlyOwner(addressHash, addressSig) {
        require(_guardian != address(0x0));
        require(keccak256(abi.encodePacked(_guardian)) == addressHash);
        require(isSigner[_guardian] == SignerState.Guardian);
        isSigner[_guardian] = SignerState.None;
        emit LogGuardianAdded(_guardian);
    }

    /**
     * @dev Can only be called by execute
     * Removes owner of this smart wallet. Should be authorised by owner or guardian
     * @param _signer - the old signer address
     * @param addressHash - hash of the signer address
     * @param addressSig - signature produced by owner or guardian of the hash of the signer
     */
    function removeOwner(
        address _signer,
        bytes32 addressHash,
        bytes memory addressSig
    ) public onlySelf onlyPrivileged(addressHash, addressSig) {
        require(_signer != address(0x0));
        require(keccak256(abi.encodePacked(_signer)) == addressHash);
        require(isSigner[_signer] == SignerState.Owner);
        isSigner[_signer] = SignerState.None;
        emit LogGuardianRemoved(_signer);
    }

    /**
     * @dev executes a list of transactions only if they are formatted and signed by the owner of this. Anyone can call execute. Nonce introduced as anti replay attack mechanism.
     * Calls that target this contract can be authorised by the guardian in order to allow for add/remove methods to be called
     *
     * @param target - the contracts to be called
     * @param relayerReward - the value sto be sent back to the relayer
     * @param value - the values to be sent to the target
     * @param data - the datas to be sent to be target
     * @param dataHashSignature - array of signed bytes of the keccak256 of target, nonce, value and data keccak256(data, relayerReward, value, target, nonce)
     */
    function execute(
        address[] calldata target,
        uint256[] calldata relayerReward,
        uint256[] calldata value,
        bytes[] calldata data,
        bytes[] calldata dataHashSignature
    ) external payable nonReentrant returns (bool) {
        require(target.length <= 8, "Too many transactions");

        for (uint256 i = 0; i < target.length; i++) {
            if (target[i] == address(this)) {
                require(
                    isValidPriviligedTransaction(
                        relayerReward[i],
                        target[i],
                        value[i],
                        data[i],
                        dataHashSignature[i]
                    ),
                    "execute :: Invalid priviliged authorisation"
                );
            } else {
                require(
                    isValidOwnerTransaction(
                        relayerReward[i],
                        target[i],
                        value[i],
                        data[i],
                        dataHashSignature[i]
                    ),
                    "execute :: Invalid owner authorisation"
                );
            }
            (bool success, ) = target[i].call.value(value[i])(data[i]);
            require(success, "execute :: Intended transaction reverted");
            require(
                rewardMsgSender(relayerReward[i]),
                "Could not reward the msg.sender"
            );
            emit LogActionExecuted(
                nonce,
                target[i],
                relayerReward[i],
                value[i],
                data[i],
                dataHashSignature[i]
            );
        }
        nonce++;
        return true;
    }

    /**
     * @dev called by execute to distribute reward. If no reward is set nothing happens
     * @param reward - the wei to send back to the relayer
     */
    function rewardMsgSender(uint256 reward) internal returns (bool) {
        if (reward > 0) {
            msg.sender.transfer(reward);
            emit LogRewardsPaid(nonce, msg.sender, reward);
        }

        return true;
    }
}
