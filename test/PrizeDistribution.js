const etherlime = require("etherlime-lib");
const ethers = require('ethers');
const PrizeDistribution = require('../build/PrizeDistribution.json');
const MockRandomGenerator = require('../build/MockRandomGenerator.json');

describe("Example", function () {
    this.timeout(100000);

    let deployer;
    let prizeDistribution;
    let mockRandomGenerator;

    const USERS = 10;

    beforeEach(async () => {
        deployer = new etherlime.EtherlimeGanacheDeployer();
        mockRandomGenerator = await deployer.deploy(MockRandomGenerator);
        prizeDistribution = await deployer.deploy(PrizeDistribution, {}, mockRandomGenerator.contractAddress);


        for (let i = 0; i < USERS; i++) {
            const wallet = new ethers.Wallet.createRandom();
            const rand = (Math.random() * 10 ** 18) * 123;
            console.log(wallet.address, rand);
            console.log('END');

            let randBigNum = ethers.BigNumber.from(Math.floor(rand).toString());
            await prizeDistribution.setUserWheight(wallet.address, randBigNum);
        }

    });

    it(`should add ${USERS} accounts`, async () => {
        let users = await prizeDistribution.getUserCount();
        assert.equal(users, USERS);
    })

    it.only('should get winners', async () => {
        const winners = 10;
        const seed = 123
        await prizeDistribution.drawWinners(winners, seed);
        let roundWinners = await prizeDistribution.getRoundWinnersCount(0);
        assert.equal(winners, roundWinners.toString());

        for (let i = 0; i < roundWinners; i++) {
            let winner = await prizeDistribution.getWinnerPerRound(0, i);
            console.log(winner[0], winner[1].toString());

        }
    })

})