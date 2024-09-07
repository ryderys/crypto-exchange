const { GraphQLList, GraphQLString } = require("graphql");
const {UserType, PortFolioType} = require("../typeDefs/user.types");
const UserModel = require("../../REST/modules/user/user.model");

const getUser = {
    type: UserType,
    args: { id: {type: GraphQLString}},
    resolve: async(parent, args) => {
        try {
            const user = await UserModel.findOne({where: {id: args.id}})
            if(!user){
                throw new Error(`User with ID ${args.id} not found`)
            }
            return user            
        } catch (error) {
            throw new Error(`Error fetching user: ${error.message}`);
        }
    }
}

const getPortfolio = {
    type: PortFolioType,
    args: {userId: {type: GraphQLString}},
    resolve: async (parent, args) => {
        try {
            
        } catch (error) {
            throw new Error(`Error fetching portfolio: ${error.message}`)
        }
    }
}

module.exports = {
    getUser
}