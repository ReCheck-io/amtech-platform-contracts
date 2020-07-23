pragma solidity ^0.6.0;

interface IRandomGenerator {
    function rollTheDice(uint256 userProvidedSeed)
        external
        returns (uint256);
}
