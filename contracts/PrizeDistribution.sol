pragma solidity ^0.6.0;

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
    address public tokenAddress;

    uint256 public totalSupply;
    address[] public tokenHolders;
    uint256[] public tokenHolderWeights;
    mapping(address => UserStatus) indexToHolderAddress;

    uint256 public currentRound;
    mapping(uint256 => Winner[]) public roundsAndWinningPositions;

    mapping(address => uint256) public winnn;
    // prizes[] public allPrizes;

    struct UserStatus {
        uint256 index;
        bool isActive;
    }

    struct Winner {
        address winner;
        uint256 position;
    }

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

    function setWinnn(address[] memory _address, uint256[] memory amount)
        public
    {
        require(msg.sender != address(0));
        require(msg.sender == tokenAddress);
        
        for (uint256 i = 0; i < _address.length; i++) {
            winnn[_address[i]] = amount[i];
        }
    }

    // TODO: should set max number of winners per draw
    /**
     * @dev Draw _n number of winners based on verifiable random number, seed word and user weights and
     * add them to a list of winners per round
     *
     * Requirements:
     * - Amtech token must be paused
     *
     * Can be called from any user
     */
    function drawWinners(uint256 _n, uint256 userSeed) public returns (bool) {
        require(msg.sender != address(0));
        require(msg.sender == tokenAddress);
        // uint256 winningPosition;
        uint256 random = randomGenerator.rollTheDice(userSeed);
        // for (uint256 i = 0; i < _n; i++) {
        //     winningPosition =
        //         tokenHolderWeights[random.mul(i) % tokenHolderWeights.length]
        //             .mul(random) %
        //         totalSupply;

        //     address winner = findWinner(winningPosition);

        //     Winner memory currentWinner = Winner(winner, winningPosition);
        //     roundsAndWinningPositions[currentRound].push(currentWinner);
        // }
        return true;
    }

    // TODO: is it possible for one user to win multiple prices
    /**
     * @dev Uses a weighted random algorithm to find the winner.
     * Returns the winning address
     *
     */
    function findWinner(uint256 random) public view returns (address) {
        uint256 drawedBalances = 0;
        for (uint256 i = 0; i < tokenHolders.length; i++) {
            drawedBalances = drawedBalances.add(tokenHolderWeights[i]);

            if (drawedBalances > random) {
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

    function getUserInfo(address tokenHolder)
        public
        view
        returns (uint256 index, bool isActive)
    {
        require(indexToHolderAddress[tokenHolder].isActive);
        return (
            indexToHolderAddress[tokenHolder].index,
            indexToHolderAddress[tokenHolder].isActive
        );
    }

    function getWinnerPerRound(uint256 round, uint256 position)
        public
        view
        returns (address, uint256)
    {
        return (
            roundsAndWinningPositions[round][position].winner,
            roundsAndWinningPositions[round][position].position
        );
    }

    function getRoundWinnersCount(uint256 round) public view returns (uint256) {
        return (roundsAndWinningPositions[round].length);
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
