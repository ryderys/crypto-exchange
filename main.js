require("dotenv").config()
const Application = require('./src/app')
const {sequelize} = require("./config/sequelize")


const PORT = process.env.PORT || 3000;

const app = new Application(PORT, sequelize)

async function startApp () {
    try {
        await app.connectToDatabase()
        app.createServer()
    } catch (error) {
        console.error("Failed to initialize models or start the server:", error);
        process.exit(1);
    }
};
startApp()
