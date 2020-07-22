pragma solidity ^0.6.0;

import "./interfaces/IRandomGenerator.sol";
import "../node_modules/@openzeppelin/contracts/math/SafeMath.sol";

contract PriceDistribution {
    using SafeMath for uint256;

    IRandomGenerator public randomGenerator;

    // TODO: get real random number
    uint256 public RANDOM = 15;
    address[] public tokenHolders;
    uint256[] public tokenHolderBalances;

    constructor(address _randomGenerator) public {
        randomGenerator = IRandomGenerator(_randomGenerator);
    }

    // TODO: is it possible for one user to win multiple prices
    function pickWinner() public view returns (address) {
        uint256 drawedBalances = 0;
        for (uint256 i = 0; i < tokenHolders.length; i++) {
            drawedBalances = drawedBalances.add(tokenHolderBalances[i]);

            if (drawedBalances > RANDOM) {
                return tokenHolders[i];
            }
        }
    }
}
