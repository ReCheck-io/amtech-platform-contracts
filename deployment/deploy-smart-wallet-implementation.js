const etherlime = require('etherlime-lib');
const SmartWallet = require('../build/SmartWallet.json');

const etherscanApiKey = '14ac2dd6bdcb485bb22ed4aa76d681ae';

const deploy = async (network, secret) => {
    let deployer;

    if (!network) {
        deployer = new etherlime.EtherlimeGanacheDeployer();
    } else {
        deployer = new etherlime.InfuraPrivateKeyDeployer(secret, network, etherscanApiKey)
    }
    relayerInstance = await deployer.deploy(SmartWallet, {});

};

module.exports = {
    deploy
};