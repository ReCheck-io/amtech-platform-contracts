const etherlime = require('etherlime-lib');
const Whitelisting = require('../build/Whitelisting.json');
const owner = accounts[0].signer;
const whitelistOperator = accounts[9].signer;

describe.only('Whitelisting', () => {
    let deployer;
    let whitelistingContract;

    beforeEach(async () => {
        deployer = new etherlime.EtherlimeGanacheDeployer();
        whitelistingContract = await deployer.deploy(Whitelisting);
        await whitelistingContract.setWhitelister(whitelistOperator.address, true);
    });

    it('Should have the correct whitelister set', async () => {
        const isWhitelister = await whitelistingContract.whitelisters(whitelistOperator.address);
        assert.ok(isWhitelister);
    });

    it('Should add one as whitelisted from owner', async () => {
        const users = [accounts[5].signer.address];
        const status = true;

        await whitelistingContract.from(owner).setWhitelisted(users, status);
        const isWhitelisted = await whitelistingContract.isWhitelisted(users[0]);
        assert.ok(isWhitelisted);
    });

    it('Should add one as whitelisted from whitelistOperator', async () => {
        const users = [accounts[1].signer.address];
        const status = true;

        await whitelistingContract.from(whitelistOperator).setWhitelisted(users, status);
        const isWhitelisted = await whitelistingContract.isWhitelisted(users[0]);
        assert.ok(isWhitelisted);
    });

    it('Should add multiple users as whitelisted', async () => {
        const users = [accounts[2].signer.address, accounts[3].signer.address, accounts[4].signer.address];
        const status = true;

        await whitelistingContract.from(whitelistOperator).setWhitelisted(users, status);

        for (i = 0; i < users.length; i++) {
            let isWhitelisted = await whitelistingContract.isWhitelisted(users[i]);
            assert.ok(isWhitelisted);
        }
    });

    it('Should emit when whitelist', async () => {
        const eventName = "WhitelistedStatusModified";
        const users = [accounts[2].signer.address, accounts[3].signer.address, accounts[4].signer.address];
        const status = true;

        let transaction = await whitelistingContract.from(whitelistOperator).setWhitelisted(users, status);

        const transactionReceipt = await whitelistingContract.verboseWaitForTransaction(transaction);
        let isEmitted = utils.hasEvent(transactionReceipt, whitelistingContract, eventName);
        assert(isEmitted, 'Event WhitelistedStatusModified was not emitted');

    });

    it('Should remove one from whitelisted', async () => {
        const users = [accounts[1].signer.address];
        const statusTrue = true;

        await whitelistingContract.from(whitelistOperator).setWhitelisted(users, statusTrue);

        const user = [accounts[1].signer.address];
        const statusFalse = false;

        const isWhitelistedBefore = await whitelistingContract.isWhitelisted(user[0]);
        assert.ok(isWhitelistedBefore);

        await whitelistingContract.from(whitelistOperator).setWhitelisted(user, statusFalse);

        const isWhitelistedAfter = await whitelistingContract.isWhitelisted(user[0]);
        assert.notOk(isWhitelistedAfter);
    });

    it('Should remove multiple users from whitelisted', async () => {
        const usersToAdd = [accounts[2].signer.address, accounts[3].signer.address, accounts[4].signer.address];
        const statusTrue = true;

        await whitelistingContract.from(whitelistOperator).setWhitelisted(usersToAdd, statusTrue);

        const users = [accounts[2].signer.address, accounts[3].signer.address, accounts[4].signer.address];
        const status = false;

        for (i = 0; i < users.length; i++) {
            let isWhitelisted = await whitelistingContract.isWhitelisted(users[i]);
            assert.ok(isWhitelisted);
        }

        await whitelistingContract.from(whitelistOperator).setWhitelisted(users, status);

        for (i = 0; i < users.length; i++) {
            let isWhitelisted = await whitelistingContract.isWhitelisted(users[i]);
            assert.notOk(isWhitelisted);
        }
    });

    it('Should revert if not owner tries to set whitelisted status', async () => {
        const notWhitelistOperator = accounts[8].signer;
        const users = [accounts[1].signer.address];
        const status = false;

        await assert.revert(whitelistingContract.from(notWhitelistOperator).setWhitelisted(users, status));
    });
});
