const etherlime = require('etherlime-lib');
const Relayer = require('../build/Relayer.json');
const Proxy = require('../build/Proxy.json');

const etherscanApiKey = '14ac2dd6bdcb485bb22ed4aa76d681ae';

const deploy = async (network, secret) => {
    let deployer;

    if (!network) {
        deployer = new etherlime.EtherlimeGanacheDeployer();
    } else {
        deployer = new etherlime.InfuraPrivateKeyDeployer(secret, network, etherscanApiKey)
    }
    relayerInstance = await deployer.deploy(Relayer, {}, Proxy.bytecode);
    proxyInstance = await deployer.deploy(Proxy, {});

};

module.exports = {
    deploy
};
