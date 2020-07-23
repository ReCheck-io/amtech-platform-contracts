pragma solidity ^0.6.0;

import "./interfaces/IRandomGenerator.sol";
import "../node_modules/@openzeppelin/contracts/math/SafeMath.sol";
import "../node_modules/@openzeppelin/contracts/access/Ownable.sol";

contract PrizeDistribution is Ownable {
    using SafeMath for uint256;

    IRandomGenerator public randomGenerator;

    uint256 public totalSupply;
    address[] public tokenHolders;
    uint256[] public tokenHolderWeights;
    mapping(address => UserStatus) indexToHolderAddress;

    // uint256[] public currentRoundWinners;
    // address[] public currentRoundWinnersAddress;

    uint256 public currentRound;
    mapping(uint256 => uint256) public roundsAndWinningPositions;

    struct UserStatus {
        uint256 index;
        bool isActiv;
    }

    // struct Winners {
    //     address winner;
    //     uint256 prize;
    //     uint256 timestamp;
    // }

    constructor(address _randomGenerator) public {
        randomGenerator = IRandomGenerator(_randomGenerator);
    }

    function drawWinners(uint256 n, uint256 userSeed) public returns (bool) {
        uint256 winningPosition;
        uint256 random = randomGenerator.rollTheDice(userSeed);
        for (uint256 i = 0; i < n; i++) {
            winningPosition = (
                tokenHolderWeights[((random * i) % tokenHolders.length)]
            );
            roundsAndWinningPositions[currentRound].push(winningPosition);

            // address winner = findWinner(winningPosition);
            // currentRoundWinnersAddress.push(winner);
        }
    }

    // TODO: is it possible for one user to win multiple prices
    function findWinner(uint256 RANDOM) public view returns (address) {
        uint256 drawedBalances = 0;
        for (uint256 i = 0; i < tokenHolderWeights.length; i++) {
            drawedBalances = drawedBalances.add(tokenHolderWeights[i]);

            if (drawedBalances > RANDOM) {
                return tokenHolders[i];
            }
        }
    }

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
