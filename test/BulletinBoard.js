const ethers = require("ethers");
const etherlime = require("etherlime-lib");

const Whitelisting = require("../build/Whitelisting.json");
const AmtechToken = require("../build/AmTechToken.json");
const BulletinBoard = require("../build/BulletinBoard.json");

const getRandomInt = function (min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min) + min); //The maximum is exclusive and the minimum is inclusive
}

describe("Bulletin Board", function () {
    this.timeout(20000);
    let deployer;
    let whitelistingContract;
    let amTechTokenContract;
    let bulletinBoardContract;

    const tokenName = "AmTech";
    const tokenSymbol = "AMT";

    const aliceAccount = accounts[1].signer;
    const bobAccount = accounts[2].signer;
    const charlieAccount = accounts[3].signer;
    const danieAccount = accounts[4].signer;

    const amountToMint = ethers.utils.parseEther("105");
    const tokenAmount = ethers.utils.parseEther("0.5");
    const ethAmount = ethers.utils.parseEther("0.05");


    beforeEach(async () => {
        deployer = new etherlime.EtherlimeGanacheDeployer();
        whitelistingContract = await deployer.deploy(Whitelisting);
        amTechTokenContract = await deployer.deploy(AmtechToken, {}, tokenName, tokenSymbol, whitelistingContract.contractAddress);
        bulletinBoardContract = await deployer.deploy(BulletinBoard, {}, amTechTokenContract.contractAddress);
    });

    describe("Deploy Contract", function () {
        it("Should deploy bulletin board", async () => {
            const hasBytecode = await deployer.provider.getCode(bulletinBoardContract.contractAddress);
            assert.strictEqual(hasBytecode, BulletinBoard.deployedBytecode, "There is no bytecode after deployment");

            const tokenContractAddress = await bulletinBoardContract.amTechToken();
            assert.strictEqual(tokenContractAddress, amTechTokenContract.contractAddress, "Token contract was not set correctly");
        })
    })

    describe("Create an Offer", function () {
        describe("Create offer", function () {
            beforeEach(async () => {
                await amTechTokenContract.mint(aliceAccount.address, amountToMint);
                await amTechTokenContract.from(aliceAccount).approve(bulletinBoardContract.contractAddress, tokenAmount);
            });

            it("Should Create an Offer", async () => {
                const sellerInfoBefore = await bulletinBoardContract.infoPerSeller(aliceAccount.address);
                assert.ok(!sellerInfoBefore.exists);

                await bulletinBoardContract.from(aliceAccount).createOffer(tokenAmount, ethAmount);

                const expectedSellersCount = 1;
                const sellersCount = await bulletinBoardContract.getSellersCount();
                assert(sellersCount.eq(expectedSellersCount));

                // sellersCount is the count, -1 to get the index.
                const sellerAddress = await bulletinBoardContract.allSellers(sellersCount - 1);
                assert.strictEqual(sellerAddress, aliceAccount.address, "The seller address is not correct");

                const offersCount = await bulletinBoardContract.getOffersPerSellerCount(aliceAccount.address);
                // offersCount is the count, -1 to get the index.
                const offerData = await bulletinBoardContract.offersPerSeller(aliceAccount.address, offersCount - 1);

                assert.strictEqual(offerData.seller, aliceAccount.address, "The seller address is not correct");
                assert(offerData.tokenAmount.eq(tokenAmount), "Token amount in offer is not correct");
                assert(offerData.ethAmount.eq(ethAmount), "ether amount in offer is not correct");

                const sellerInfoAfter = await bulletinBoardContract.infoPerSeller(aliceAccount.address);
                assert.ok(sellerInfoAfter.exists);

                const totalTokensForSalePerSeller = await bulletinBoardContract.totalTokensForSalePerSeller(aliceAccount.address);
                assert(totalTokensForSalePerSeller.eq(tokenAmount));

                const expectedEvent = "OfferCreated";
                bulletinBoardContract.contract.on(expectedEvent, (_seller, _tokenAmount, _ethAmount) => {

                    assert.strictEqual(aliceAccount.address, _seller, 'Sellers address is not emited correctly');
                    assert(_tokenAmount.eq(tokenAmount));
                    assert(_ethAmount.eq(ethAmount));
                });

            })

            it("Should Revert if seller doesn't have enough tokens", async () => {
                await amTechTokenContract.from(bobAccount).approve(bulletinBoardContract.contractAddress, tokenAmount);
                await assert.revert(bulletinBoardContract.from(bobAccount).createOffer(tokenAmount, ethAmount));
            })

            it("Should Revert if seller doesn't approve tokens", async () => {
                await amTechTokenContract.mint(bobAccount.address, amountToMint);
                await assert.revert(bulletinBoardContract.from(bobAccount).createOffer(tokenAmount, ethAmount));
            })

            it("Should Revert if seller cereates an offer with 0 tokens", async () => {
                await amTechTokenContract.mint(bobAccount.address, amountToMint);
                await amTechTokenContract.from(bobAccount).approve(bulletinBoardContract.contractAddress, tokenAmount);

                const zeroTokens = 0;
                await assert.revert(bulletinBoardContract.from(bobAccount).createOffer(zeroTokens, ethAmount));
            })

            it("Should Revert if seller cereates an offer with 0 ethers", async () => {
                await amTechTokenContract.mint(bobAccount.address, amountToMint);
                await amTechTokenContract.from(bobAccount).approve(bulletinBoardContract.contractAddress, tokenAmount);

                const zeroEthers = 0;
                await assert.revert(bulletinBoardContract.from(bobAccount).createOffer(tokenAmount, zeroEthers));
            })
        })

        it("Should Create multiple offers from multiple sellers", async () => {
            await amTechTokenContract.mint(aliceAccount.address, amountToMint);
            await amTechTokenContract.mint(bobAccount.address, amountToMint);
            await amTechTokenContract.mint(charlieAccount.address, amountToMint);

            await amTechTokenContract.from(aliceAccount).approve(bulletinBoardContract.contractAddress, amountToMint);
            await amTechTokenContract.from(bobAccount).approve(bulletinBoardContract.contractAddress, amountToMint);
            await amTechTokenContract.from(charlieAccount).approve(bulletinBoardContract.contractAddress, amountToMint);

            const offersToCreate = 7;
            for (let i = 1; i <= offersToCreate; i++) {
                await bulletinBoardContract.from(aliceAccount).createOffer(tokenAmount.mul(i), ethAmount.mul(i));
                await bulletinBoardContract.from(bobAccount).createOffer(tokenAmount.mul(i), ethAmount.mul(i));
                await bulletinBoardContract.from(charlieAccount).createOffer(tokenAmount.mul(i), ethAmount.mul(i));
            }

            const expectedSellersCount = 3;
            const sellersCount = await bulletinBoardContract.getSellersCount();
            assert(sellersCount.eq(expectedSellersCount));

            const expectedSellersAddresses = [aliceAccount.address, bobAccount.address, charlieAccount.address];
            for (let i = 0; i < expectedSellersCount; i++) {
                const sellerAddress = await bulletinBoardContract.allSellers(i);
                assert.strictEqual(sellerAddress, expectedSellersAddresses[i], "The seller address is not correct");
            }


            const aliceOffersCount = await bulletinBoardContract.getOffersPerSellerCount(aliceAccount.address);
            assert(aliceOffersCount.eq(offersToCreate));
            const bobOffersCount = await bulletinBoardContract.getOffersPerSellerCount(bobAccount.address);
            assert(bobOffersCount.eq(offersToCreate));
            const charlieOffersCount = await bulletinBoardContract.getOffersPerSellerCount(charlieAccount.address);
            assert(charlieOffersCount.eq(offersToCreate));


            for (let i = 0; i < sellersCount; i++) {
                for (let f = 1; f <= offersToCreate; f++) {
                    // offersCount is the count, -1 to get the index.
                    const offerData = await bulletinBoardContract.offersPerSeller(expectedSellersAddresses[i], f - 1);

                    assert.strictEqual(offerData.seller, expectedSellersAddresses[i], "The seller address is not correct");
                    assert(offerData.tokenAmount.eq(tokenAmount.mul(f)), "Token amount in offer is not correct");
                    assert(offerData.ethAmount.eq(ethAmount.mul(f)), "ether amount in offer is not correct");
                }
            }

            let expectedTotalTokens = 0;
            for (let i = 1; i <= offersToCreate; i++) {
                expectedTotalTokens += 0.5 * i;
            }

            for (let i = 0; i < expectedSellersCount; i++) {
                const totalTokensForSalePerSeller = await bulletinBoardContract.totalTokensForSalePerSeller(expectedSellersAddresses[i]);
                assert(totalTokensForSalePerSeller.eq(ethers.utils.parseEther(expectedTotalTokens.toString())));
            }

        })
    })

    describe("Cancel an Offer", function () {

        beforeEach(async () => {
            await amTechTokenContract.mint(aliceAccount.address, amountToMint);
            await amTechTokenContract.from(aliceAccount).approve(bulletinBoardContract.contractAddress, tokenAmount);
        })

        describe("Cancel One Offer", function () {
            beforeEach(async () => {
                await bulletinBoardContract.from(aliceAccount).createOffer(tokenAmount, ethAmount);
            })

            it("Should cancel an only offer", async () => {
                const offersCount = await bulletinBoardContract.getOffersPerSellerCount(aliceAccount.address);

                // - 1 to pass the index of the offer and the seller
                await bulletinBoardContract.from(aliceAccount).cancelOffer(offersCount - 1);

                const sellersCountAfter = await bulletinBoardContract.getSellersCount();
                const offersCountAfter = await bulletinBoardContract.getOffersPerSellerCount(aliceAccount.address);
                assert(sellersCountAfter.eq(0));
                assert(offersCountAfter.eq(0));

                const sellerInfo = await bulletinBoardContract.infoPerSeller(aliceAccount.address);
                assert.ok(!sellerInfo.exists);

                const expectedEvent = "OfferCanceled";
                bulletinBoardContract.contract.on(expectedEvent, (_seller, _offerId) => {

                    assert.strictEqual(aliceAccount.address, _seller, 'Sellers address is not emited correctly');
                    assert(_offerId.eq(offersCount.sub(1)));
                });
            });

            it("Should create an offer after one is cancelled", async () => {
                let offersCount = await bulletinBoardContract.getOffersPerSellerCount(aliceAccount.address);

                // - 1 to pass the index of the offer and the seller
                await bulletinBoardContract.from(aliceAccount).cancelOffer(offersCount - 1);

                await bulletinBoardContract.from(aliceAccount).createOffer(tokenAmount, ethAmount);

                const expectedSellersCount = 1;
                const sellersCount = await bulletinBoardContract.getSellersCount();
                assert(sellersCount.eq(expectedSellersCount));

                // sellersCount is the count, -1 to get the index.
                const sellerAddress = await bulletinBoardContract.allSellers(sellersCount - 1);
                assert.strictEqual(sellerAddress, aliceAccount.address, "The seller address is not correct");

                offersCount = await bulletinBoardContract.getOffersPerSellerCount(aliceAccount.address);
                // offersCount is the count, -1 to get the index.
                const offerData = await bulletinBoardContract.offersPerSeller(aliceAccount.address, offersCount - 1);

                assert.strictEqual(offerData.seller, aliceAccount.address, "The seller address is not correct");
                assert(offerData.tokenAmount.eq(tokenAmount), "Token amount in offer is not correct");
                assert(offerData.ethAmount.eq(ethAmount), "ether amount in offer is not correct");

                const sellerInfoAfter = await bulletinBoardContract.infoPerSeller(aliceAccount.address);
                assert.ok(sellerInfoAfter.exists);

                const totalTokensForSalePerSeller = await bulletinBoardContract.totalTokensForSalePerSeller(aliceAccount.address);
                assert(totalTokensForSalePerSeller.eq(tokenAmount));

                const expectedEvent = "OfferCreated";
                bulletinBoardContract.contract.on(expectedEvent, (_seller, _tokenAmount, _ethAmount) => {

                    assert.strictEqual(aliceAccount.address, _seller, 'Sellers address is not emited correctly');
                    assert(_tokenAmount.eq(tokenAmount));
                    assert(_ethAmount.eq(ethAmount));
                });
            });

            it("Should revert if one tries to cancel an offer with wrong id", async () => {
                const offersCount = await bulletinBoardContract.getOffersPerSellerCount(aliceAccount.address);

                await assert.revert(bulletinBoardContract.from(aliceAccount).cancelOffer(offersCount));
            })

            it("Should revert if one tries to cancel an offer of other seller", async () => {
                const offersCount = await bulletinBoardContract.getOffersPerSellerCount(aliceAccount.address);

                await assert.revert(bulletinBoardContract.from(bobAccount).cancelOffer(offersCount - 1));
            })
        })

        describe("Cancel Multiple Offers", function () {
            const offers = 5;
            const sellers = [bobAccount, charlieAccount, danieAccount];

            beforeEach(async () => {
                for (let i = 0; i < sellers.length; i++) {
                    await amTechTokenContract.mint(sellers[i].address, amountToMint);
                    await amTechTokenContract.from(sellers[i]).approve(bulletinBoardContract.contractAddress, amountToMint);
                }

                for (let i = 1; i <= sellers.length; i++) {
                    for (let f = 0; f < offers; f++) {
                        await bulletinBoardContract.from(sellers[i - 1]).createOffer(tokenAmount.mul(i), ethAmount.mul(i));
                    }
                }
            })

            it("Should cancel random offer", async () => {
                const sellersCount = await bulletinBoardContract.getSellersCount();
                assert(sellersCount.eq(sellers.length));

                for (let i = 0; i < sellers.length; i++) {
                    const offersCount = await bulletinBoardContract.getOffersPerSellerCount(sellers[i].address);
                    assert(offersCount.eq(offers));
                }

                let randomSeller = getRandomInt(0, 3);
                let randomOffer = getRandomInt(0, 5);

                await bulletinBoardContract.from(sellers[randomSeller]).cancelOffer(randomOffer);

                const sellersCountAfter = await bulletinBoardContract.getSellersCount();
                assert(sellersCountAfter.eq(sellers.length));

                for (let i = 0; i < sellers.length; i++) {
                    const offersCount = await bulletinBoardContract.getOffersPerSellerCount(sellers[i].address);
                    if (i === randomSeller) {
                        assert(offersCount.eq(offers - 1));
                    } else {
                        assert(offersCount.eq(offers));
                    }
                }
            })

            it("Should cancel all offers for a random seller from last to first", async () => {
                let randomSeller = getRandomInt(0, 3);

                for (let i = offers - 1; i >= 0; i--) {
                    await bulletinBoardContract.from(sellers[randomSeller]).cancelOffer(i);
                }

                const sellersCount = await bulletinBoardContract.getSellersCount();
                assert(sellersCount.eq(sellers.length - 1));

                const offersCount = await bulletinBoardContract.getOffersPerSellerCount(sellers[randomSeller].address);
                assert(offersCount.eq(0))
            })

            it("Should cancel all offers for a random seller by zero index", async () => {
                let randomSeller = getRandomInt(0, 3);

                for (let i = offers - 1; i >= 0; i--) {
                    await bulletinBoardContract.from(sellers[randomSeller]).cancelOffer(0);
                }

                const sellersCount = await bulletinBoardContract.getSellersCount();
                assert(sellersCount.eq(sellers.length - 1));

                const offersCount = await bulletinBoardContract.getOffersPerSellerCount(sellers[randomSeller].address);
                assert(offersCount.eq(0))
            })

            it("Should cancel all offers for a random seller by middle index position and the last offer by zero index", async () => {
                let randomSeller = getRandomInt(0, 3);

                for (let i = offers - 1; i > 0; i--) {
                    await bulletinBoardContract.from(sellers[randomSeller]).cancelOffer(1);
                }

                await bulletinBoardContract.from(sellers[randomSeller]).cancelOffer(0);

                const sellersCount = await bulletinBoardContract.getSellersCount();
                assert(sellersCount.eq(sellers.length - 1));

                const offersCount = await bulletinBoardContract.getOffersPerSellerCount(sellers[randomSeller].address);
                assert(offersCount.eq(0))
            })
        })
    })

    describe("Edit an Offer", function () {
        beforeEach(async () => {
            await amTechTokenContract.mint(aliceAccount.address, tokenAmount.mul(2));
            await amTechTokenContract.from(aliceAccount).approve(bulletinBoardContract.contractAddress, tokenAmount.mul(2));
            await bulletinBoardContract.from(aliceAccount).createOffer(tokenAmount, ethAmount);
        })
        it("Should edit an offer", async () => {
            const newTokenAmount = tokenAmount.mul(2);
            const newEthAmounth = ethAmount.mul(2);


            const offersCount = await bulletinBoardContract.getOffersPerSellerCount(aliceAccount.address);
            // - 1 to get the index
            await bulletinBoardContract.from(aliceAccount).editOffer(offersCount - 1, newTokenAmount, newEthAmounth);

            const newOffer = await bulletinBoardContract.offersPerSeller(aliceAccount.address, offersCount - 1);
            assert(newOffer.tokenAmount.eq(newTokenAmount));
            assert(newOffer.ethAmount.eq(newEthAmounth));

            const expectedEvent = "OfferEdited";
            bulletinBoardContract.contract.on(expectedEvent, (_seller, _offerId, _tokenAmount, _ethAmount) => {

                assert.strictEqual(aliceAccount.address, _seller, 'Seller address is not emited correctly');

                assert(_offerId.eq(offersCount - 1));
                assert(_tokenAmount.eq(newTokenAmount));
                assert(_ethAmount.eq(newEthAmounth));
            });
        })

        it("Should revert if new tokens are zero", async () => {
            const newTokenAmount = 0;
            const newEthAmounth = ethAmount.mul(3);

            await amTechTokenContract.mint(aliceAccount.address, newTokenAmount);
            await amTechTokenContract.from(aliceAccount).approve(bulletinBoardContract.contractAddress, newTokenAmount);

            const offersCount = await bulletinBoardContract.getOffersPerSellerCount(aliceAccount.address);

            await assert.revert(bulletinBoardContract.from(aliceAccount).editOffer(offersCount - 1, newTokenAmount, newEthAmounth));
        })

        it("Should revert if new ethers are zero", async () => {
            const newTokenAmount = tokenAmount.mul(3);
            const newEthAmounth = 0;

            const offersCount = await bulletinBoardContract.getOffersPerSellerCount(aliceAccount.address);

            await amTechTokenContract.mint(aliceAccount.address, newTokenAmount);
            await amTechTokenContract.from(aliceAccount).approve(bulletinBoardContract.contractAddress, newTokenAmount);

            await assert.revert(bulletinBoardContract.from(aliceAccount).editOffer(offersCount - 1, newTokenAmount, newEthAmounth));
        })

        it("Should revert if seller doesn't have enoughth tokens", async () => {
            const newTokenAmount = tokenAmount.mul(3);
            const newEthAmounth = ethAmount.mul(3);

            const offersCount = await bulletinBoardContract.getOffersPerSellerCount(aliceAccount.address);

            await amTechTokenContract.from(aliceAccount).approve(bulletinBoardContract.contractAddress, newTokenAmount);

            await assert.revert(bulletinBoardContract.from(aliceAccount).editOffer(offersCount - 1, newTokenAmount, newEthAmounth));
        })

        it("Should revert if seller doesn't have enoughth tokens approved", async () => {
            const newTokenAmount = tokenAmount.mul(3);
            const newEthAmounth = ethAmount.mul(3);

            const offersCount = await bulletinBoardContract.getOffersPerSellerCount(aliceAccount.address);

            await amTechTokenContract.mint(aliceAccount.address, newTokenAmount);

            await assert.revert(bulletinBoardContract.from(aliceAccount).editOffer(offersCount - 1, newTokenAmount, newEthAmounth));
        })

        it("Should revert offers id is wrong", async () => {
            const newTokenAmount = tokenAmount.mul(3);
            const newEthAmounth = ethAmount.mul(3);

            const wrongId = 5;

            await amTechTokenContract.mint(aliceAccount.address, newTokenAmount);
            await amTechTokenContract.from(aliceAccount).approve(bulletinBoardContract.contractAddress, newTokenAmount);

            await assert.revert(bulletinBoardContract.from(aliceAccount).editOffer(wrongId, newTokenAmount, newEthAmounth));
        })

        it("Should fail if not offer owner tries to cancel an offer", async () => {
            const newTokenAmount = tokenAmount.mul(3);
            const newEthAmounth = ethAmount.mul(3);

            const offersCount = await bulletinBoardContract.getOffersPerSellerCount(aliceAccount.address);

            await amTechTokenContract.mint(bobAccount.address, newTokenAmount);
            await amTechTokenContract.from(bobAccount).approve(bulletinBoardContract.contractAddress, newTokenAmount);

            await assert.revert(bulletinBoardContract.from(bobAccount).editOffer(offersCount - 1, newTokenAmount, newEthAmounth));
        })
    })

    describe("Buy an Offer", function () {
        beforeEach(async () => {
            await amTechTokenContract.mint(aliceAccount.address, tokenAmount);
            await amTechTokenContract.from(aliceAccount).approve(bulletinBoardContract.contractAddress, tokenAmount);
            await bulletinBoardContract.from(aliceAccount).createOffer(tokenAmount, ethAmount);
            await whitelistingContract.setWhitelisted([bobAccount.address], true);
        })
        it("Should buy an offer", async () => {
            const aliceEthBalanceBefore = await deployer.provider.getBalance(aliceAccount.address);

            const offersCount = await bulletinBoardContract.getOffersPerSellerCount(aliceAccount.address);
            // seller index i array of sellers = 0
            await bulletinBoardContract.from(bobAccount).buyOffer(aliceAccount.address, offersCount - 1, {
                value: ethAmount
            });

            const aliceEthBalanceAfter = await deployer.provider.getBalance(aliceAccount.address);

            const offersCountAfter = await bulletinBoardContract.getOffersPerSellerCount(aliceAccount.address);

            assert(offersCountAfter.eq(0));
            assert(aliceEthBalanceBefore.eq(aliceEthBalanceAfter.sub(ethAmount)));

            const bobTokens = await amTechTokenContract.balanceOf(bobAccount.address);
            assert(bobTokens.eq(tokenAmount));
        })

        // TODO Write test to check if after an offer is bought the seller can add new offer

        it("Should revert if not whitelisted try to buy an offer", async () => {
            await whitelistingContract.setWhitelisted([bobAccount.address], false);

            const offersCount = await bulletinBoardContract.getOffersPerSellerCount(aliceAccount.address);

            await assert.revert(bulletinBoardContract.from(bobAccount).buyOffer(aliceAccount.address, offersCount - 1, {
                value: ethAmount
            }));
        })

        it("Should revert when trying to buy cancelled order", async () => {
            const offersCount = await bulletinBoardContract.getOffersPerSellerCount(aliceAccount.address);

            // - 1 to pass the index of the offer and the seller
            await bulletinBoardContract.from(aliceAccount).cancelOffer(offersCount - 1);

            await assert.revert(bulletinBoardContract.from(bobAccount).buyOffer(aliceAccount.address, offersCount - 1, {
                value: ethAmount
            }));
        })

        it("Should revert if msg.value < needed ethAmount for the offer", async () => {
            const offersCount = await bulletinBoardContract.getOffersPerSellerCount(aliceAccount.address);

            await assert.revert(bulletinBoardContract.from(bobAccount).buyOffer(aliceAccount.address, offersCount - 1, {
                value: ethAmount.sub(1)
            }));
        })

        it("Should revert if msg.value > needed ethAmount for the offer", async () => {
            const offersCount = await bulletinBoardContract.getOffersPerSellerCount(aliceAccount.address);

            await assert.revert(bulletinBoardContract.from(bobAccount).buyOffer(aliceAccount.address, offersCount - 1, {
                value: ethAmount.add(1)
            }));
        })

        it("Should fail if one tries to buy offer with wrong id", async () => {
            const wrongId = 3;
            await assert.revert(bulletinBoardContract.from(bobAccount).buyOffer(aliceAccount.address, wrongId, {
                value: ethAmount
            }));
        })

        it("Should fail if one tries to buy offer with wrong seller address", async () => {
            const offersCount = await bulletinBoardContract.getOffersPerSellerCount(aliceAccount.address);
            await assert.revert(bulletinBoardContract.from(bobAccount).buyOffer(charlieAccount.address, offersCount - 1, {
                value: ethAmount
            }));
        })
    })
})
