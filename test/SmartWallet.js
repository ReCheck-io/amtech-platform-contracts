const ethers = require('ethers');
const etherlime = require('etherlime-lib');
const SmartWallet = require('../build/SmartWallet.json');
const MockTarget = require('../build/MockTarget.json');

const {
    generateSignData,
    generateSignStringData,
    generateExecutionSignature
} = require('./utils.js')

const SignerStatuses = {
    None: 0,
    Guardian: 1,
    Owner: 2
}

describe('Smart Wallet Tests', function () {
    this.timeout(10000);

    let relayerAccount = accounts[0];
    let aliceAccount = accounts[1];
    let bobAccount = accounts[2];
    let aliceSecondAccount = accounts[3];
    let deployer;
    let smartWalletInstance;

    beforeEach(async () => {

        deployer = new etherlime.EtherlimeGanacheDeployer();
        smartWalletInstance = await deployer.deploy(SmartWallet, {});
        await smartWalletInstance.initialise(aliceAccount.signer.address);
    });

    it('Should deploy smart wallet with Alice as owner', async () => {
        const res = await smartWalletInstance.isSigner(aliceAccount.signer.address)
        assert.equal(res, SignerStatuses.Owner, 'Alice is not owner of her wallet')
    });

    it('Should recover message correctly', async () => {
        const hashData = await generateSignStringData(bobAccount.signer, 'Hello Smart')
        const signer = await smartWalletInstance.getSigner(hashData.dataHash, hashData.dataSig);
        assert.equal(signer, bobAccount.signer.address, 'It did not correctly recover bobs account')
    })

    describe('Relaying transactions', () => {

        let mockTargetInstance;
        beforeEach(async () => {
            deployer = new etherlime.EtherlimeGanacheDeployer();
            mockTargetInstance = await deployer.deploy(MockTarget);
            // Send Money in the smart wallet
            await aliceAccount.signer.sendTransaction({
                to: smartWalletInstance.contractAddress,
                value: ethers.utils.parseEther('0.1')
            })
        });


        it('Should relay transaction signed by the owner successfully', async () => {
            const valueToSend = ethers.utils.parseEther('0.01')
            const item = ethers.utils.formatBytes32String('Alice Loves Shopping')

            let buyData = mockTargetInstance.contract.interface.functions.buy.encode([item]);

            let nonce = await smartWalletInstance.nonce();

            const sendSignature = await generateExecutionSignature(aliceAccount.signer, [], 0, valueToSend, mockTargetInstance.contractAddress, nonce)
            const buySignature = await generateExecutionSignature(aliceAccount.signer, buyData, 0, 0, mockTargetInstance.contractAddress, nonce)


            let transaction = await smartWalletInstance.execute([mockTargetInstance.contractAddress, mockTargetInstance.contractAddress], [0, 0], [valueToSend, 0], [
                [], buyData
            ], [sendSignature, buySignature])


            const receipt = await transaction.wait();

            const expectedEvent = "LogActionExecuted"

            assert(receipt.events[0].event == expectedEvent, 'Incorrect event was thrown');
            assert(receipt.events[1].event == expectedEvent, 'Incorrect event was thrown');

            const balance = await deployer.provider.getBalance(mockTargetInstance.contractAddress);
            assert(balance.eq(valueToSend), 'The balance was not how much the user sent')

            const isBought = await mockTargetInstance.bought(item)
            assert(isBought, 'The item was not bought')

            nonce = await smartWalletInstance.nonce();
            assert(nonce.eq(1), 'The nonce did not move to 1')
        })

        it('Should relay transaction and reward relayer', async () => {
            const valueToSend = ethers.utils.parseEther('0.01')
            const reward = ethers.utils.parseEther('0.005')
            const item = ethers.utils.formatBytes32String('Alice Loves Shopping')

            let buyData = mockTargetInstance.contract.interface.functions.buy.encode([item]);

            let nonce = await smartWalletInstance.nonce();

            const sendSignature = await generateExecutionSignature(aliceAccount.signer, [], reward, valueToSend, mockTargetInstance.contractAddress, nonce)
            const buySignature = await generateExecutionSignature(aliceAccount.signer, buyData, reward, 0, mockTargetInstance.contractAddress, nonce)


            let transaction = await smartWalletInstance.execute([mockTargetInstance.contractAddress, mockTargetInstance.contractAddress], [reward, reward], [valueToSend, 0], [
                [], buyData
            ], [sendSignature, buySignature])


            const balance = await deployer.provider.getBalance(smartWalletInstance.contractAddress);
            assert(balance.eq(ethers.utils.parseEther('0.08')), 'The balance was not how much the user sent')

        })

        it('Should fail with malicious signature', async () => {
            const valueToSend = ethers.utils.parseEther('0.01')
            const item = ethers.utils.formatBytes32String('Alice Loves Shopping')

            let buyData = mockTargetInstance.contract.interface.functions.buy.encode([item]);

            let nonce = await smartWalletInstance.nonce();

            const sendSignature = await generateExecutionSignature(aliceAccount.signer, [], 0, valueToSend, mockTargetInstance.contractAddress, nonce)
            const buySignature = await generateExecutionSignature(bobAccount.signer, buyData, 0, 0, mockTargetInstance.contractAddress, nonce)

            const transaction = smartWalletInstance.execute([mockTargetInstance.contractAddress, mockTargetInstance.contractAddress], [0, 0], [valueToSend, 0], [
                [], buyData
            ], [sendSignature, buySignature]);

            assert.revert(transaction, 'Bob successfully interjected their transaction')

            const balance = await deployer.provider.getBalance(mockTargetInstance.contractAddress);
            assert(balance.eq(0), 'The balance was not 0')

            const isBought = await mockTargetInstance.bought(item)
            assert(!isBought, 'The item was bought')

            nonce = await smartWalletInstance.nonce();

            assert(nonce.eq(0), 'The nonce did move to 1')
        })

        it('Should fail replaying the same transaction twice', async () => {
            const valueToSend = ethers.utils.parseEther('0.01')
            const item = ethers.utils.formatBytes32String('Alice Loves Shopping')

            let buyData = mockTargetInstance.contract.interface.functions.buy.encode([item]);

            let nonce = await smartWalletInstance.nonce();

            const sendSignature = await generateExecutionSignature(aliceAccount.signer, [], 0, valueToSend, mockTargetInstance.contractAddress, nonce)
            const buySignature = await generateExecutionSignature(aliceAccount.signer, buyData, 0, 0, mockTargetInstance.contractAddress, nonce)

            await smartWalletInstance.execute([mockTargetInstance.contractAddress, mockTargetInstance.contractAddress], [0, 0], [valueToSend, 0], [
                [], buyData
            ], [sendSignature, buySignature])

            nonce = await smartWalletInstance.nonce();

            assert(nonce.eq(1), 'The nonce did not move to 1')

            await assert.revert(smartWalletInstance.from(bobAccount).execute([mockTargetInstance.contractAddress, mockTargetInstance.contractAddress], [0, 0], [valueToSend, 0], [
                [], buyData
            ], [sendSignature, buySignature]))

            const balance = await deployer.provider.getBalance(mockTargetInstance.contractAddress);
            assert(balance.eq(valueToSend), 'The balance was not how much the user sent')

            nonce = await smartWalletInstance.nonce();

            assert(nonce.eq(1), 'The nonce should not have moved from')
        })

        it('Should fail calling myself from the relayed transaction', async () => {
            const valueToSend = ethers.utils.parseEther('0.01')
            let nonce = await smartWalletInstance.nonce();

            const sendSignature = await generateExecutionSignature(aliceAccount.signer, [], 0, valueToSend, mockTargetInstance.contractAddress, nonce)

            let executeData = smartWalletInstance.contract.interface.functions.execute.encode([
                [smartWalletInstance.contractAddress],
                [0],
                [valueToSend],
                [
                    []
                ],
                [sendSignature]
            ]);

            const executeSignature = await generateExecutionSignature(aliceAccount.signer, executeData, 0, 0, smartWalletInstance.contractAddress, nonce)

            await assert.revert(smartWalletInstance.execute([smartWalletInstance.contractAddress], [0], [0], [
                executeData
            ], [executeSignature]))

            nonce = await smartWalletInstance.nonce();
            assert(nonce.eq(0), 'The nonce did move to 1')
        })
    })

    describe('Adding users', () => {
        it('Should allow owner to add more owners', async () => {

            const nonce = await smartWalletInstance.nonce();
            const signData = await generateSignData(aliceAccount.signer, ['address'], [aliceSecondAccount.signer.address])
            const addOwnerData = smartWalletInstance.contract.interface.functions.addOwner.encode([aliceSecondAccount.signer.address, signData.dataHash, signData.dataSig])
            const addOwnerSignature = await generateExecutionSignature(aliceAccount.signer, addOwnerData, 0, 0, smartWalletInstance.contractAddress, nonce)

            await smartWalletInstance.execute([smartWalletInstance.contractAddress], [0], [0], [addOwnerData], [addOwnerSignature])

            const res = await smartWalletInstance.isSigner(aliceSecondAccount.signer.address)
            assert.equal(res, SignerStatuses.Owner, 'Alice second account is not owner of the wallet')
        });

        it('Should allow owner to add guardian', async () => {
            const nonce = await smartWalletInstance.nonce();
            const signData = await generateSignData(aliceAccount.signer, ['address'], [bobAccount.signer.address])
            const addGuardianData = smartWalletInstance.contract.interface.functions.addGuardian.encode([bobAccount.signer.address, signData.dataHash, signData.dataSig])
            const addGuardianSignature = await generateExecutionSignature(aliceAccount.signer, addGuardianData, 0, 0, smartWalletInstance.contractAddress, nonce)

            await smartWalletInstance.execute([smartWalletInstance.contractAddress], [0], [0], [addGuardianData], [addGuardianSignature])

            const res = await smartWalletInstance.isSigner(bobAccount.signer.address)
            assert.equal(res, SignerStatuses.Guardian, 'Bob is not guardian')
        });

        it('Should allow new owner to remove old owner', async () => {
            let nonce = await smartWalletInstance.nonce();
            const signData = await generateSignData(aliceAccount.signer, ['address'], [aliceSecondAccount.signer.address])
            const addOwnerData = smartWalletInstance.contract.interface.functions.addOwner.encode([aliceSecondAccount.signer.address, signData.dataHash, signData.dataSig])
            const addOwnerSignature = await generateExecutionSignature(aliceAccount.signer, addOwnerData, 0, 0, smartWalletInstance.contractAddress, nonce)

            await smartWalletInstance.execute([smartWalletInstance.contractAddress], [0], [0], [addOwnerData], [addOwnerSignature])

            nonce = await smartWalletInstance.nonce();
            const removeSignData = await generateSignData(aliceSecondAccount.signer, ['address'], [aliceAccount.signer.address])
            const removeOwnerData = smartWalletInstance.contract.interface.functions.removeOwner.encode([aliceAccount.signer.address, removeSignData.dataHash, removeSignData.dataSig])
            const removeOwnerSignature = await generateExecutionSignature(aliceSecondAccount.signer, removeOwnerData, 0, 0, smartWalletInstance.contractAddress, nonce)

            await smartWalletInstance.execute([smartWalletInstance.contractAddress], [0], [0], [removeOwnerData], [removeOwnerSignature])

            const res = await smartWalletInstance.isSigner(aliceAccount.signer.address)
            assert.equal(res, SignerStatuses.None, 'Alice is still owner of her wallet')
        });

        describe('Guardians', () => {


            beforeEach(async () => {
                const nonce = await smartWalletInstance.nonce();
                const signData = await generateSignData(aliceAccount.signer, ['address'], [bobAccount.signer.address])
                const addOwnerData = smartWalletInstance.contract.interface.functions.addGuardian.encode([bobAccount.signer.address, signData.dataHash, signData.dataSig])
                const addOwnerSignature = await generateExecutionSignature(aliceAccount.signer, addOwnerData, 0, 0, smartWalletInstance.contractAddress, nonce)

                await smartWalletInstance.execute([smartWalletInstance.contractAddress], [0], [0], [addOwnerData], [addOwnerSignature])
            })

            it('Should allow owner to remove guardian', async () => {
                const nonce = await smartWalletInstance.nonce();

                const removeSignData = await generateSignData(aliceAccount.signer, ['address'], [bobAccount.signer.address])
                const removeGuardianData = smartWalletInstance.contract.interface.functions.removeGuardian.encode([bobAccount.signer.address, removeSignData.dataHash, removeSignData.dataSig])
                const removeGuardianSignature = await generateExecutionSignature(aliceAccount.signer, removeGuardianData, 0, 0, smartWalletInstance.contractAddress, nonce)

                await smartWalletInstance.execute([smartWalletInstance.contractAddress], [0], [0], [removeGuardianData], [removeGuardianSignature])

                const res = await smartWalletInstance.isSigner(bobAccount.signer.address)
                assert.equal(res, SignerStatuses.None, 'Bob is still a guardian')
            });

            it('Should not allow guardian to remove guardian', async () => {
                let nonce = await smartWalletInstance.nonce();
                const signData = await generateSignData(aliceAccount.signer, ['address'], [aliceSecondAccount.signer.address])
                const addGuardianData = smartWalletInstance.contract.interface.functions.addGuardian.encode([aliceSecondAccount.signer.address, signData.dataHash, signData.dataSig])
                const addGuardianSignature = await generateExecutionSignature(aliceAccount.signer, addGuardianData, 0, 0, smartWalletInstance.contractAddress, nonce)
                await smartWalletInstance.execute([smartWalletInstance.contractAddress], [0], [0], [addGuardianData], [addGuardianSignature])
                const res = await smartWalletInstance.isSigner(aliceSecondAccount.signer.address)
                assert.equal(res, SignerStatuses.Guardian, 'Alice second account is not guardian of her wallet')
                nonce = await smartWalletInstance.nonce();

                const removeSignData = await generateSignData(aliceSecondAccount.signer, ['address'], [bobAccount.signer.address])
                const removeGuardianData = smartWalletInstance.contract.interface.functions.removeGuardian.encode([bobAccount.signer.address, removeSignData.dataHash, removeSignData.dataSig])
                const removeGuardianSignature = await generateExecutionSignature(aliceAccount.signer, removeGuardianData, 0, 0, smartWalletInstance.contractAddress, nonce)
                await assert.revert(smartWalletInstance.execute([smartWalletInstance.contractAddress], [0], [0], [removeGuardianData], [removeGuardianSignature]))
            });


            it('Should allow guardian to add owner', async () => {
                const nonce = await smartWalletInstance.nonce();
                const signData = await generateSignData(bobAccount.signer, ['address'], [aliceSecondAccount.signer.address])
                const addOwnerData = smartWalletInstance.contract.interface.functions.addOwner.encode([aliceSecondAccount.signer.address, signData.dataHash, signData.dataSig])
                const addOwnerSignature = await generateExecutionSignature(bobAccount.signer, addOwnerData, 0, 0, smartWalletInstance.contractAddress, nonce)

                await smartWalletInstance.execute([smartWalletInstance.contractAddress], [0], [0], [addOwnerData], [addOwnerSignature])

                const res = await smartWalletInstance.isSigner(aliceSecondAccount.signer.address)
                assert.equal(res, SignerStatuses.Owner, 'Alice second account is not owner of the wallet')
            });

            it('Should allow guardian to remove owner', async () => {
                const nonce = await smartWalletInstance.nonce();

                const signData = await generateSignData(bobAccount.signer, ['address'], [aliceAccount.signer.address])
                const removeOwnerData = smartWalletInstance.contract.interface.functions.removeOwner.encode([aliceAccount.signer.address, signData.dataHash, signData.dataSig])
                const removeOwnerSignature = await generateExecutionSignature(bobAccount.signer, removeOwnerData, 0, 0, smartWalletInstance.contractAddress, nonce)

                await smartWalletInstance.execute([smartWalletInstance.contractAddress], [0], [0], [removeOwnerData], [removeOwnerSignature])

                const res = await smartWalletInstance.isSigner(aliceAccount.signer.address)
                assert.equal(res, SignerStatuses.None, 'Alice is still owner of her wallet')
            });


            it('Should replace guardian in one transaction', async () => {
                const nonce = await smartWalletInstance.nonce();

                const addOwnerSignData = await generateSignData(bobAccount.signer, ['address'], [aliceSecondAccount.signer.address])
                const addOwnerData = smartWalletInstance.contract.interface.functions.addOwner.encode([aliceSecondAccount.signer.address, addOwnerSignData.dataHash, addOwnerSignData.dataSig])
                const addOwnerSignature = await generateExecutionSignature(bobAccount.signer, addOwnerData, 0, 0, smartWalletInstance.contractAddress, nonce)

                const removeOwnerSignData = await generateSignData(bobAccount.signer, ['address'], [aliceAccount.signer.address])
                const removeOwnerData = smartWalletInstance.contract.interface.functions.removeOwner.encode([aliceAccount.signer.address, removeOwnerSignData.dataHash, removeOwnerSignData.dataSig])
                const removeOwnerSignature = await generateExecutionSignature(bobAccount.signer, removeOwnerData, 0, 0, smartWalletInstance.contractAddress, nonce)

                await smartWalletInstance.execute([smartWalletInstance.contractAddress, smartWalletInstance.contractAddress], [0, 0], [0, 0], [removeOwnerData, addOwnerData], [removeOwnerSignature, addOwnerSignature])

                const res = await smartWalletInstance.isSigner(aliceAccount.signer.address)
                assert.equal(res, SignerStatuses.None, 'Alice is still owner of her wallet')

                const res2 = await smartWalletInstance.isSigner(aliceSecondAccount.signer.address)
                assert.equal(res2, SignerStatuses.Owner, 'Alice is still owner of her wallet')
            });
        })

    })


});