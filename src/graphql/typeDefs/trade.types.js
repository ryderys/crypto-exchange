const { GraphQLObjectType, GraphQLString } = require("graphql");

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

module.exports = {
    TradeType,
    OrderType
}