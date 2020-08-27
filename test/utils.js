async function generateSignData(wallet, types, values) {
	const dataHash = ethers.utils.solidityKeccak256(types, values);
	const dataHashBytes = ethers.utils.arrayify(dataHash);
	const dataSig = await wallet.signMessage(dataHashBytes);
	return {
		dataHash,
		dataSig
	}
}
async function generateSignStringData(wallet, message) {
	return generateSignData(wallet, ['string'], [message])
}

async function generateExecutionSignature(signer, data, reward, value, traget, nonce) {
	let dataHash = ethers.utils.solidityKeccak256(['bytes', 'uint256', 'uint256', 'address', 'uint256'], [data, reward, value, traget, nonce]);
	let hashDataArray = ethers.utils.arrayify(dataHash);
	return signer.signMessage(hashDataArray);
}

module.exports = {
	generateSignData,
	generateSignStringData,
	generateExecutionSignature
}