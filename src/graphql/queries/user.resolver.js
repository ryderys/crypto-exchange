const { GraphQLList, GraphQLString, GraphQLID } = require("graphql");
const {UserType, PortFolioType} = require("../typeDefs/user.types");
const UserModel = require("../../REST/modules/user/user.model");
const { VerifyAccessTokenInGraphQL } = require("../../common/utils");

const getUser = {
    type: UserType,
    // args: { id: {type: GraphQLID}},
    resolve: async(parent, args, context) => {
        try {
            const {req } = context
            
            if(!req) throw new Error("request object is undefined")
            
             const {id} = await VerifyAccessTokenInGraphQL(req)
             
            
            const result = await UserModel.findOne({where: { id }})
            

            if(!result){
                throw new Error(`User with ID not found`)
            }
            const user = {
                id: result.id,
                username: result.username,
                phoneNumber: result.phoneNumber,
                email: result.email,
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