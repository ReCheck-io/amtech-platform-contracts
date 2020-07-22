const etherlime = require("etherlime-lib");
const Lottary = require("../build/Lottary.json");
const VRFCoordinator = require("../build/VRFCoordinator.json");
const AmtechToken = require("../build/AmtechToken.json");
const ethers = require('ethers');

describe("Example", function () {
    this.timeout(20000);

    let owner = accounts[3];
    let deployer;
    let lottaryInstance;
    let vrfCoordinator;
    let amtechToken;

    const TOKEN_NAME = "AmTech Token";
    const TOKEN_SYMBOL = "AMT";

    const amountToMint = ethers.BigNumber.from("100000000000000000000");

    const ropstenPRKey = "0x2956B7AFA2B93C048F2281BE59A5D0ECAF247C5F82430A2209143C1E973C5B82";


    before(async () => {
        // deployer = new etherlime.InfuraPrivateKeyDeployer(ropstenPRKey, "ropsten");
        deployer = new etherlime.EtherlimeGanacheDeployer(owner.privateKey);

        amtechToken = await deployer.deploy(AmtechToken, {}, TOKEN_NAME, TOKEN_SYMBOL);
        vrfCoordinator = await deployer.deploy(VRFCoordinator, {}, amtechToken.contractAddress);
        lottaryInstance = await deployer.deploy(Lottary, {}, vrfCoordinator.contractAddress, amtechToken.contractAddress);

        await amtechToken.mint(lottaryInstance.contractAddress, amountToMint);
    });

    it("should have valid deployer private key", async () => {
        await lottaryInstance.rollDice("123");

        let res = await amtechToken.balanceOf(lottaryInstance.contractAddress)
        console.log(res.toString());

        let res2 = await lottaryInstance.lastReqID();
        console.log(res2);




    });
});