const {GraphQLObjectType, GraphQLSchema} = require("graphql")
const { getUser } = require("./queries/user.resolver")
const { getPortfolio, getOrderBook, getTradeHistory, getTradeAnalytics } = require("./queries/trade.resolver")
const { getWallets, getWalletTransactions } = require("./queries/wallet.resolver")
const RootQuery = new GraphQLObjectType({
    name: 'RootQuery',
    fields: {
        user : getUser,
        portfolio: getPortfolio,
        orderbook: getOrderBook,
        tradeHistory: getTradeHistory,
        tradingAnalytics: getTradeAnalytics,
        getWallets: getWallets,
        getWalletTransactions: getWalletTransactions
    }
})

// const RootMutation = new GraphQLObjectType({
//     name: 'Mutation',
//     fields: {
        
//     }
// })

const graphQLSchema = new GraphQLSchema({
    query: RootQuery,
    // mutation: RootMutation
}) 

module.exports = {
    graphQLSchema
}
