pragma solidity ^0.6.0;

contract MockTarget {
    mapping(bytes32 => bool) public bought;

	receive() external payable {}

    function buy(bytes32 item) public {
        require(!bought[item]);
        bought[item] = true;
    }
}
