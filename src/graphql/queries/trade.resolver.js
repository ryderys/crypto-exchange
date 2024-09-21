const { GraphQLString, GraphQLList } = require("graphql")
const { PortFolioType, OrderBookType, TradeType, tradeAnalyticsType, tradeHistoryType, TradeAnalyticsType } = require("../typeDefs/trade.types")
const { VerifyAccessTokenInGraphQL, logger } = require("../../common/utils")
const WalletSchema = require("../../REST/modules/wallet/wallet.model")
const { default: BigNumber } = require("bignumber.js")
const { default: axios } = require("axios")
const LimitOrder = require("../../REST/modules/order/limitOrder.model")
const TransactionSchema = require("../../REST/modules/transactions/transactions.model")


const marketService = {
    getCoinPrice: async (currency, toCurrency) => {
        const lowerCaseCurrency = currency.toLowerCase();
        const url = `https://api.coingecko.com/api/v3/simple/price?ids=${lowerCaseCurrency}&vs_currencies=${toCurrency}`;
        try {
            const response = await axios.get(url, {
                headers: {
                    accept: 'application/json',
                    'x-cg-demo-api-key': ' CG-A8496fii4gtpiNk6DEebo3ok '
                }
            });
            const rate = response.data[lowerCaseCurrency]?.[toCurrency];
            logger.info(`Fetched price for ${currency} in ${currency}: ${rate}`);

            if (!rate) {
                throw new Error(`No rate found for ${currency} in ${toCurrency}`);
            }

            return rate;
        } catch (error) {
            logger.error(`Error fetching coin price for ${currency} in ${lowerCaseCurrency}: ${error.message}`);
            throw new Error(`Unable to fetch price for ${currency}. Please try again later.`);
        }
    }
}

const applyDynamicPrecision = (value) => {
    const bigValue = new BigNumber(value)

    if(bigValue.isGreaterThanOrEqualTo(1)){
        return bigValue.toFixed(2)
    }

    return bigValue.toFixed(6)
}

const getPortfolio = {
    type: PortFolioType,
    // args: {userId: {type: GraphQLString}},
    resolve: async (parent, args, {req}) => {
        try {
            const {id} = await VerifyAccessTokenInGraphQL(req)
            const wallets = await WalletSchema.findAll({where: {userId: id}})
            if(!wallets){
                throw new Error('No wallet found for the user')
            }

            const portfolio = []
            for (const wallet of wallets) {
                for (const [currency, balance] of Object.entries(wallet.balances)) {
                    const currentPrice = await marketService.getCoinPrice(currency, 'usd')
                    const value = new BigNumber(balance).multipliedBy(currentPrice)
                    portfolio.push({
                        currency,
                        balance: applyDynamicPrecision(balance),
                        rawValue: value
                    })
                }
            }
            const totalValue = portfolio.reduce(
                (acc, asset) => acc.plus(asset.rawValue),
                new BigNumber(0)
            )
            portfolio.forEach((asset) => {
                asset.value = applyDynamicPrecision(asset.rawValue); 
                asset.percentageAllocation = asset.rawValue
                    .dividedBy(totalValue)
                    .multipliedBy(100)
                    .toFixed(asset.rawValue.isLessThan(1) ? 4 : 2)
            })
            return {
                totalValue: applyDynamicPrecision(totalValue),
                assets: portfolio
            }
        } catch (error) {
            throw new Error(`Error fetching portfolio for user ID ${id}: ${error.message}`)
        }
    }
}


const getOrderBook = {
    type: OrderBookType,
    // args: {
    //     crypto: {type: GraphQLString}
    // },
    resolve: async (parent, _ , {req}) => {
        try {
            const buyOrders = await LimitOrder.findAll({
                where: { type: 'buy', status: 'open'},
                order: [['targetPrice', 'DESC']]
            })
            const sellOrders = await LimitOrder.findAll({
                where: { type: 'sell', status: 'open'},
                order: [['targetPrice', 'DESC']]
            })

            return {
                buyOrders,
                sellOrders
            }
        } catch (error) {
            throw new Error(`Error fetching order book: ${error.message}`);
        }
    }
}

const getTradeHistory = {
    type: new GraphQLList(tradeHistoryType),
    // args: {
    //     userId: {type: GraphQLString}
    // },
    resolve: async (parent, args, {req}) => {
        try {
            const {id} = await VerifyAccessTokenInGraphQL(req)
            
            const trades = await TransactionSchema.findAll({
                where: { userId: id},
                order: [['createdAt', 'DESC']]
            })
            
            return trades.map(trade => ({
                tradeId: trade.id,                  // Trade ID
                userId: trade.userId,               // User ID
                walletId: trade.walletId,           // Wallet involved in the trade
                type: trade.type,                   // Buy or Sell
                currency: trade.currency,           // Fiat currency (e.g., USD)
                crypto: trade.crypto,               // Crypto involved (e.g., BTC)
                amount: trade.amount,               // Fiat amount involved
                cryptoAmount: trade.cryptoAmount,   // Crypto amount traded
                // total: trade.total,                 // Total transaction amount (including fees)
                fee: trade.fee,                     // Fee applied to the trade
                status: trade.status,               // Status of the trade (pending, completed, etc.)
                createdAt: trade.createdAt.toISOString() // Timestamp of the trade
            }))
        } catch (error) {
            throw new Error(`Error fetching trade history for user ${id}: ${error.message}`);
        }
    }
} 

const getTradeAnalytics = {
    type: TradeAnalyticsType,
    resolve: async (parent, args, {req}) => {
        try {
            const {id} = await VerifyAccessTokenInGraphQL(req)
            const trades = await TransactionSchema.findAll({
                where: {userId: id},
                order: [['createdAt', 'DESC']]
            })
            let totalProfit = new BigNumber(0)
            let totalVolume = new BigNumber(0)

            trades.forEach(trade => {
                const tradeValue = new BigNumber(trade.amount)
                if( trade.type === 'sell'){
                    totalProfit = totalProfit.plus(tradeValue)
                }
                totalVolume = totalVolume.plus(tradeValue)
            })

            return {
                totalProfit: totalProfit.toString(),
                totalVolume: totalVolume.toString()
            }
        } catch (error) {
            throw new Error(`Error calculating trade analytics for user ${userId}: ${error.message}`);
        }
    }
}




module.exports = {
    getPortfolio,
    getOrderBook,
    getTradeHistory,
    getTradeAnalytics
}