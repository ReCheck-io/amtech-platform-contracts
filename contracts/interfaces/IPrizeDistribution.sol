pragma solidity ^0.6.0;

interface IPrizeDistribution {
    function setUserWheight(address tokenHolder, uint256 weight)
        external
        returns (bool);
}
