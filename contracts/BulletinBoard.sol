/// @author Limechain
// SPDX-License-Identifier: MIT

pragma solidity ^0.6.6;

import "../node_modules/@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../node_modules/@openzeppelin/contracts/math/SafeMath.sol";

/**
 * @title BulletinBoard
 * @dev This contract allows AmTech token holders to transfer their tokens
 * with other whitelisted platform users for a specific amount of ethers
 */
contract BulletinBoard {
    using SafeMath for uint256;

    IERC20 public amTechToken;

    address[] public allSellers;
    mapping(address => Offer[]) public offersPerSeller;
    mapping(address => SellerInfo) public infoPerSeller;
    mapping(address => uint256) public totalTokensForSalePerSeller;

    struct SellerInfo {
        bool exists;
        uint256 allSellersIndex;
    }
    struct Offer {
        address seller;
        uint256 tokenAmount;
        uint256 ethAmount;
    }

    event OfferCreated(
        address indexed seller,
        uint256 tokensForSale,
        uint256 priceForTokens
    );

    event OfferEdited(
        address indexed seller,
        uint256 offerIndex,
        uint256 tokensForSale,
        uint256 priceForTokens
    );

    event OfferBought(
        address indexed seller,
        address indexed buyer,
        uint256 offerIndex
    );

    event OfferCanceled(address indexed seller, uint256 offerIndex);

    /**
     * @dev Passes the address and sets the instance of the AmTech Token
     *
     * AmTech Token can only be set once - during
     * construction.
     */
    constructor(address _amTechToken) public {
        require(_amTechToken != address(0));
        amTechToken = IERC20(_amTechToken);
    }

    /**
     * @dev createOffer allows msg.sender to create an offer
     *
     *     * Requirements:
     * this contract should have the needed allowance for the future distribution of the tokens for sale
     *
     * Emits: OfferCreated event with seller address, amount tokens for sale and price for tokens in eth
     */
    function createOffer(uint256 _tokenAmount, uint256 _ethAmount)
        external
        returns (bool)
    {
        require(_tokenAmount > 0);
        require(_ethAmount > 0);
        uint256 totalTokensForSale = totalTokensForSalePerSeller[msg.sender]
            .add(_tokenAmount);
        require(hasAllowance(msg.sender, totalTokensForSale));
        require(hasEnoughTokens(msg.sender, totalTokensForSale));

        totalTokensForSalePerSeller[msg.sender] = totalTokensForSale;

        offersPerSeller[msg.sender].push(
            Offer({
                seller: msg.sender,
                tokenAmount: _tokenAmount,
                ethAmount: _ethAmount
            })
        );

        if (!infoPerSeller[msg.sender].exists) {
            infoPerSeller[msg.sender] = SellerInfo({
                exists: true,
                allSellersIndex: allSellers.length
            });
            allSellers.push(msg.sender);
        }

        emit OfferCreated(msg.sender, _tokenAmount, _ethAmount);

        return true;
    }

    /**
     * @dev cancelOffer allows an offer holder to cancel a specific offer
     *     * Requirements:
     * msg.sender to be the offer owner of a specific offer
     *
     * Emits: OfferCanceled event with seller address and offer Index
     */
    function cancelOffer(uint256 _offerIndex) external returns (bool) {
        removeOffer(
            msg.sender,
            _offerIndex,
            infoPerSeller[msg.sender].allSellersIndex
        );
        emit OfferCanceled(msg.sender, _offerIndex);
        return true;
    }

    /**
     * @dev editOffer allows msg.sender to edit his own specific offer
     *
     *     * Requirements:
     * this contract should have the needed allowance for the future distribution of the tokens for sale
     *
     * Emits: OfferEdited event with seller address, offer Index, new amount tokens for sale and new price for tokens
     * in eth
     */
    function editOffer(
        uint256 _offerIndex,
        uint256 _tokenAmount,
        uint256 _ethAmount
    ) external returns (bool) {
        require(_tokenAmount > 0);
        require(_ethAmount > 0);

        uint256 totalTokensForSale = totalTokensForSalePerSeller[msg.sender]
            .sub(offersPerSeller[msg.sender][_offerIndex].tokenAmount)
            .add(_tokenAmount);

        require(hasAllowance(msg.sender, totalTokensForSale));
        require(hasEnoughTokens(msg.sender, totalTokensForSale));

        totalTokensForSalePerSeller[msg.sender] = totalTokensForSale;

        offersPerSeller[msg.sender][_offerIndex] = Offer({
            seller: msg.sender,
            tokenAmount: _tokenAmount,
            ethAmount: _ethAmount
        });

        emit OfferEdited(msg.sender, _offerIndex, _tokenAmount, _ethAmount);

        return true;
    }

    /**
     * @dev buyOffer allows msg.sender to purchase a specific offer
     *
     *     * Requirements:
     * msg.sender to be whitelisted
     * msg.value to be equal to the price for the tokens
     *
     * Emits: OfferBought event with orderer, buyer and offer index
     */
    function buyOffer(address payable _seller, uint256 _offerIndex) public payable returns (bool) {
        Offer memory currentOffer = offersPerSeller[_seller][_offerIndex];
        require(msg.value == currentOffer.ethAmount);

        amTechToken.transferFrom(_seller, msg.sender, currentOffer.tokenAmount);
        _seller.transfer(currentOffer.ethAmount);

        removeOffer(
            _seller,
            _offerIndex,
            infoPerSeller[_seller].allSellersIndex
        );

        emit OfferBought(_seller, msg.sender, _offerIndex);

        return true;
    }

    function getSellersCount() public view returns (uint256) {
        return allSellers.length;
    }

    function getOffersPerSellerCount(address _seller)
        public
        view
        returns (uint256)
    {
        return offersPerSeller[_seller].length;
    }

    /**
     * @dev removeOffer an internal function to delete an offer
     *     * Requirements:
     * msg.sender to be the offer owner of a specific offer
     *
     * Emits: OfferCanceled event with seller address and offer Index
     */
    function removeOffer(
        address _offerOwner,
        uint256 _offerIndex,
        uint256 _sellerIndex
    ) internal returns (bool) {
        require(allSellers[_sellerIndex] == _offerOwner);

        if (getOffersPerSellerCount(_offerOwner) - 1 == _offerIndex) {
            offersPerSeller[_offerOwner].pop();

            if (getOffersPerSellerCount(_offerOwner) == 0) {
                delete infoPerSeller[_offerOwner];
                rearrangeAllSellers(_sellerIndex);
            }
        } else {
            offersPerSeller[_offerOwner][_offerIndex] = offersPerSeller[msg
                .sender][getOffersPerSellerCount(_offerOwner) - 1];

            offersPerSeller[_offerOwner].pop();
        }
        return true;
    }

    /**
     * @dev rearrangeAllSellers an internal function to rearrange allSellers array if needed
     */
    function rearrangeAllSellers(uint256 _sellerIndex) private returns (bool) {
        if (getSellersCount() - 1 == _sellerIndex) {
            allSellers.pop();
        } else {
            allSellers[_sellerIndex] = allSellers[getSellersCount() - 1];

            infoPerSeller[allSellers[_sellerIndex]]
                .allSellersIndex = _sellerIndex;

            allSellers.pop();
        }
        return true;
    }

    /**
     * @dev hasAllowance validations for allowance(seller, this)
     */
    function hasAllowance(address _seller, uint256 _amount)
        private
        view
        returns (bool)
    {
        if (amTechToken.allowance(_seller, address(this)) >= _amount) {
            return true;
        }
        return false;
    }

    /**
     * @dev hasEnoughTokens validations for sellers balance
     */
    function hasEnoughTokens(address _seller, uint256 _amount)
        private
        view
        returns (bool)
    {
        if (amTechToken.balanceOf(_seller) >= _amount) {
            return true;
        }
        return false;
    }
}
