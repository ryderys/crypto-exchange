const autoBind = require("auto-bind");
const { default: BigNumber } = require("bignumber.js");
const { sequelize } = require("../../../../config/sequelize");
const walletService = require("../wallet/wallet.service");

class TradingService {
    #WalletService
    constructor(){
        autoBind(this)
        this.#WalletService = walletService
    }
    async getCoinPrice(currency){
        try {
            const response = await axios.get(`https://api.coingecko.com/api/v3/simple/price`, {
                params: {
                    ids: currency,
                    vs_currencies: 'usd' // Convert to USD
                }
            })
            return response.data[currency].usd
        } catch (error) {
            console.error('Error fetching coin price:', error)
            throw new Error('Error fetching coin price');
        }
    }

    async buyCrypto(userId, cryptoId, fiatCurrency, amountInFiat){
       const cryptoPrice = await this.#WalletService.getCoinPrice(cryptoId)
       const cryptoAmount = new BigNumber(amountInFiat).dividedBy(cryptoPrice)

       await this.#WalletService.withdrawFundsByCurrency(userId, fiatCurrency, amountInFiat)

       await this.#WalletService.depositFundsByCurrency(userId, cryptoId, cryptoAmount.toFixed())

       return {cryptoAmount: cryptoAmount.toFixed(), cryptoId}
    }

    async sellCrypto(userId, cryptoId, fiatCurrency, amountInCrypto){
        const cryptoPrice = await this.#WalletService.getCoinPrice(cryptoId)
        const fiatAmount = new BigNumber(amountInCrypto).multipliedBy(cryptoPrice)

        await this.#WalletService.withdrawFundsByCurrency(userId, cryptoId, amountInCrypto)

        await this.#WalletService.depositFundsByCurrency(userId, fiatCurrency, fiatAmount.toFixed())
    
        return {fiatAmount: fiatAmount.toFixed(), fiatCurrency}
    }

}
module.exports = new TradingService()