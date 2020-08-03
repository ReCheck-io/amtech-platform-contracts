const etherlime = require("etherlime-lib");
const ethers = require("ethers");
const PrizeDistribution = require("../build/PrizeDistribution.json");
const MockRandomGenerator = require("../build/MockRandomGenerator.json");

const INFURA_PROVIDER = "148dda379bdd4346ae1ad2e9a159249d";

const ENV = {
  LOCAL: "LOCAL",
  TEST: "TEST",
};

const USERS = 500;
const winners = 100;
const seed = 123;

const DEPLOYERS = {
  LOCAL: () => {
    return new etherlime.EtherlimeGanacheDeployer();
  },
  TEST: (secret, network) => {
    let deployer = new etherlime.InfuraPrivateKeyDeployer(
      secret,
      network,
      INFURA_PROVIDER
    );
    // let etherscanAPIKey = 'J531BRU4FNGMNCD693FT6YS9TAM9TWS6QG';
    // deployer.setVerifierApiKey(etherscanAPIKey);
    return deployer;
  },
};

const deploy = async (network, secret, etherscanApiKey) => {
  const env = ENV.TEST;

  const deployer = DEPLOYERS[env](secret, network);

  // let mockRandomGenerator = await deployer.deploy(MockRandomGenerator);
  // let prizeDistribution = await deployer.deploy(PrizeDistribution, {}, mockRandomGenerator.contractAddress);

  // const setTokenAddr = await prizeDistribution.setTokenAddress('0x4555A429Df5Cc32efa46BCb1412a3CD7Bf14b381');
  // await prizeDistribution.verboseWaitForTransaction(setTokenAddr, 'setTokenAddr')
  // for (let i = 0; i < USERS; i++) {
  // 	const wallet = new ethers.Wallet.createRandom();
  // 	const rand = (Math.random() * 10 ** 18) * 123;
  // 	console.log(wallet.address, rand);

  // 	let randBigNum = ethers.BigNumber.from(Math.floor(rand).toString());
  // 	const setUserData = await prizeDistribution.setUserWeight(wallet.address, randBigNum);
  // 	await prizeDistribution.verboseWaitForTransaction(setUserData, "setUserData")
  // }

  // const drawWinners = await prizeDistribution.drawWinners(winners, seed);
  // await prizeDistribution.verboseWaitForTransaction(drawWinners, 'drawWinners')

  // console.log(deployer.signer.provider);

  const address = "0xEFf389EEC54D173A75D07eb4b5dd1629203ebF78";
  const contract = deployer.wrapDeployedContract(PrizeDistribution, address);

  //   let tx = await contract.getUserCount();
  //   console.log(tx.toString());

  let tx = await contract.drawWinners("1", "12234324213");
  await contract.verboseWaitForTransaction(tx, "tx");

  // etherlime compile --solcVersion 0.6.6
  // etherlime deploy --compile false --secret 0x2956b7afa2b93c048f2281be59a5d0ecaf247c5f82430a2209143c1e973c5b82 --network kovan
};

module.exports = {
  deploy,
};
