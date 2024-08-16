const {Sequelize} = require("sequelize")
const config = require("./db.config")

const env = process.env.NODE_ENV || 'development';
const sequelizeConfig = config[env] 

const sequelize = new Sequelize(sequelizeConfig.url,{
    dialect: sequelizeConfig.dialect,
    logging: sequelizeConfig.logging
})

module.exports = {sequelize}
