const ethers = require('ethers');
const etherlime = require('etherlime-lib');
const Relayer = require('../build/Relayer.json');
const Proxy = require('../build/Proxy.json');
const MockTarget = require('../build/MockTarget.json');
const SmartWallet = require('../build/SmartWallet.json');

const {
    generateSignData,
    generateSignStringData,
    generateExecutionSignature
} = require('./utils.js')



describe('Relayer Tests', function () {
    let relayerAccount = accounts[0];
    let aliceAccount = accounts[1];
    let bobAccount = accounts[2];
    let aliceSecondAccount = accounts[3];
    let deployer;
    let relayerInstance;


    this.timeout(20000);

    before(async () => {
        deployer = new etherlime.EtherlimeGanacheDeployer();
        relayerInstance = await deployer.deploy(Relayer, {}, Proxy.bytecode);

    });

    it('Should save the bytecode successfully', async () => {
        const bytecode = await relayerInstance.proxyBytecode();
        assert.strictEqual(bytecode, Proxy.bytecode, 'The bytecode was not saved correctly');
    })

    it('Should give correct address to user', async () => {
        const address = await relayerInstance.getAccountAddressForUser(aliceAccount.signer.address);
        assert.isAddress(address);
    })

    describe('Relaying trasnaction', function () {

        let mockTargetInstance;
        let mockTargetInterface;
        let smartWalletInterface;
        let accountAddress;

        before(async function () {
            mockTargetInstance = await deployer.deploy(MockTarget);
            mockTargetInterface = new ethers.utils.Interface(MockTarget.abi)
            smartWalletInterface = new ethers.utils.Interface(SmartWallet.abi)
            accountAddress = await relayerInstance.getAccountAddressForUser(aliceAccount.signer.address);
        })

        it('Should create smart wallet for new user and relay transaction', async () => {

            const hasBytecodeBefore = await deployer.provider.getCode(accountAddress);
            assert.strictEqual(hasBytecodeBefore, '0x', 'There was bytecode before execution');
            let nonce = 0;

            const item = ethers.utils.formatBytes32String('Alice Loves Shopping')

            let buyData = mockTargetInterface.encodeFunctionData("buy", [item]);

            const buySignature = await generateExecutionSignature(aliceAccount.signer, buyData, 0, 0, mockTargetInstance.contractAddress, nonce)

            const guardianData = await generateSignData(aliceAccount.signer, ['address'], [bobAccount.signer.address])
            let setData = smartWalletInterface.encodeFunctionData("addGuardian", [bobAccount.signer.address, guardianData.dataHash, guardianData.dataSig]);
            const setSignature = await generateExecutionSignature(aliceAccount.signer, setData, 0, 0, accountAddress, nonce)

            metaTxBatchData = smartWalletInterface.encodeFunctionData("execute", [
                [mockTargetInstance.contractAddress, accountAddress],
                [0, 0],
                [0, 0],
                [buyData, setData],
                [buySignature, setSignature]
            ])

            const target = accountAddress;

            const targetSignature = await generateSignData(aliceAccount.signer, ['address'], [target])

            const res = await relayerInstance.relay(target, targetSignature.dataSig, metaTxBatchData, {});

            const hasBytecodeAfter = await deployer.provider.getCode(accountAddress);
            assert.strictEqual(hasBytecodeAfter, Proxy.deployedBytecode, 'There is no bytecode after execution');

            const walletContract = await etherlime.ContractAt(SmartWallet, accountAddress)

            const signerStatus = await walletContract.isSigner(aliceAccount.signer.address)

            assert.strictEqual(signerStatus, 2, 'Alice is not owner of her contract')

            const bobStatus = await walletContract.isSigner(bobAccount.signer.address)
            assert.strictEqual(bobStatus, 1, 'Bob is not guardian of alice contract')

            const isBought = await mockTargetInstance.bought(item)
            assert(isBought, 'The item was not bought')
        })

        it('Should relay next data transaction successfully', async () => {
            await aliceAccount.signer.sendTransaction({
                to: accountAddress,
                value: ethers.utils.parseEther('0.1')
            })

            const smartWalletInstance = await etherlime.ContractAt(SmartWallet, accountAddress)

            let nonce = await smartWalletInstance.nonce();

            let isOwner = await smartWalletInstance.isSigner(aliceAccount.signer.address);
            console.log(isOwner);

            const valueToSend = ethers.utils.parseEther('0.01')

            const sendSignature = await generateExecutionSignature(aliceAccount.signer, [], 0, valueToSend, mockTargetInstance.contractAddress, nonce)

            let metaTxBatchData = await smartWalletInstance.contract.interface.encodeFunctionData("execute", [
                [mockTargetInstance.contractAddress],
                [0],
                [valueToSend],
                [
                    []
                ],
                [sendSignature]
            ])

            const targetSignature = await generateSignData(aliceAccount.signer, ['address'], [accountAddress])

            await relayerInstance.relay(accountAddress, targetSignature.dataSig, metaTxBatchData);

            const balance = await deployer.provider.getBalance(mockTargetInstance.contractAddress);
            assert(balance.eq(valueToSend), 'The balance was not how much the user sent')

            nonce = await smartWalletInstance.nonce();

            assert(nonce.eq(2), 'The nonce did not move to 2')

        })


    })

});