pragma solidity ^0.6.6;

import "../interfaces/IRandomGenerator.sol";
import "../../node_modules/@openzeppelin/contracts/math/SafeMath.sol";

contract mockRandomGenerator is IRandomGenerator {
    using SafeMath for uint256;

    function rollTheDice(uint256 userProvidedSeed)
        public
        override
        returns (uint256)
    {
        return userProvidedSeed.add(block.timestamp);
    }
}
