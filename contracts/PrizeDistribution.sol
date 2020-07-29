pragma solidity ^0.6.0;

import "./interfaces/IRandomGenerator.sol";
import "./interfaces/IPrizeDistribution.sol";
import "../node_modules/@openzeppelin/contracts/math/SafeMath.sol";
import "../node_modules/@openzeppelin/contracts/access/Ownable.sol";

/**
 * @dev {PrizeDistribution Contract}:
 *
 *  This contract holds token holder addresses and their balances as weights and
 *provides the functionality to draw winners based on those weigths.
 *
 */

contract PrizeDistribution is Ownable, IPrizeDistribution {
    using SafeMath for uint256;

    IRandomGenerator public randomGenerator;

    uint256 public totalSupply;
    address[] public tokenHolders;
    uint256[] public tokenHolderWeights;
    mapping(address => UserStatus) indexToHolderAddress;

    uint256 public currentRound;
    mapping(uint256 => Winner[]) public roundsAndWinningPositions;

    struct UserStatus {
        uint256 index;
        bool isActiv;
    }

    struct Winner {
        address winner;
        uint256 position;
    }

    /**
     * @dev Set random number generator contract
     *
     */
    constructor(address _randomGenerator) public {
        randomGenerator = IRandomGenerator(_randomGenerator);
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
        uint256 winningPosition;
        uint256 random = randomGenerator.rollTheDice(userSeed);
        for (uint256 i = 0; i < _n; i++) {
            winningPosition =
                tokenHolderWeights[random.mul(i) % tokenHolderWeights.length]
                    .mul(random) %
                totalSupply;

            address winner = findWinner(winningPosition);

            Winner memory currentWinner = Winner(winner, winningPosition);
            roundsAndWinningPositions[currentRound].push(currentWinner);
        }
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

    // TODO: Token contract should set this
    // TODO: some validations maybe
    /**
     * @dev Set token holder addresses and their balances as weights.
     * Requirements:
     * - should be executable only from token contract
     *
     */
    function setUserWheight(address tokenHolder, uint256 weight)
        public
        override
        returns (bool)
    {
        if (!indexToHolderAddress[tokenHolder].isActiv) {
            tokenHolders.push(tokenHolder);
            tokenHolderWeights.push(weight);
            indexToHolderAddress[tokenHolder].index =
                tokenHolderWeights.length -
                1;
            indexToHolderAddress[tokenHolder].isActiv = true;
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
        returns (uint256 index, bool isActiv)
    {
        require(indexToHolderAddress[tokenHolder].isActiv);
        return (
            indexToHolderAddress[tokenHolder].index,
            indexToHolderAddress[tokenHolder].isActiv
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
}
