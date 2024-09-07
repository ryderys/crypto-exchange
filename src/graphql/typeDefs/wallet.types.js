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
        balances: {type: GraphQLString},
    }
})

module.exports = {
    WalletType,
    BalanceType
}