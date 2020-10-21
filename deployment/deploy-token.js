const etherlime = require('etherlime-lib');
const Whitelisting = require('../build/Whitelisting.json');
const PrizeDistribution = require('../build/PrizeDistribution.json');
const MockRandomGenerator = require('../build/MockRandomGenerator.json');
const AmTechToken = require('../build/AmTechToken.json');

const etherscanApiKey = '14ac2dd6bdcb485bb22ed4aa76d681ae';

const deploy = async (network, secret) => {
    let deployer;
    const tokenName = "Amtech Token";
    const tokenSymbol = "AMT";
    const tokensToMint = "100000000000000000000"; // 100 tokens

    if (!network) {
        deployer = new etherlime.EtherlimeGanacheDeployer();
    } else {
        deployer = new etherlime.InfuraPrivateKeyDeployer(secret, network, etherscanApiKey)
    }

    let whitelistingInstance = await deployer.deploy(Whitelisting, {});
    let randomGeneratorInstance = await deployer.deploy(MockRandomGenerator, {});
    let prizeDistributionInstance = await deployer.deploy(PrizeDistribution, {}, randomGeneratorInstance.contractAddress);

    let tokenInstance = await deployer.deploy(AmTechToken, {}, tokenName, tokenSymbol, whitelistingInstance.contractAddress, prizeDistributionInstance.contractAddress);

    let setWhitelisterTx = await whitelistingInstance.setWhitelister(deployer.signer.address, true);
    await whitelistingInstance.verboseWaitForTransaction(setWhitelisterTx, 'setWhitelister')

    let setTokenTx = await prizeDistributionInstance.setTokenAddress(tokenInstance.contractAddress);
    await prizeDistributionInstance.verboseWaitForTransaction(setTokenTx, 'setTokenAddress')

    // TODO Remove for mainnet
    let mintTx = await tokenInstance.mint(deployer.signer.address, tokensToMint);
    await tokenInstance.verboseWaitForTransaction(mintTx, 'mint')
};

module.exports = {
    deploy
};
