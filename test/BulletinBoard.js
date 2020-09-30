const etherlime = require('etherlime-lib');
const ethers = require('ethers');

const BulletinBoard = require('../build/BulletinBoard');
const Whitelisting = require('../build/Whitelisting.json');
const AmTechToken = require('../build/amTechToken');

describe('BulletinBoard', function () {
    this.timeout(20000);
    let deployer;
    let whitelistingContract;
    let amtechTokenContract;
    let bulletinBoardContract;

    const aliceAccount = accounts[0].signer;
    const bobAccount = accounts[1].signer;
    const whitelistOperator = accounts[9].signer;

    const amountToMint = ethers.utils.parseEther("100");

    const tokensForSale = ethers.utils.parseEther('1');
    const priceForTokens = ethers.utils.parseEther('0.1');

    const tonekName = 'AmTech';
    const tonekSymbol = 'AMT';

    beforeEach(async () => {
        deployer = new etherlime.EtherlimeGanacheDeployer();
        whitelistingContract = await deployer.deploy(Whitelisting);
        await whitelistingContract.setWhitelister(whitelistOperator.address, true);
        amtechTokenContract = await deployer.deploy(AmTechToken, {}, tonekName, tonekSymbol, whitelistingContract.contractAddress);
        bulletinBoardContract = await deployer.deploy(BulletinBoard, {}, amtechTokenContract.contractAddress);

        await amtechTokenContract.mint(aliceAccount.address, amountToMint);
    })
    describe('Deploy Contract', function () {

        it('Should deploy BulletinBoard correctly', async () => {
            const hasBytecode = await deployer.provider.getCode(bulletinBoardContract.contractAddress);
            assert.strictEqual(hasBytecode, BulletinBoard.deployedBytecode, 'There is no bytecode after deployment');

            const tokenContractAddress = await bulletinBoardContract.amtechToken();
            assert.strictEqual(tokenContractAddress, amtechTokenContract.contractAddress, 'Token contract was not set correctly');
        })
    })

    describe('Create orders', function () {
        it('Should create an order', async () => {
            const expectedOrderersCount = 1;
            const expectedOrdersCount = 1;

            await amtechTokenContract.approve(bulletinBoardContract.contractAddress, tokensForSale);

            await bulletinBoardContract.createOrder(tokensForSale, priceForTokens);
            const orderersCount = await bulletinBoardContract.getOrderersCount();
            assert(orderersCount.eq(expectedOrderersCount));

            const ordersPerUser = await bulletinBoardContract.getOrdersCountPerOrderer(aliceAccount.address);
            assert(ordersPerUser.eq(expectedOrdersCount));

            // ordersPerUser is the count, sub(1) to get the index
            const orderData = await bulletinBoardContract.getOrderDetails(aliceAccount.address, ordersPerUser.sub(1));

            assert(orderData.tokensForSale.eq(tokensForSale));
            assert(orderData.priceForTokens.eq(priceForTokens));
            assert.ok(orderData.isActive);

            const expectedEvent = "OrderCreated";
            bulletinBoardContract.contract.on(expectedEvent, (_orderer, _tokensForSale, _priceForTokens) => {

                assert.strictEqual(aliceAccount.address, _orderer, 'Orderer address is not emited correctly');
                assert(_tokensForSale.eq(tokensForSale));
                assert(_priceForTokens.eq(priceForTokens));
            });
        })

        it('Should create five orders from Alice', async () => {
            const expectedOrderersCount = 1;
            const ordersToCreate = 5;

            for (let i = 1; i <= ordersToCreate; i++) {
                await amtechTokenContract.increaseAllowance(bulletinBoardContract.contractAddress, tokensForSale.mul(i));
                await bulletinBoardContract.createOrder(tokensForSale.mul(i), priceForTokens.mul(i));
            }

            const orderersCount = await bulletinBoardContract.getOrderersCount();
            assert(orderersCount.eq(expectedOrderersCount));

            const ordersPerUser = await bulletinBoardContract.getOrdersCountPerOrderer(aliceAccount.address);
            assert(ordersPerUser.eq(ordersToCreate));

            for (let i = 0; i < ordersToCreate; i++) {
                const orderData = await bulletinBoardContract.getOrderDetails(aliceAccount.address, i);

                assert(orderData.tokensForSale.eq(tokensForSale.mul(i + 1)));
                assert(orderData.priceForTokens.eq(priceForTokens.mul(i + 1)));
            }

            // should return 0 for not created order at index 5;
            const orderIndex = 5;
            const orderData = await bulletinBoardContract.getOrderDetails(aliceAccount.address, orderIndex);

            assert(orderData.tokensForSale.eq(0));
            assert(orderData.priceForTokens.eq(0));
        })

        it('Should create an order from a second user', async () => {
            const expectedOrderersCount = 2;
            const expectedOrdersCount = 1;

            const bobTokensForSale = tokensForSale.mul(6);
            const bobEthersForToken = priceForTokens.mul(6);

            await amtechTokenContract.approve(bulletinBoardContract.contractAddress, tokensForSale);
            await bulletinBoardContract.createOrder(tokensForSale, priceForTokens);

            await amtechTokenContract.from(bobAccount).approve(bulletinBoardContract.contractAddress, bobTokensForSale);
            await bulletinBoardContract.from(bobAccount).createOrder(bobTokensForSale, bobEthersForToken);

            const orderersCount = await bulletinBoardContract.getOrderersCount();
            assert(orderersCount.eq(expectedOrderersCount));

            const ordersPerUser = await bulletinBoardContract.getOrdersCountPerOrderer(bobAccount.address);
            assert(ordersPerUser.eq(expectedOrdersCount));

            // ordersPerUser is the count, sub(1) to get the index
            const orderData = await bulletinBoardContract.getOrderDetails(bobAccount.address, ordersPerUser.sub(1));

            assert(orderData.tokensForSale.eq(bobTokensForSale));
            assert(orderData.priceForTokens.eq(bobEthersForToken));

            const expectedEvent = "OrderCreated";
            bulletinBoardContract.contract.on(expectedEvent, (_orderer, _tokensForSale, _priceForTokens) => {

                assert.strictEqual(bobAccount.address, _orderer, 'Orderer address is not emited correctly');
                assert(_tokensForSale.eq(bobTokensForSale));
                assert(_priceForTokens.eq(bobEthersForToken));
            });
        })
    })

    describe('Cancel orders', function () {
        beforeEach(async () => {
            await amtechTokenContract.approve(bulletinBoardContract.contractAddress, tokensForSale);
            await bulletinBoardContract.createOrder(tokensForSale, priceForTokens);
        })
        it('Should cancel an order', async () => {
            const ordersPerUser = await bulletinBoardContract.getOrdersCountPerOrderer(aliceAccount.address);
            await bulletinBoardContract.cancelOrder(ordersPerUser.sub(1));

            const orderData = await bulletinBoardContract.getOrderDetails(aliceAccount.address, ordersPerUser.sub(1));

            assert(orderData.tokensForSale.eq(tokensForSale));
            assert(orderData.priceForTokens.eq(priceForTokens));
            assert.ok(!orderData.isActive);

            const expectedEvent = "OrderCanceled";
            bulletinBoardContract.contract.on(expectedEvent, (_orderer, _orderIndex) => {

                assert.strictEqual(aliceAccount.address, _orderer, 'Orderer address is not emited correctly');
                assert(_orderIndex.eq(ordersPerUser.sub(1)));
            });
        })

        it('Should revert if one tries to cancel an already canceled order', async () => {
            await amtechTokenContract.approve(bulletinBoardContract.contractAddress, tokensForSale);
            await bulletinBoardContract.createOrder(tokensForSale, priceForTokens);

            const ordersPerUser = await bulletinBoardContract.getOrdersCountPerOrderer(aliceAccount.address);
            await bulletinBoardContract.cancelOrder(ordersPerUser.sub(1));

            await assert.revert(bulletinBoardContract.cancelOrder(ordersPerUser.sub(1)));
        })

        it('Should revert if not order owner tries to cancel an order', async () => {
            await amtechTokenContract.approve(bulletinBoardContract.contractAddress, tokensForSale);
            await bulletinBoardContract.createOrder(tokensForSale, priceForTokens);

            const ordersPerUser = await bulletinBoardContract.getOrdersCountPerOrderer(aliceAccount.address);
            await assert.revert(bulletinBoardContract.from(bobAccount).cancelOrder(ordersPerUser.sub(1)));

        })
    })

    describe('Edit orders', function () {
        beforeEach(async () => {
            await amtechTokenContract.approve(bulletinBoardContract.contractAddress, tokensForSale);
            await bulletinBoardContract.createOrder(tokensForSale, priceForTokens);
        })
        it('Should edit an order with more tokens for sale', async () => {
            const ordersPerUser = await bulletinBoardContract.getOrdersCountPerOrderer(aliceAccount.address);

            // ordersPerUser is the count, sub(1) to get the index
            let orderData = await bulletinBoardContract.getOrderDetails(aliceAccount.address, ordersPerUser.sub(1));
            assert(orderData.tokensForSale.eq(tokensForSale));
            assert(orderData.priceForTokens.eq(priceForTokens));
            assert.ok(orderData.isActive);

            const newTokensForSale = ethers.utils.parseEther('5');
            const newPriceForTokens = ethers.utils.parseEther('0.5');

            await amtechTokenContract.approve(bulletinBoardContract.contractAddress, newTokensForSale);

            await bulletinBoardContract.editOrder(ordersPerUser.sub(1), newTokensForSale, newPriceForTokens);

            orderData = await bulletinBoardContract.getOrderDetails(aliceAccount.address, ordersPerUser.sub(1));
            assert(orderData.tokensForSale.eq(newTokensForSale));
            assert(orderData.priceForTokens.eq(newPriceForTokens));
            assert.ok(orderData.isActive);

            const expectedEvent = "OrderEdited";
            bulletinBoardContract.contract.on(expectedEvent, (_orderer, _orderIndex, _tokensForSale, _priceForTokens) => {

                assert.strictEqual(aliceAccount.address, _orderer, 'Orderer address is not emited correctly');

                assert(_tokensForSale.eq(newTokensForSale));
                assert(_tokensForSale.eq(newTokensForSale));
                assert(_priceForTokens.eq(newPriceForTokens));
            });
        })

        it('Should edit an order with less tokens for sale', async () => {

            await amtechTokenContract.approve(bulletinBoardContract.contractAddress, tokensForSale);

            await bulletinBoardContract.createOrder(tokensForSale, priceForTokens);

            const ordersPerUser = await bulletinBoardContract.getOrdersCountPerOrderer(aliceAccount.address);

            // ordersPerUser is the count, sub(1) to get the index
            let orderData = await bulletinBoardContract.getOrderDetails(aliceAccount.address, ordersPerUser.sub(1));
            assert(orderData.tokensForSale.eq(tokensForSale));
            assert(orderData.priceForTokens.eq(priceForTokens));
            assert.ok(orderData.isActive);

            const newTokensForSale = ethers.utils.parseEther('0.03');
            const newPriceForTokens = ethers.utils.parseEther('0.003');

            await amtechTokenContract.approve(bulletinBoardContract.contractAddress, newTokensForSale);

            await bulletinBoardContract.editOrder(ordersPerUser.sub(1), newTokensForSale, newPriceForTokens);

            orderData = await bulletinBoardContract.getOrderDetails(aliceAccount.address, ordersPerUser.sub(1));
            assert(orderData.tokensForSale.eq(newTokensForSale));
            assert(orderData.priceForTokens.eq(newPriceForTokens));
            assert.ok(orderData.isActive);

            const expectedEvent = "OrderEdited";
            bulletinBoardContract.contract.on(expectedEvent, (_orderer, _orderIndex, _tokensForSale, _priceForTokens) => {

                assert.strictEqual(aliceAccount.address, _orderer, 'Orderer address is not emited correctly');

                assert(_tokensForSale.eq(newTokensForSale));
                assert(_tokensForSale.eq(newTokensForSale));
                assert(_priceForTokens.eq(newPriceForTokens));
            });
        })

        it('Should not allow not order owner to edit the order', async () => {

            await amtechTokenContract.approve(bulletinBoardContract.contractAddress, tokensForSale);

            await bulletinBoardContract.createOrder(tokensForSale, priceForTokens);

            const ordersPerUser = await bulletinBoardContract.getOrdersCountPerOrderer(aliceAccount.address);

            const newTokensForSale = ethers.utils.parseEther('0.03');
            const newPriceForTokens = ethers.utils.parseEther('0.003');

            await amtechTokenContract.approve(bulletinBoardContract.contractAddress, newTokensForSale);

            await assert.revert(bulletinBoardContract.from(bobAccount).editOrder(ordersPerUser.sub(1), newTokensForSale, newPriceForTokens));

        })

        it('Should not allow editing an order with less token allowance', async () => {

            await amtechTokenContract.approve(bulletinBoardContract.contractAddress, tokensForSale);

            await bulletinBoardContract.createOrder(tokensForSale, priceForTokens);

            const ordersPerUser = await bulletinBoardContract.getOrdersCountPerOrderer(aliceAccount.address);

            const newTokensForSale = ethers.utils.parseEther('0.03');
            const newPriceForTokens = ethers.utils.parseEther('0.003');

            await amtechTokenContract.approve(bulletinBoardContract.contractAddress, newTokensForSale.div(2));

            await assert.revert(bulletinBoardContract.editOrder(ordersPerUser.sub(1), newTokensForSale, newPriceForTokens));

        })

        it('Should revert if one tries to edin a canceled order', async () => {

            await amtechTokenContract.approve(bulletinBoardContract.contractAddress, tokensForSale);

            await bulletinBoardContract.createOrder(tokensForSale, priceForTokens);

            const ordersPerUser = await bulletinBoardContract.getOrdersCountPerOrderer(aliceAccount.address);

            await bulletinBoardContract.cancelOrder(ordersPerUser.sub(1));

            const newTokensForSale = ethers.utils.parseEther('0.03');
            const newPriceForTokens = ethers.utils.parseEther('0.003');

            await amtechTokenContract.approve(bulletinBoardContract.contractAddress, newTokensForSale);

            await assert.revert(bulletinBoardContract.editOrder(ordersPerUser.sub(1), newTokensForSale, newPriceForTokens));

        })
    })

    describe('Purchase an orders', function () {
        beforeEach(async () => {
            await amtechTokenContract.approve(bulletinBoardContract.contractAddress, tokensForSale);
            await bulletinBoardContract.createOrder(tokensForSale, priceForTokens);
        })

        it('Should Purchase an order', async () => {
            await whitelistingContract.setWhitelisted([bobAccount.address], true);

            const ordererTokenBalanceBefore = await amtechTokenContract.balanceOf(aliceAccount.address);
            const buyerTokenBalanceBefore = await amtechTokenContract.balanceOf(bobAccount.address);

            const ordersPerUser = await bulletinBoardContract.getOrdersCountPerOrderer(aliceAccount.address);

            await bulletinBoardContract.from(bobAccount).purchaseOrder(aliceAccount.address, ordersPerUser.sub(1), {
                value: priceForTokens,
                gasLimit: 1000000
            });

            const ordererTokenBalanceAfter = await amtechTokenContract.balanceOf(aliceAccount.address);
            const buyerTokenBalanceAfter = await amtechTokenContract.balanceOf(bobAccount.address);

            assert(ordererTokenBalanceAfter.eq(ordererTokenBalanceBefore.sub(tokensForSale)));
            assert(buyerTokenBalanceAfter.eq(buyerTokenBalanceBefore.add(tokensForSale)));

            const orderData = await bulletinBoardContract.getOrderDetails(aliceAccount.address, ordersPerUser.sub(1));
            assert.ok(!orderData.isActive);

            const expectedEvent = "OrderPurchased";
            bulletinBoardContract.contract.on(expectedEvent, (_orderer, _buyer, _orderIndex) => {

                assert.strictEqual(aliceAccount.address, _orderer, 'Orderer address is not emited correctly');
                assert.strictEqual(bobAccount.address, _buyer, 'Buyer address is not emited correctly');
                assert(_orderIndex.eq(ordersPerUser.sub(1)));
            });
        })

        it('Should revert if not whitelisted tries to buy tokens', async () => {
            const ordersPerUser = await bulletinBoardContract.getOrdersCountPerOrderer(aliceAccount.address);

            await assert.revert(bulletinBoardContract.from(bobAccount).purchaseOrder(aliceAccount.address, ordersPerUser.sub(1), {
                value: priceForTokens,
                gasLimit: 1000000
            }));
        })

        it('Should revert if one tries to buy order for fewer ethers', async () => {
            await whitelistingContract.setWhitelisted([bobAccount.address], true);

            const ordersPerUser = await bulletinBoardContract.getOrdersCountPerOrderer(aliceAccount.address);

            await assert.revert(bulletinBoardContract.from(bobAccount).purchaseOrder(aliceAccount.address, ordersPerUser.sub(1), {
                value: priceForTokens.sub(1),
                gasLimit: 1000000
            }));
        })

        it('Should revert if one tries to buy non existing order', async () => {
            await whitelistingContract.setWhitelisted([bobAccount.address], true);

            const ordersPerUser = await bulletinBoardContract.getOrdersCountPerOrderer(aliceAccount.address);

            await assert.revert(bulletinBoardContract.from(bobAccount).purchaseOrder(aliceAccount.address, ordersPerUser, {
                value: priceForTokens,
                gasLimit: 1000000
            }));
        })

        it('Should revert if one tries to buy canceled order', async () => {
            await whitelistingContract.setWhitelisted([bobAccount.address], true);

            const ordersPerUser = await bulletinBoardContract.getOrdersCountPerOrderer(aliceAccount.address);
            await bulletinBoardContract.cancelOrder(ordersPerUser.sub(1));


            await assert.revert(bulletinBoardContract.from(bobAccount).purchaseOrder(aliceAccount.address, ordersPerUser.sub(1), {
                value: priceForTokens,
                gasLimit: 1000000
            }));
        })
    })
})