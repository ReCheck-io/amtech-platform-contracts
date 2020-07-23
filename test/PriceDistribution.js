const etherlime = require("etherlime-lib");
const ethers = require('ethers');
const PriceDistribution = require('../build/PriceDistribution.json');

describe("Example", function () {
    this.timeout(20000);

    let deployer;
    let priceDistribution;

    const randomGenerator = accounts[9].signer.address;

    before(async () => {
        deployer = new etherlime.EtherlimeGanacheDeployer();
        priceDistribution = await deployer.deploy(PriceDistribution, {}, randomGenerator);
    });



    it('should add one ', async () => {
        const userAddress = accounts[1].signer.address;
        const userWeight = "1000000000000000000"
        await priceDistribution.setUserWheight(userAddress, userWeight);

        let res = await priceDistribution.getUserWeight(userAddress);

        console.log(res.toString());
    });

    it('should add second ', async () => {
        const userAddress = accounts[2].signer.address;
        const userWeight = "2000000000000000000"
        await priceDistribution.setUserWheight(userAddress, userWeight);

        let res = await priceDistribution.getUserWeight(userAddress);

        console.log(res.toString());
    });

    it('should add third ', async () => {
        const userAddress = accounts[3].signer.address;
        const userWeight = "5000000000000000000"
        await priceDistribution.setUserWheight(userAddress, userWeight);

        let res = await priceDistribution.getUserWeight(userAddress);

        console.log(res.toString());
    });

    it('should add third ', async () => {
        const userAddress = accounts[1].signer.address;
        const userWeight = "7000000000000000000"
        await priceDistribution.setUserWheight(userAddress, userWeight);

        let res = await priceDistribution.getUserWeight(userAddress);

        console.log(res.toString());
    });

    it('asd', async () => {
        let res = await priceDistribution.tokenHolderWeights(0);
        console.log(res.toString());

    })

    it('asd', async () => {
        let res = await priceDistribution.tokenHolderWeights(3);
        console.log(res.toString());

    })

});