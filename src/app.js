const express = require("express");
const {sequelize} = require("../config/sequelize")
const { AllRoutes } = require("./app.routes");
const SwaggerConfig = require("../config/swagger.config");
const { syncModels } = require("./REST/models");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const { expressMiddleware } = require("@apollo/server/express4");
const createApolloMiddleware = require("../config/graphql.config");
const { ExternalAPIError, InsufficientBalanceError, ValidationError } = require("./REST/modules/error.handling");
module.exports = class Application {
    #app = express();
    #PORT = process.env.PORT;
    #sequelize = sequelize;

    constructor(){
        this.configApplication()
        // this.errorHandling()
    }
    
    
    async connectToDatabase(){
        try {
            await this.#sequelize.authenticate()
            console.log('Connection to the database successful!');
            
            await syncModels()
            
        } catch (error) {
            console.error('Unable to connect to the database:', error);
            process.exit(1)
        }
    }
    
    async configApplication(){
        this.#app.use(express.json());
        this.#app.use(express.urlencoded({extended: true}))
        this.#app.use(cors({allowedHeaders: true,
            credentials: true
        }))
        SwaggerConfig(this.#app)
        
    }
    
    async createRoutes(){
        try {
            this.#app.use(cookieParser())
            const apolloMiddleware  = await createApolloMiddleware()
            this.#app.use('/graphql', apolloMiddleware)

            this.#app.use(AllRoutes)
        } catch (error) {
            console.error("Error creating routes:", error);
            process.exit(1);
        }
    }
    
    async createServer(){
        try {
            this.createRoutes()

            this.#app.listen(this.#PORT, () => {
                console.log(`🚀 Server is running on http://localhost:${this.#PORT}`);
            });
        } catch (error) {
            console.error("Failed to start the server", error);
        }
    }
    
    
    
    
    errorHandling(){
        this.#app.use((req, res, next) => {
            res.status(404).json({
                message: "Not Found Route"
            })
        })

        this.#app.use((err, req, res, next) => {
            logger.error(`Error: ${err.message}`);

            if (err instanceof ValidationError) {
                return res.status(400).json({ error: err.message });
            } else if (err instanceof InsufficientBalanceError) {
                return res.status(403).json({ error: err.message });
            } else if (err instanceof ExternalAPIError) {
                return res.status(502).json({ error: `External service error: ${err.message}` });
            } else {
                return res.status(500).json({ error: 'An unexpected error occurred' });
            }
    });
        
    }
}