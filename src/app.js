const express = require("express");
const {sequelize} = require("../config/sequelize")
const { AllRoutes } = require("./app.routes");
const SwaggerConfig = require("../config/swagger.config");
const { syncModels } = require("./REST/models");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const { expressMiddleware } = require("@apollo/server/express4");
const startApolloServer = require("../config/graphql.config");
module.exports = class Application {
    #app = express();
    #PORT = process.env.PORT;
    #sequelize = sequelize;

    constructor(){
        this.configApplication()
        this.createRoutes()
        this.errorHandling()
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

    configApplication(){
        this.#app.use(express.json());
        this.#app.use(express.urlencoded({extended: true}))
        this.#app.use(cookieParser())
        this.#app.use(cors())
        SwaggerConfig(this.#app)
        
    }

    createRoutes(){
        this.#app.use(AllRoutes)
    }

    async createServer(){
        try {
            await startApolloServer(this.#app)
            this.#app.listen(this.#PORT, () => {
                console.log(`Server is running on port ${this.#PORT}`);
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
            const status = err?.status ?? err?.statusCode ?? err?.code ?? 500;
            res.status(status).json({
            message: err?.message ?? "InternalServerError"
        });
    });
        
    }
}