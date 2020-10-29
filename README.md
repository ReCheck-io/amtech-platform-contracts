# amtech-platform-contracts

Run Compilation
-
`etherlime compile --solcVersion 0.6.6`

Run Deployment
-
### Smart wallet deployment
``etherlime deploy --file ./deployment/deploy-smart-wallet-implementation.js --compile=false``

### Testnet deployment
``etherlime deploy --file ./deployment/deploy-smart-wallet-implementation.js --compile=false --network kovan --secret <>`` 
Change address to the Smart Wallet Proxy
``etherlime deploy --file ./deployment/deploy-relayer.js --compile=false --network kovan --secret <>`` 
``etherlime deploy --file ./deployment/deploy-all.js --compile=false --network kovan --secret <>`` 

Run tests
- 
`etherlime test --solcVersion 0.6.6`

Some SmartWallet tests would fail - to run the smart wallet tests first we need to deploy a smart contract implementation (deployment/deploy-smart-wallet-implementation.js) and set its address to the Proxy.sol contract.
