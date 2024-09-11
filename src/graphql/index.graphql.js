const {GraphQLObjectType, GraphQLSchema} = require("graphql")
const { getUser } = require("./queries/user.resolver")
const { getPortfolio } = require("./queries/trade.resolver")
const RootQuery = new GraphQLObjectType({
    name: 'RootQuery',
    fields: {
        user : getUser,
        portfolio: getPortfolio
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
