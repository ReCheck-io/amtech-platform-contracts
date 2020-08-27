const etherlime = require('etherlime-lib');
const Relayer = require('../build/Relayer.json');
const SmartWallet = require('../build/SmartWallet.json');


const deploy = async (network, secret, etherscanApiKey) => {
	let deployer;

	if (!network) {
		deployer = new etherlime.EtherlimeGanacheDeployer();
	} else {
		deployer = new etherlime.InfuraPrivateKeyDeployer(secret, network, '14ac2dd6bdcb485bb22ed4aa76d681ae')
	}
	relayerInstance = await deployer.deploy(SmartWallet, {});

};

module.exports = {
	deploy
};