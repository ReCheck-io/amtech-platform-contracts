const ethers = require("ethers");
const etherlime = require("etherlime-lib");

const Whitelisting = require("../build/Whitelisting.json");
const AmtechToken = require("../build/AmTechToken.json");
const BulletinBoard = require("../build/BulletinBoard.json");

describe("Bulletin Board", function () {
    this.timeout(20000);
    let deployer;
    let whitelistingContract;
    let amTechTokenContract;
    let bulletinBoardContract;

    const tonekName = "AmTech";
    const tonekSymbol = "AMT";

    const aliceAccount = accounts[1].signer;
    const bobAccount = accounts[2].signer;
    const charlieAccount = accounts[3].signer;

    const amountToMint = ethers.utils.parseEther("105");
    const tokenAmount = ethers.utils.parseEther("0.5");
    const ethAmount = ethers.utils.parseEther("0.05");


    beforeEach(async () => {
        deployer = new etherlime.EtherlimeGanacheDeployer();
        whitelistingContract = await deployer.deploy(Whitelisting);
        amTechTokenContract = await deployer.deploy(AmtechToken, {}, tonekName, tonekSymbol, whitelistingContract.contractAddress);
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
        it("Should Create an Offer", async () => {
            await amTechTokenContract.mint(aliceAccount.address, amountToMint);
            await amTechTokenContract.from(aliceAccount).approve(bulletinBoardContract.contractAddress, tokenAmount);

            const sellerExistsBefore = await bulletinBoardContract.exists(aliceAccount.address);
            assert.ok(!sellerExistsBefore);

            await bulletinBoardContract.from(aliceAccount).createOffer(tokenAmount, ethAmount);

            const expectedSellersCount = 1;
            const sellersCount = await bulletinBoardContract.getSellersCount();
            assert(sellersCount.eq(expectedSellersCount));

            // sellersCount is the count, -1 to get the index.
            const sellerAddress = await bulletinBoardContract.allSellers(sellersCount - 1);
            assert.strictEqual(sellerAddress, aliceAccount.address, "The seller address is not correct");

            const offersCount = await bulletinBoardContract.getOffersPerSellerCount(aliceAccount.address);
            // offersCount is the count, -1 to get the index.
            const offerData = await bulletinBoardContract.OffersPerSeller(aliceAccount.address, offersCount - 1);

            assert.strictEqual(offerData.seller, aliceAccount.address, "The seller address is not correct");
            assert(offerData.tokenAmount.eq(tokenAmount), "Token amount in offer is not correct");
            assert(offerData.ethAmount.eq(ethAmount), "ether amount in offer is not correct");

            const sellerExistsAfter = await bulletinBoardContract.exists(aliceAccount.address);
            assert.ok(sellerExistsAfter);

            const totalTokensForSalePerSeller = await bulletinBoardContract.totalTokensForSalePerSeller(aliceAccount.address);
            assert(totalTokensForSalePerSeller.eq(tokenAmount));

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
                    const offerData = await bulletinBoardContract.OffersPerSeller(expectedSellersAddresses[i], f - 1);

                    assert.strictEqual(offerData.seller, expectedSellersAddresses[i], "The seller address is not correct");
                    assert(offerData.tokenAmount.eq(tokenAmount.mul(f)), "Token amount in offer is not correct");
                    assert(offerData.ethAmount.eq(ethAmount.mul(f)), "ether amount in offer is not correct");
                }
            }

            let res = 0;
            for (let i = 1; i <= expectedSellersCount; i++) {
                res += 0.5 * i;
            }
            console.log(res);

            for (let i = 0; i < expectedSellersCount; i++) {
                const totalTokensForSalePerSeller = await bulletinBoardContract.totalTokensForSalePerSeller(expectedSellersAddresses[i]);
                console.log(totalTokensForSalePerSeller.toString());

            }

        })
    })

    // describe("Cancel an Offer", function () {
    //     it("Should cancel an offer", async () => {


    //     })
    // })
})