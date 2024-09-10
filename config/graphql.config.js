const { ApolloServer} = require("@apollo/server")
const { ApolloServerPluginDrainHttpServer} = require("apollo-server-core")
const { graphQLSchema } = require("../src/graphql/index.graphql")
const http = require("http")
const { expressMiddleware } = require("@apollo/server/express4")
const jwt = require("jsonwebtoken")

const secretKey = process.env.JWT_SECRET

// async function startApolloServer(app) {
//   const httpServer = http.createServer(app) 
  
//   const server = new ApolloServer({
//     schema: graphQLSchema,
//     plugins: [ApolloServerPluginDrainHttpServer({ httpServer })]
//   })
  
//   try {
//     await server.start();
//     console.log('Apollo Server is ready and integrated with Express');
    
//     app.use('/graphql', expressMiddleware(server, {
//       context: async ({ req }) => ({ token: req.headers.token }),
//     }))

//         return httpServer
//       } catch (error) {
//         console.error('Error starting Apollo Server:', error);
//         // Handle error properly, e.g., exit the process or restart the server
//       }
// }


async function createApolloMiddleware() {
  const server = new ApolloServer({
    schema: graphQLSchema,
    // context: async ({ req }) => {
    //   // Ensure req is defined
    //   if (!req) {
    //     throw new Error("Request object is undefined");
    //   }

    //   // Extract token from headers or cookies
    //   const token = req.cookies?.token 
      
    //   // Optionally verify the token
    //   let user = null;
    //   if (token) {
    //     try {
    //       const decoded = jwt.verify(token, secretKey);
    //       user = decoded; // or find user in database
    //       console.log(user);
          
    //     } catch (error) {
    //       throw new Error("Invalid or expired token");
    //     }
    //   }


      
    //   return { token, req, user };
    // },
  });
      

  await server.start();

  // Return Apollo middleware to be used in Express
  return expressMiddleware(server, {
    
    context: async ({req}) =>  { 
      return {
        req
      }
    }
  });

}

module.exports = createApolloMiddleware