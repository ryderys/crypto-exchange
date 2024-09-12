/**
 * @swagger
 * tags:
 *  name: Market
 *  description: market data related endpoints
 */

/**
 * @swagger
 * /market/coins/list:
 *  get:
 *      summary: Get a list of all available coins
 *      tags:
 *          -   Market
 *      parameters:
 *          -   in: query
 *              name: page
 *              schema:
 *                  type: integer
 *                  default: 1
 *              description: the page number to fetch
 *          -   in: query
 *              name: per_page
 *              schema:
 *                  type: integer
 *                  default: 20
 *              description: number of results per page 
 *      responses:
 *          200:
 *              description: A list of all coins
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: array
 *                          items:
 *                              type: object
 *                              properties:
 *                                  id:
 *                                      type: string
 *                                  symbol:
 *                                      type: string
 *                                  name:
 *                                      type: string
 */

/**
 * @swagger
 * /market/coin-market-data:
 *  get:
 *      summary:  Get market data for a specific coin
 *      tags:
 *          -   Market
 *      parameters:
 *          -   in: query
 *              name: coinId
 *              required: true
 *              schema:
 *                  type: string
 *                  description: ID of the coin
 *          -   in: query
 *              name: vsCurrency
 *              schema:
 *                  type: string
 *                  default: usd
 *              description: Currency to compare (e.g., usd, eur)
 *          -   in: query
 *              name: page
 *              schema:
 *                  type: integer
 *                  default: 1
 *              description: the page number to fetch
 *          -   in: query
 *              name: per_page
 *              schema:
 *                  type: integer
 *                  default: 20
 *              description: number of results per page 
 *      responses:
 *          200:
 *              description: Market data for the coin
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          properties:
 *                              id:
 *                                  type: string
 *                              symbol:
 *                                  type: string
 *                              name:
 *                                  type: string
 *                              market_data:
 *                                  type: string
 *                                  description: Market data including price, volume, etc.
 */

/**
 * @swagger
 * /market/coin-historical-data:
 *  get:
 *      summary:  Get historical data for a specific coin
 *      tags:
 *          -   Market
 *      parameters:
 *          -   in: query
 *              name: coinId
 *              required: true
 *              schema:
 *                  type: string
 *                  description: ID of the coin
 *          -   in: query
 *              name: date
 *              schema:
 *                  type: string
 *                  description: Date in the format dd-mm-yyyy (e.g., 30-12-2022)
 *      responses:
 *          200:
 *              description: Historical data for the coin on the specified date
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          properties:
 *                              id:
 *                                  type: string
 *                              symbol:
 *                                  type: string
 *                              name:
 *                                  type: string
 *                              market_data:
 *                                  type: string
 *                                  description: Historical Market data on the specified date
 */

/**
 * @swagger
 * /market/coin/{coinId}:
 *  get:
 *      summary:  Get data for a specific coin by ID
 *      tags:
 *          -   Market
 *      parameters:
 *          -   in: query
 *              name: coinId
 *              required: true
 *              schema:
 *                  type: string
 *                  description: ID of the coin
 *      responses:
 *          200:
 *              description:  Data for the coin
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          properties:
 *                              id:
 *                                  type: string
 *                              symbol:
 *                                  type: string
 *                              name:
 *                                  type: string
 */

/**
 * @swagger
 * /market/trending:
 *  get:
 *      summary:  Get a list of trending coins
 *      tags:
 *          -   Market
 *      parameters:
 *          -   in: query
 *              name: page
 *              schema:
 *                  type: integer
 *                  default: 1
 *              description: the page number to fetch
 *          -   in: query
 *              name: per_page
 *              schema:
 *                  type: integer
 *                  default: 20
 *              description: number of results per page 
 *      responses:
 *          200:
 *              description: A list of trending coins
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          properties:
 *                              id:
 *                                  type: string
 *                              symbol:
 *                                  type: string
 *                              name:
 *                                  type: string
 */
/**
 * @swagger
 * /market/global:
 *  get:
 *      summary:  Get global market data
 *      tags:
 *          -   Market
 *      responses:
 *          200:
 *              description: Global market data
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          properties:
 *                              market_cap_percentage:
 *                                  type: object
 *                              total_market_cap:
 *                                  type: object
 *                              total_volume:
 *                                  type: object
 */
/**
 * @swagger
 * /market/supported-currencies:
 *  get:
 *      summary:  Get supported Currencies
 *      tags:
 *          -   Market
 *      responses:
 *          200:
 *              description: supported Currencies
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: array
 *                          properties:
 *                              currencies:
 *                                  type: string
 */




