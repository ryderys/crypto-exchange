const { GraphQLObjectType, GraphQLString, GraphQLList } = require("graphql");

const BalanceType = new GraphQLObjectType({
    name: 'balanceType',
    fields: {
        currency: {type: GraphQLString},
        amount: {type: GraphQLString},
    }
})
const WalletType = new GraphQLObjectType({
    name: 'walletType',
    fields: {
        id: {type: GraphQLString},
        walletName: {type: GraphQLString},
        balances: {type: new GraphQLList(BalanceType)},
        // balances: {type: GraphQLString},
    }
})

const WalletTransactionsType = new GraphQLObjectType({
    name: 'walletTransactionsType',
    fields: {
        id: {type: GraphQLString},
        type: {type: GraphQLString},
        sourceWalletId: {type: GraphQLString},
        destinationWalletId: {type: GraphQLString},
        amount: {type: GraphQLString},
        userId: {type: GraphQLString},
        currency: {type: GraphQLString},
        crypto: {type: GraphQLString},
        cryptoAmount: {type: GraphQLString},
        price: {type: GraphQLString},
        fee: {type: GraphQLString},
        status: {type: GraphQLString},
        walletId: {type: GraphQLString},
    }
})

module.exports = {
    WalletType,
    BalanceType,
    WalletTransactionsType
}