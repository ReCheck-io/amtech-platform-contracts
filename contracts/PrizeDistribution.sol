pragma solidity ^0.6.6;

import "./interfaces/IRandomGenerator.sol";
import "./interfaces/IPrizeDistribution.sol";
import "../node_modules/@openzeppelin/contracts/math/SafeMath.sol";
import "../node_modules/@openzeppelin/contracts/access/Ownable.sol";

/**
 * @dev {PrizeDistribution Contract}:
 *
 *  This contract holds token holder addresses and their balances as weights and
 *provides the functionality to draw winners based on those weights.
 *
 */

contract PrizeDistribution is Ownable, IPrizeDistribution {
    using SafeMath for uint256;

    IRandomGenerator public randomGenerator;
    uint256 public currentRandomNumber;

    address public tokenAddress;
    uint256 public totalSupply;
    address[] public tokenHolders;
    uint256[] public tokenHolderWeights;

    mapping(address => UserStatus) indexToHolderAddress;

    uint256 public currentRound;

    // mapping(uint256 => Winner[]) public roundsAndWinningPositions;

    mapping(address => uint256) public winnners;
    // prizes[] public allPrizes;

    struct UserStatus {
        uint256 index;
        bool isActive;
    }

    // struct Winner {
    //     address winner;
    //     uint256 position;
    // }

    modifier onlyTokenContract() {
        require(msg.sender == tokenAddress);
        _;
    }

    /**
     * @dev Set random number generator contract
     *
     */
    constructor(address _randomGenerator) public {
        randomGenerator = IRandomGenerator(_randomGenerator);
    }

    function setWinnners(address[] memory _address, uint256[] memory amount)
        public
        onlyOwner
    {
        for (uint256 i = 0; i < _address.length; i++) {
            winnners[_address[i]] = amount[i];
        }
    }

    function setTrustedRandom(uint256 userSeed) public {
        currentRandomNumber = randomGenerator.rollTheDice(userSeed);
    }

    function findWinner(uint256 random) public view returns (address) {
        uint256 winnerRange = random % totalSupply;
        uint256 drawedBalances = 0;
        for (uint256 i = 0; i < tokenHolders.length; i++) {
            drawedBalances = drawedBalances.add(tokenHolderWeights[i]);

            if (drawedBalances > winnerRange) {
                return tokenHolders[i];
            }
        }
    }

    // TODO: token contract should be able to decrease user weight!
    /**
     * @dev Set token holder addresses and their balances as weights.
     * Requirements:
     * - should be executable only from token contract
     *
     */
    function setUserWeight(address tokenHolder, uint256 weight)
        public
        override
        onlyTokenContract
        returns (bool)
    {
        if (!indexToHolderAddress[tokenHolder].isActive) {
            tokenHolders.push(tokenHolder);
            tokenHolderWeights.push(weight);
            indexToHolderAddress[tokenHolder].index =
                tokenHolderWeights.length -
                1;
            indexToHolderAddress[tokenHolder].isActive = true;
            totalSupply = totalSupply.add(weight);
        } else {
            tokenHolderWeights[indexToHolderAddress[tokenHolder]
                .index] = tokenHolderWeights[indexToHolderAddress[tokenHolder]
                .index]
                .add(weight);
            totalSupply = totalSupply.add(weight);
        }
        return true;
    }

    
    function getUserCount() public view returns (uint256) {
        return tokenHolders.length;
    }

    function setTokenAddress(address _tokenAddress) public onlyOwner {
        require(tokenAddress == address(0));
        require(_tokenAddress != address(0));
        tokenAddress = _tokenAddress;
    }

    function closeRound() public onlyTokenContract {
        currentRound++;
    }

    function setRandomGenerator(address _randomGenerator) public onlyOwner {
        require(_randomGenerator != address(0));
        randomGenerator = IRandomGenerator(_randomGenerator);
    }
}
