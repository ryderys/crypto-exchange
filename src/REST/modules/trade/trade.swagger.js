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
 *                  -   walletId
 *                  -   crypto
 *                  -   currency
 *                  -   amount
 *              properties:
 *                  walletId:
 *                      type: string
 *                      description: the id of the wallet
 *                  crypto:
 *                      type: string
 *                      description: the id of the crypto
 *                  currency:
 *                      type: string
 *                      description: the name of the currency
 *                  amount:
 *                      type: string
 *                      description: the amount 
 */

/**
 * @swagger
 * /trade/buy-crypto:
 *  post:
 *      summary: buying crypt
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
 *              description: buy order crated successfully
 *          400:
 *              description: invalid input
 *      
 */

/**
 * @swagger
 * /trade/sell-crypto:
 *  post:
 *      summary: selling crypt
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
 *              description: buy order crated successfully
 *          400:
 *              description: invalid input
 *      
 */