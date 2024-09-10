const { GraphQLObjectType, GraphQLString, GraphQLList, GraphQLID } = require("graphql");
const { WalletType } = require("./wallet.types");

const UserType = new GraphQLObjectType({
    name: 'userType',
    fields: {
        id: {type: GraphQLID},
        username: {type: GraphQLString},
        phoneNumber: {type: GraphQLString},
        email: {type: GraphQLString},
        wallets: {type: new GraphQLList(WalletType)},

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
    UserType,
    PortFolioType,
    AssetType
}