/**
 * @swagger
 * tags:
 *  name: Trading
 *  description: Trading related endpoints
 */

/**
 * @swagger
 *  components:
 *      schemas:
 *          Trade:
 *              type: object
 *              required:
 *                  -   crypto
 *                  -   amount
 *                  -   currency
 *                  -   type
 *                  -   orderType
 *              properties:
 *                  walletId:
 *                      type: string
 *                      description: the id of the wallet
 *                  crypto:
 *                      type: string
 *                      description: the id of the crypto, ref to market/coins/list
 *                  amount:
 *                      type: string
 *                      description: the amount 
 *                  currency:
 *                      type: string
 *                      description: the name of the currency
 *                  type:
 *                      type: string
 *                      description: the type of order
 *                      enum:
 *                          -   buy
 *                          -   sell
 *                  orderType:
 *                      type: string
 *                      description: the order type
 *                      enum:
 *                          -   market
 *                          -   limit
 *                          -   stop
 *                  targetPrice:
 *                      type: string
 *                      description: the order type
 */

/**
 * @swagger
 * /trade/order:
 *  post:
 *      summary: setting order
 *      tags:
 *          -   Trading
 *      requestBody:
 *          required: true
 *          content:
 *              application/x-www-form-urlencoded:
 *                  schema:
 *                      $ref: '#/components/schemas/Trade'
 *              application/json:
 *                  schema:
 *                      $ref: '#/components/schemas/Trade'
 *      responses:
 *          201:
 *              description: order crated successfully
 *          400:
 *              description: invalid input
 *      
 */

/**
 * @swagger
 * /trade/orderbook:
 *  get:
 *      summary: orderbook of a user
 *      tags:
 *          -   Trading
 *      parameters:
 *          -   in: query
 *              name: crypto
 *              required: true
 *              type: string
 *              description: the crypto name
 *      responses:
 *          201:
 *              description: order book fetched successfully 
 *          400:
 *              description: invalid input
 *      
 */

/**
 * @swagger
 * /trade/history:
 *  get:
 *      summary: trade history of user
 *      tags:
 *          -   Trading
 *      responses:
 *          201:
 *              description: trade history of user fetched successfully
 *          400:
 *              description: invalid input
 *      
 */

/**
 * @swagger
 * /trade/analytics:
 *  get:
 *      summary: trade analytics of user
 *      tags:
 *          -   Trading
 *      responses:
 *          201:
 *              description: trade analytics of user fetched successfully
 *          400:
 *              description: invalid input
 *      
 */

/**
 * @swagger
 * /trade/portfolio:
 *  get:
 *      summary: portfolio of user
 *      tags:
 *          -   Trading
 *      responses:
 *          201:
 *              description: portfolio of user fetched successfully
 *          400:
 *              description: invalid input
 *      
 */