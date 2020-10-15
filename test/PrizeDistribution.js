const etherlime = require("etherlime-lib");
const ethers = require("ethers");
const PrizeDistribution = require("../build/PrizeDistribution.json");
const MockRandomGenerator = require("../build/MockRandomGenerator.json");
const Token = require("../build/AmTechToken.json");

describe.skip("Example", function () {
    this.timeout(100000);

    let deployer;
    let prizeDistribution;
    let mockRandomGenerator;

    const USERS = 50;

    const tokenContract = accounts[0].signer.address;
    let token;
    beforeEach(async () => {
        deployer = new etherlime.EtherlimeGanacheDeployer();
        mockRandomGenerator = await deployer.deploy(MockRandomGenerator);
        prizeDistribution = await deployer.deploy(
            PrizeDistribution, {},
            mockRandomGenerator.contractAddress
        );

        token = await deployer.deploy(Token, {}, "am", "amt", "0x4555A429Df5Cc32efa46BCb1412a3CD7Bf14b381", prizeDistribution.contractAddress);

        await prizeDistribution.setTokenAddress(tokenContract);

        for (let i = 0; i < USERS; i++) {
            const wallet = new ethers.Wallet.createRandom();
            const rand = (Math.random() * 10 ** 18) * 123;
            console.log(wallet.address, rand);

            let randBigNum = ethers.BigNumber.from(Math.floor(rand).toString());
            await prizeDistribution.setUserWeight(wallet.address, randBigNum);
        }
        console.log('END', USERS);
        await prizeDistribution.setTrustedRandom(5);
    });

    it("should set token address from owner", async () => {
        
        const rand = await prizeDistribution.currentRandomNumber();
        console.log(rand.toString());

        let res = await prizeDistribution.findWinner(rand);
        console.log(res);
        
        // await token.mint(accounts[1].signer.address, "325134534253453425")
        // await token.from(accounts[1].signer).burn("325134534253453425")
        // const wallet = new ethers.Wallet.createRandom();
        // const rand = Math.random() * 10 ** 18 * 123;
        // // console.log(wallet.address, rand);

        // let randBigNum = ethers.BigNumber.from(Math.floor(rand).toString());
        // await prizeDistribution.setUserWeight(wallet.address, randBigNum);
        // // await prizeDistribution.setUserWeight(wallet.address, randBigNum);

        // const addr = [];
        // const amount = [];

        // for (let i = 0; i < 100; i++) {
        //   const wallet = new ethers.Wallet.createRandom();
        //   const rand = Math.random() * 10 ** 18 * 123;
        //   let randBigNum = ethers.BigNumber.from(Math.floor(rand).toString());
        //   addr.push(wallet.address);
        //   amount.push(randBigNum);
        // }

        // await prizeDistribution.setWinnn(addr, amount);
        // await prizeDistribution.setTokenAddress(tokenContract);
        // let tokenAddress = await prizeDistribution.tokenAddress();
        // assert.equal(tokenAddress, tokenContract);
    });

    it("should revert if not owner tries to set token address", async () => {
        const notOwner = accounts[1].signer.address;
        await assert.revert(
            prizeDistribution.from(notOwner).setTokenAddress(tokenContract)
        );
    });

    it("should revert if one try to change token address", async () => {
        await prizeDistribution.setTokenAddress(tokenContract);
        let tokenAddress = await prizeDistribution.tokenAddress();
        assert.equal(tokenAddress, tokenContract);

        await assert.revert(prizeDistribution.setTokenAddress(tokenContract));
    });

    it("should set random generator address", async () => {
        let newRandomGenerator = accounts[9].signer.address;
        await prizeDistribution.setRandomGenerator(newRandomGenerator);
        let randomgeneratorAddress = await prizeDistribution.randomGenerator();
        assert.equal(randomgeneratorAddress, newRandomGenerator);
    });

    it("should revert if not owner tries to set random generator", async () => {
        const notOwner = accounts[1].signer.address;
        let newRandomGenerator = accounts[9].signer.address;

        await assert.revert(
            prizeDistribution.from(notOwner).setRandomGenerator(newRandomGenerator)
        );
    });

    // it(`should add ${USERS} accounts`, async () => {
    //     let users = await prizeDistribution.getUserCount();
    //     assert.equal(users, USERS);
    // })

});