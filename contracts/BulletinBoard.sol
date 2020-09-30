/// @author Limechain Team
// SPDX-License-Identifier: MIT

pragma solidity ^0.6.6;

import "../node_modules/@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../node_modules/@openzeppelin/contracts/math/SafeMath.sol";

/**
 * @title BulletinBoard
 * @dev This contract allows AmTech token holders to transfer their tokens
 * between other whitelisted platform users for a specific amount of ethers
 */
contract BulletinBoard {
    using SafeMath for uint256;

    IERC20 public amtechToken;

    /**
     * @dev Passes the address and sets the instance of the AmTech Token
     *
     * AmTech Token can only be set once - during
     * construction.
     */
    constructor(address _amtechToken) public onlyValidAddress(_amtechToken) {
        amtechToken = IERC20(_amtechToken);
    }

    mapping(address => OrdersData) private ordersPerUser;
    address[] private orderHolders;

    struct OrdersData {
        mapping(uint256 => Order) orders;
        uint256 ordersCount;
        uint256 totalTokensForSale;
    }

    struct Order {
        uint256 tokensForSale;
        uint256 priceForTokens;
        bool isActive;
    }

    event OrderCreated(
        address indexed orderer,
        uint256 tokensForSale,
        uint256 priceForTokens
    );

    event OrderEdited(
        address indexed orderer,
        uint256 orderIndex,
        uint256 tokensForSale,
        uint256 priceForTokens
    );

    event OrderPurchased(
        address indexed orderer,
        address indexed buyer,
        uint256 orderIndex
    );

    event OrderCanceled(address indexed orderer, uint256 orderIndex);

    modifier onlyValidAddress(address _address) {
        require(_address != address(0));
        _;
    }

    /**
     * @dev createOrder allows msg.sender to create an order
     *
     *     * Requirements:
     * this contract should have the needed allowance for the future distribution of the tokens for sale
     *
     * Emits: OrderCreated event with orderer address, amount tokens for sale and price for tokens
     */
    function createOrder(uint256 _tokensForSale, uint256 _priceForTokens)
        external
        returns (bool)
    {
        require(
            amtechToken.allowance(msg.sender, address(this)) >=
                ordersPerUser[msg.sender].totalTokensForSale.add(_tokensForSale)
        );

        ordersPerUser[msg.sender].orders[ordersPerUser[msg.sender]
            .ordersCount] = Order({
            tokensForSale: _tokensForSale,
            priceForTokens: _priceForTokens,
            isActive: true
        });
        ordersPerUser[msg.sender].totalTokensForSale = ordersPerUser[msg.sender]
            .totalTokensForSale
            .add(_tokensForSale);
        ordersPerUser[msg.sender].ordersCount = ordersPerUser[msg.sender]
            .ordersCount
            .add(1);

        if (!contains(msg.sender)) {
            orderHolders.push(msg.sender);
        }

        emit OrderCreated(msg.sender, _tokensForSale, _priceForTokens);

        return true;
    }

    /**
     * @dev editOrder allows msg.sender to edit his own specific and active order
     *
     *     * Requirements:
     * this contract should have the needed allowance for the future distribution of the tokens for sale
     *
     * Emits: OrderEdited event with orderers address, order index, new amount tokens for sale and new price for tokens
     */
    function editOrder(
        uint256 _orderIndex,
        uint256 _tokensForSale,
        uint256 _priceForTokens
    ) external returns (bool) {
        require(
            amtechToken.allowance(msg.sender, address(this)) >=
                ordersPerUser[msg.sender]
                    .totalTokensForSale
                    .sub(
                    ordersPerUser[msg.sender].orders[_orderIndex]
                        .tokensForSale
                )
                    .add(_tokensForSale)
        );

        require(ordersPerUser[msg.sender].orders[_orderIndex].isActive);

        ordersPerUser[msg.sender].totalTokensForSale = ordersPerUser[msg.sender]
            .totalTokensForSale
            .sub(ordersPerUser[msg.sender].orders[_orderIndex].tokensForSale)
            .add(_tokensForSale);

        ordersPerUser[msg.sender].orders[_orderIndex]
            .tokensForSale = _tokensForSale;
        ordersPerUser[msg.sender].orders[_orderIndex]
            .priceForTokens = _priceForTokens;

        emit OrderEdited(
            msg.sender,
            _orderIndex,
            _tokensForSale,
            _priceForTokens
        );
        return true;
    }

    /**
     * @dev purchaseOrder allows msg.sender to purchase a specific and valid order
     *
     *     * Requirements:
     * msg.sender to be whitelisted
     * msg.value to be at least equal to the price for the tokens
     *
     * Emits: OrderPurchased event with orderer, buyer and order index
     */
    function purchaseOrder(address payable _orderer, uint256 _orderIndex)
        external
        payable
        returns (bool)
    {
        require(ordersPerUser[_orderer].orders[_orderIndex].isActive);
        require(
            msg.value >=
                ordersPerUser[_orderer].orders[_orderIndex].priceForTokens
        );

        ordersPerUser[_orderer].orders[_orderIndex].isActive = false;

        ordersPerUser[_orderer].totalTokensForSale = ordersPerUser[_orderer]
            .totalTokensForSale
            .sub(ordersPerUser[_orderer].orders[_orderIndex].tokensForSale);

        amtechToken.transferFrom(
            _orderer,
            msg.sender,
            ordersPerUser[_orderer].orders[_orderIndex].tokensForSale
        );

        _orderer.transfer(
            ordersPerUser[_orderer].orders[_orderIndex].priceForTokens
        );

        emit OrderPurchased(_orderer, msg.sender, _orderIndex);

        return true;
    }

    /**
     * @dev cancelOrder allows an order holder to cancel a specific order
     *     * Requirements:
     * msg.sender to be the order owner of a specific and active order
     */
    function cancelOrder(uint256 _orderIndex) external returns (bool) {
        require(ordersPerUser[msg.sender].orders[_orderIndex].isActive);

        ordersPerUser[msg.sender].orders[_orderIndex].isActive = false;

        emit OrderCanceled(msg.sender, _orderIndex);

        return true;
    }

    /**
     * @dev getOrderersCount returns all orderers count
     */
    function getOrderersCount() external view returns (uint256 ordererCount) {
        return orderHolders.length;
    }

    /**
     * @dev getOrdersCountPerOrderer returns all orders count for a specific orderer
     */
    function getOrdersCountPerOrderer(address _orderer)
        external
        view
        returns (uint256 orderCount)
    {
        return ordersPerUser[_orderer].ordersCount;
    }

    /**
     * @dev getOrderDetails returns data for a specific order
     *
     * @return tokensForSale uint256, amount of tokens for sale
     * @return priceForTokens uint256, amount of ethers required for buying tokensForSale
     * @return isActive bool, the status of the order
     */
    function getOrderDetails(address _orderer, uint256 _orderIndex)
        external
        view
        returns (
            uint256 tokensForSale,
            uint256 priceForTokens,
            bool isActive
        )
    {
        return (
            ordersPerUser[_orderer].orders[_orderIndex].tokensForSale,
            ordersPerUser[_orderer].orders[_orderIndex].priceForTokens,
            ordersPerUser[_orderer].orders[_orderIndex].isActive
        );
    }

    /**
     * @dev check for existing orderer address
     *
     * returns bool true if address exists
     */
    function contains(address _orderHolder) private view returns (bool) {
        if (orderHolders.length == 0) {
            return false;
        }
        for (uint256 i = 0; i < orderHolders.length; i++) {
            if (orderHolders[i] == _orderHolder) {
                return true;
            }
        }
        return false;
    }
}
