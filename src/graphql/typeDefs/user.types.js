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




module.exports = {
    UserType
}