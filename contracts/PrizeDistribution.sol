pragma solidity ^0.6.0;

import "./interfaces/IRandomGenerator.sol";
import "../node_modules/@openzeppelin/contracts/math/SafeMath.sol";
import "../node_modules/@openzeppelin/contracts/access/Ownable.sol";

/**
 * @dev {PrizeDistribution Contract}:
 *
 *  This contract holds token holder addresses and their balances as weights and
 *provides the functionality to draw winners based on those weigths.
 *
 */

contract PrizeDistribution is Ownable {
    using SafeMath for uint256;

    IRandomGenerator public randomGenerator;

    uint256 public totalSupply;
    address[] public tokenHolders;
    uint256[] public tokenHolderWeights;
    mapping(address => UserStatus) indexToHolderAddress;

    uint256 public currentRound;
    mapping(uint256 => uint256[]) public roundsAndWinningPositions;

    address[] public currentRoundWinnersAddress;

    struct UserStatus {
        uint256 index;
        bool isActiv;
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
            winningPosition = (
                // TODO: (i + 1)?
                tokenHolderWeights[(random * (i + 1)) % tokenHolders.length]
            );
            roundsAndWinningPositions[currentRound].push(winningPosition);

            address winner = findWinner(winningPosition);
            currentRoundWinnersAddress.push(winner);
        }
        return true;
    }

    // TODO: is it possible for one user to win multiple prices
    /**
     * @dev Uses a weighted random algorithm to find the winner.
     * Returns the winning address
     *
     */
    function findWinner(uint256 winningPosition) public view returns (address) {
        uint256 drawedBalances = 0;
        for (uint256 i = 0; i < tokenHolderWeights.length; i++) {
            drawedBalances = drawedBalances.add(tokenHolderWeights[i]);

            if (drawedBalances > winningPosition) {
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
    function setUserWheight(address tokenHolder, uint256 weight) public {
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
}
