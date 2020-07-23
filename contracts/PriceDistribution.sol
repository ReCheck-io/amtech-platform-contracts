pragma solidity ^0.6.0;

import "./interfaces/IRandomGenerator.sol";
import "../node_modules/@openzeppelin/contracts/math/SafeMath.sol";
import "../node_modules/@openzeppelin/contracts/access/Ownable.sol";

contract PriceDistribution is Ownable {
    using SafeMath for uint256;

    IRandomGenerator public randomGenerator;

    // TODO: get real random number
    uint256 public RANDOM = 15;
    address[] public tokenHolders;
    uint256[] public tokenHolderWeights;
    mapping(address => uint256) indexToHolderAddress;

    struct UserInfo {
        address userAddress;
        uint256 userBalance;
        bool isActive;
    }

    uint256 public participientsCount = 0;
    mapping(uint256 => UserInfo) public indexToParticipients;

    constructor(address _randomGenerator) public {
        randomGenerator = IRandomGenerator(_randomGenerator);
    }

    // TODO: is it possible for one user to win multiple prices
    function pickWinner() public view returns (address) {
        uint256 drawedBalances = 0;
        for (uint256 i = 0; i < tokenHolderWeights.length; i++) {
            drawedBalances = drawedBalances.add(tokenHolderWeights[i]);

            if (drawedBalances > RANDOM) {
                return tokenHolders[i];
            }
        }
    }

    function setUserWheight(address tokenHolder, uint256 weight) public {
        uint256 index = indexToHolderAddress[tokenHolder];

        if (index == 0 && indexToParticipients[index].isActive) {
            indexToParticipients[index]
                .userBalance = indexToParticipients[index].userBalance.add(
                weight
            );
        } else {
            indexToParticipients[participientsCount].userAddress = tokenHolder;
            indexToParticipients[participientsCount].userBalance = weight;
            indexToParticipients[participientsCount].isActive = true;
            participientsCount++;
        }

        // if (index != 0) {
        //     tokenHolderWeights[index] = tokenHolderWeights[index].add(weight);
        // } else if (tokenHolders.length != 0) {
        //     tokenHolderWeights[index] = tokenHolderWeights[index].add(weight);
        // } else {
        //     tokenHolders.push(tokenHolder);
        //     tokenHolderWeights.push(weight);
        //     indexToHolderAddress[tokenHolder] = tokenHolderWeights.length - 1;
        // }
    }

    function getUserWeight(address tokenHolder) public view returns (uint256) {
        uint256 index = indexToHolderAddress[tokenHolder];
        return indexToParticipients[index].userBalance;
    }
}
