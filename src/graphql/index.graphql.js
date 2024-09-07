const {GraphQLObjectType, GraphQLSchema} = require("graphql")
const { getUser } = require("./queries/user.resolver")
const RootQuery = new GraphQLObjectType({
    name: 'RootQuery',
    fields: {
        user : getUser
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
