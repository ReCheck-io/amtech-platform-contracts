pragma solidity ^0.6.6;

import "./interfaces/IRandomGenerator.sol";
import "./interfaces/IPrizeDistribution.sol";
import "./AmTechToken.sol";
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
    mapping(address => bool) public distributionAdmins;

    // Round => Rewards Struct
    mapping(uint256 => RoundRewards[]) rewardsPerRound;
    uint256 public currentRound;
    bool public inActiveRound;

    // mapping(uint256 => Winner[]) public roundsAndWinningPositions;

    mapping(address => uint256) public winners;
    // prizes[] public allPrizes;

    struct UserStatus {
        uint256 index;
        bool isActive;
    }

    struct RoundRewards {
        uint256 rewardSize;
        uint256 numberOfRewards;
    }

    // struct Winner {
    //     address winner;
    //     uint256 position;
    // }

    // TODO add events for most of the functions and emit them, also write tests for the events
    modifier onlyTokenContract() {
        require(msg.sender == tokenAddress);
        _;
    }

    modifier onlyDistributionAdmin() {
        require(distributionAdmins[msg.sender], "The caller is not distribution admin");
        _;
    }

    modifier onlyInActiveRound() {
        require(inActiveRound, "Currently there is no started round");
        _;
    }

    /**
     * @dev Set random number generator contract
     *
     */
    constructor(address _randomGenerator) public {
        randomGenerator = IRandomGenerator(_randomGenerator);
    }

    function setDistributionAdmin(address _distributionAdmin, bool isDistributionAdmin) public onlyOwner {
        require(_distributionAdmin != address(0));
        distributionAdmins[_distributionAdmin] = isDistributionAdmin;
    }

    function setRandomGenerator(address _randomGenerator) public onlyOwner {
        require(_randomGenerator != address(0));
        randomGenerator = IRandomGenerator(_randomGenerator);
    }

    function setTokenAddress(address _tokenAddress) public onlyOwner {
        require(tokenAddress == address(0));
        require(_tokenAddress != address(0));
        tokenAddress = _tokenAddress;
    }

    function getUserCount() public view returns (uint256) {
        return tokenHolders.length;
    }

    function setWinners(address[] memory _address, uint256[] memory amount)
        public
        onlyOwner
    {
        for (uint256 i = 0; i < _address.length; i++) {
            winners[_address[i]] = amount[i];
        }
    }

    function setTrustedRandom(uint256 userSeed) public {
        currentRandomNumber = randomGenerator.rollTheDice(userSeed);
    }

    function getRewardsCount(uint256 roundNumber) public view returns (uint256) {
        return rewardsPerRound[roundNumber].length;
    }

    // TODO Create rewards lists - how many rewards by which type for which round we would have
    function createRewards(uint256[] memory rewardSizes, uint256[] memory numberOfRewards) public
        onlyDistributionAdmin
        onlyInActiveRound {
        // TODO Test
        require(rewardSizes.length == numberOfRewards.length, "The two arrays.length do not match");

        // TODO Test
        rewardsPerRound[currentRound] = RoundRewards(rewardSizes, numberOfRewards);
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

        return address(0);
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

    function startRound() public onlyDistributionAdmin {
        currentRound++;
        inActiveRound = true;
        AmTechToken(tokenAddress).pause();
    }

    function closeRound() public onlyDistributionAdmin {
        inActiveRound = false;
        AmTechToken(tokenAddress).unpause();
    }
}
