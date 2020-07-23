const etherlime = require("etherlime-lib");
const ethers = require('ethers');
const PriceDistribution = require('../build/PrizeDistribution.json');
const MockRandomGenerator = require('../build/MockRandomGenerator.json');

describe("Example", function () {
    this.timeout(100000);

    let deployer;
    let priceDistribution;
    let mockRandomGenerator;

    const USERS = 10;

    beforeEach(async () => {
        deployer = new etherlime.EtherlimeGanacheDeployer();
        mockRandomGenerator = await deployer.deploy(MockRandomGenerator);
        priceDistribution = await deployer.deploy(PriceDistribution, {}, mockRandomGenerator.contractAddress);


        // for (let i = 0; i < USERS; i++) {
        //     const wallet = new ethers.Wallet.createRandom();
        //     const rand = Math.random() * 10 ** 18;
        //     let randBigNum = ethers.BigNumber.from(Math.floor(rand).toString());
        //     await priceDistribution.setUserWheight(wallet.address, randBigNum);
        // }
        // console.log('Done');

    });

    it.only('should add ten acounts ', async () => {
        const users = 10;
        for (let i = 0; i < users; i++) {
            const userAddress = accounts[i].signer.address;
            const userWeight = 1 * (i + 1) * 10 ** 18;
            await priceDistribution.setUserWheight(userAddress, userWeight.toString());
        }

        for (let i = 0; i < users; i++) {
            const userAddress = await priceDistribution.tokenHolders(i);
            const userWeight = await priceDistribution.tokenHolderWeights(i);

            assert.strictEqual(userAddress, accounts[i].signer.address);
            assert.equal(userWeight.toString(), 1 * (i + 1) * 10 ** 18);
        }

        for (let i = 0; i < users; i++) {
            let userInfo = await priceDistribution.getUserInfo(accounts[i].signer.address);

            assert.equal(userInfo.index, i)
            assert.equal(userInfo.isActiv, true)
        }
    });

    it('should get random number', async () => {

        const winners = 50;
        const seed = 123
        await priceDistribution.getRandomNumbers(winners, seed);
        for (let i = 0; i < winners; i++) {
            let res = await priceDistribution.currentRoundWinners(i)
            console.log(res.toString());
            let res2 = await priceDistribution.currentRoundWinnersAddress(i)
            console.log(res2);

        }
    })


});