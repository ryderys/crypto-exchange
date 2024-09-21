 const { GraphQLObjectType, GraphQLString, GraphQLList, GraphQLFloat } = require("graphql");

const TradeType = new GraphQLObjectType({
    name: 'tradeType',
    fields: {
        id: {type: GraphQLString},
        userId: {type: GraphQLString},
        walletId: {type: GraphQLString},
        crypto: {type: GraphQLString},
        amount: {type: GraphQLString},
        type: {type: GraphQLString},
        price: {type: GraphQLString},
        createdAt: {type: GraphQLString},
    }
})

const OrderType = new GraphQLObjectType({
    name: 'orderType',
    fields: {
        id: {type: GraphQLString},
        userId: {type: GraphQLString},
        walletId: {type: GraphQLString},
        crypto: {type: GraphQLString},
        amount: {type: GraphQLString},
        currency: {type: GraphQLString},
        type: {type: GraphQLString},
        orderType: {type: GraphQLString},
        targetPrice: {type: GraphQLString},
        createdAt: {type: GraphQLString},
    }
})

const OrderBookType = new GraphQLObjectType({
    name: 'orderBook',
    fields: {
        buyOrders: {type: new GraphQLList(OrderType)},
        sellOrders: {type: new GraphQLList(OrderType)},
    }
})

const AssetType = new GraphQLObjectType({
    name: 'assetType',
    fields: {
        currency: {type: GraphQLString},
        balance: {type: GraphQLString},
        value: {type: GraphQLString},
        percentageAllocation: {type: GraphQLString},
    }
})
const PortFolioType = new GraphQLObjectType({
    name: 'portfolioType',
    fields: {
        totalValue: {type: GraphQLString},
        assets: {type: new GraphQLList(AssetType)}
    }
})

const TradeAnalyticsType = new GraphQLObjectType({
    name: 'tradeAnalyticsType',
    fields: {
        totalProfit: {type: GraphQLString},
        totalVolume: {type: GraphQLString},
    }
})

const tradeHistoryType = new GraphQLObjectType({
    name: 'tradeHistory',
    fields: {
        tradeId: { type: GraphQLString },            // Unique trade ID
        userId: { type: GraphQLString },             // User ID
        walletId: { type: GraphQLString },           // Wallet ID
        type: { type: GraphQLString },               // Buy or Sell
        currency: { type: GraphQLString },           // Fiat currency (USD, etc.)
        crypto: { type: GraphQLString },             // Crypto involved in the trade (BTC, ETH, etc.)
        amount: { type: GraphQLFloat },              // Amount of fiat currency traded
        cryptoAmount: { type: GraphQLFloat },        // Amount of crypto traded
        // total: { type: GraphQLFloat },              // Total transaction amount
        fee: { type: GraphQLFloat },                 // Transaction fee
        status: { type: GraphQLString },             // Status (pending, completed, failed)
        createdAt: { type: GraphQLString } 
    }
})

module.exports = {
    TradeType,
    OrderType,
    PortFolioType,
    AssetType,
    OrderBookType,
    TradeAnalyticsType,
    tradeHistoryType
}