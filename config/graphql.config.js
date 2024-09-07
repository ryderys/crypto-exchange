const { ApolloServer} = require("apollo-server-express")
const { ApolloServerPluginDrainHttpServer} = require("apollo-server-core")
const { graphQLSchema } = require("../src/graphql/index.graphql")
const http = require("http")

async function startApolloServer(app) {
    const httpServer = http.createServer(app)

    const server = new ApolloServer({
        schema: graphQLSchema,
        plugins: [ApolloServerPluginDrainHttpServer({ httpServer })]
    })
    await server.start()

    app.use('/graphql',
        expressMiddleware(server, {
            context: async ({ req }) => ({ token: req.headers.token }),
        })
    )
    
    const port = 4000; // Define your port here
    const url = `http://localhost:${port}/graphql`;
  
    httpServer.listen(port, () => {
        console.log(`🚀 Server ready at ${url}`);
    });
}

module.exports = startApolloServer