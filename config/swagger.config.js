const swaggerJsDoc = require("swagger-jsdoc")
const swaggerUi = require("swagger-ui-express")

function SwaggerConfig(app){
    const swaggerDocument = swaggerJsDoc({
        swaggerDefinition: {
            openapi: '3.0.1',
            info: {
                title: 'crypto-exchange',
                version: '1.0.0'
            },
            components: {
                securitySchemes: {
                    bearerAuth: {
                        type: 'http',
                        scheme: 'bearer',
                        bearerFormat: 'JWT'
                    }
                }
            }
        },
        apis: [process.cwd() + "/src/REST/modules/**/*.swagger.js"],
        
    })
    
    const swagger = swaggerUi.setup(swaggerDocument, {explorer: true})
    app.use('/swagger', swaggerUi.serve, swagger)    
}

module.exports = SwaggerConfig