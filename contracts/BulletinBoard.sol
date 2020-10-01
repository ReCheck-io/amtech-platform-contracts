pragma solidity ^0.6.6;

import "../node_modules/@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../node_modules/@openzeppelin/contracts/math/SafeMath.sol";

contract BulletinBoard {
    using SafeMath for uint256;

    IERC20 public amTechToken;

    address[] public allSellers;
    mapping(address => Offer[]) public OffersPerSeller;
    mapping(address => bool) public exists;
    mapping(address => uint256) public totalTokensForSalePerSeller;

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
        uint256 offerId,
        uint256 tokensForSale,
        uint256 priceForTokens
    );

    event OfferBuyed(
        address indexed seller,
        address indexed buyer,
        uint256 offerId
    );

    event OfferCanceled(address indexed seller, uint256 offerId);

    constructor(address _amTechToken) public {
        require(_amTechToken != address(0));
        amTechToken = IERC20(_amTechToken);
    }

    function createOffer(uint256 _tokenAmount, uint256 _ethAmount)
        external
        returns (bool)
    {
        uint256 totalTokensForSale = totalTokensForSalePerSeller[msg.sender]
            .add(_tokenAmount);
        require(isApproved(msg.sender, totalTokensForSale));
        require(hasEnoughthTokens(msg.sender, totalTokensForSale));

        totalTokensForSalePerSeller[msg.sender] = totalTokensForSale;

        OffersPerSeller[msg.sender].push(
            Offer({
                seller: msg.sender,
                tokenAmount: _tokenAmount,
                ethAmount: _ethAmount
            })
        );

        if (!exists[msg.sender]) {
            exists[msg.sender] = true;
            allSellers.push(msg.sender);
        }

        emit OfferCreated(msg.sender, _tokenAmount, _ethAmount);

        return true;
    }

    function cancelOffer(uint256 _offerId) external returns (bool) {
        removeOffer(msg.sender, _offerId);
        emit OfferCanceled(msg.sender, _offerId);
        return true;
    }

    function editOffer(
        uint256 _offerId,
        uint256 _tokenAmount,
        uint256 _ethAmount
    ) external returns (bool) {
        uint256 totalTokensForSale = totalTokensForSalePerSeller[msg.sender]
            .sub(OffersPerSeller[msg.sender][_offerId].tokenAmount)
            .add(_tokenAmount);

        require(isApproved(msg.sender, totalTokensForSale));
        require(hasEnoughthTokens(msg.sender, totalTokensForSale));

        totalTokensForSalePerSeller[msg.sender] = totalTokensForSale;

        OffersPerSeller[msg.sender][_offerId] = Offer({
            seller: msg.sender,
            tokenAmount: _tokenAmount,
            ethAmount: _ethAmount
        });

        emit OfferEdited(msg.sender, _offerId, _tokenAmount, _ethAmount);

        return true;
    }

    function buyOffer(address payable _seller, uint256 _offerId)
        public
        payable
        returns (bool)
    {
        Offer memory currentOffer = OffersPerSeller[_seller][_offerId];
        require(msg.value == currentOffer.ethAmount);

        // TODO: view safeTransfer
        amTechToken.transferFrom(_seller, msg.sender, currentOffer.tokenAmount);
        _seller.transfer(currentOffer.ethAmount);

        emit OfferBuyed(_seller, msg.sender, _offerId);

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
        return OffersPerSeller[_seller].length;
    }

    function removeOffer(address _offerOwner, uint256 _offerId) private {
        if (getOffersPerSellerCount(_offerOwner) == 1) {
            OffersPerSeller[_offerOwner].pop();
            // TODO: exists holds index
            exists[_offerOwner] = false;
            return;
        }

        OffersPerSeller[_offerOwner][_offerId] = OffersPerSeller[msg
            .sender][getOffersPerSellerCount(_offerOwner) - 1];

        OffersPerSeller[_offerOwner].pop();
    }

    function isApproved(address _seller, uint256 _amount)
        private
        view
        returns (bool)
    {
        if (amTechToken.allowance(_seller, address(this)) >= _amount) {
            return true;
        }
        return false;
    }

    function hasEnoughthTokens(address _seller, uint256 _amount)
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
