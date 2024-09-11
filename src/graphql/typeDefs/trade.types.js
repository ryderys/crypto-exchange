const { GraphQLObjectType, GraphQLString, GraphQLList } = require("graphql");

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

module.exports = {
    TradeType,
    OrderType,
    PortFolioType,
    AssetType
}