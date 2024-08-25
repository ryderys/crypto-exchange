/**
 * @swagger
 * tags:
 *  name: Wallet
 *  description: wallet related endpoints
 */

/**
 * @swagger
 *  components:
 *      schemas:
 *          CreateWallet:
 *              type: object
 *              required:
 *                  -   password
 *                  -   currency
 *              properties:
 *                  currency:
 *                      type: string
 *                      description: The currency for storing on the wallet 
 *                      enum:
 *                          -   USD
 *                          -   EURO
 *                          -   POUND
 *                  password:
 *                      type: string
 *                      description: Password to protect the wallet
 *                  walletName:
 *                      type: string
 *                      description: the name of the wallet
 *          Deposit:
 *              type: object
 *              required:
 *                  -   currency
 *                  -   amount
 *                  -   walletId
 *              properties:
 *                  currency:
 *                      type: string
 *                      description: The currency for storing on the wallet 
 *                      enum:
 *                          -   USD
 *                          -   EURO
 *                          -   POUND
 *                  amount:
 *                      type: number
 *                      description: the amount of deposit
 *                  walletId:
 *                      type: string
 *                      description: the id of the wallet
 *                  preferredCurrency:
 *                      type: string
 *                      description: Preferred currency to convert the deposit to (optional)
 *          withdraw:
 *              type: object
 *              required:
 *                  -   currency
 *                  -   amount
 *                  -   walletId
 *              properties:
 *                  currency:
 *                      type: string
 *                      description: The currency of the wallet (e.g., 'bitcoin')
 *                  amount:
 *                      type: number
 *                      description: the amount of deposit
 *                  walletId:
 *                      type: string
 *                      description: the id of the wallet
 *                  preferredCurrency:
 *                      type: string
 *                      description: Preferred currency to convert the withdrawal  to (optional)
 *              
 *          Transfer:
 *              type: object
 *              required:
 *                  -   senderWalletId
 *                  -   recipientWalletId
 *                  -   amount
 *                  -   password
 *              properties:
 *                  senderWalletId:
 *                      type: string
 *                      description: the wallet ID
 *                  recipientWalletId:
 *                      type: string
 *                      description: the wallet ID
 *                  amount:
 *                      type: string
 *                      description: the amount of deposit
 *                  password:
 *                      type: string
 *                      description: Wallet password to authorize the withdrawal
 *          Convert:
 *              type: object
 *              required:
 *                  -   fromCurrency
 *                  -   toCurrency
 *                  -   amount
 *              properties:
 *                  fromCurrency:
 *                      type: string
 *                      description: the original currency
 *                  toCurrency:
 *                      type: string
 *                      description: the target currency
 *                  amount:
 *                      type: string
 *                      description: the amount to convert
 *          Lock-Unlock:
 *              type: object
 *              required:
 *                  -   walletId
 *              properties:
 *                  walletId:
 *                      type: string
 *                      description: the wallet ID
 *              
 */

/**
 * @swagger
 * /wallet/create:
 *  post:
 *      summary: Create a new wallet for the user
 *      tags:
 *          -   Wallet
 *      requestBody:
 *          required: true
 *          content:
 *              application/x-www-form-urlencoded:
 *                  schema:
 *                      $ref: '#/components/schemas/CreateWallet'
 *              application/json:
 *                  schema:
 *                      $ref: '#/components/schemas/CreateWallet'
 *      responses:
 *          201:
 *              description: Wallet created successfully
 *          400:
 *              description: Invalid input or wallet already exists
 *              
 */

/**
 * @swagger
 * /wallet/myWallet:
 *  get:
 *      summary: Get all wallets for a user
 *      tags:
 *          -   Wallet
 *      responses:
 *          200:
 *              description: Wallets fetched successfully
 *          400:
 *              description: User not found or no wallets found for the user
 *              
 */

/**
 * @swagger
 * /wallet/deposit:
 *  post:
 *      summary: Deposit funds into a wallet
 *      tags:
 *          -   Wallet
 *      requestBody:
 *          required: true
 *          content:
 *              application/x-www-form-urlencoded:
 *                  schema:
 *                      $ref: '#/components/schemas/Deposit'
 *              application/json:
 *                  schema:
 *                      $ref: '#/components/schemas/Deposit'
 *      responses:
 *          200:
 *              description: funds deposited successfully
 *          404:
 *              description: wallet not found
 *          400:    
 *              description: Invalid deposit amount
 *              
 */

/**
 * @swagger
 * /wallet/withdraw:
 *  post:
 *      summary:  Withdraw funds from a wallet
 *      tags:
 *          -   Wallet
 *      requestBody:
 *          required: true
 *          content:
 *              application/x-www-form-urlencoded:
 *                  schema:
 *                      $ref: '#/components/schemas/Withdraw'
 *              application/json:
 *                  schema:
 *                      $ref: '#/components/schemas/Withdraw'
 *      responses:
 *          200:
 *              description: Funds withdrawn successfully
 *          400:    
 *              description: Invalid input or insufficient balance
 *              
 */

/**
 * @swagger
 * /wallet/transfer:
 *  post:
 *      summary: Transfer funds from one wallet to another
 *      tags:
 *          -   Wallet
 *      requestBody:
 *          required: true
 *          content:
 *              application/x-www-form-urlencoded:
 *                  schema:
 *                      $ref: '#/components/schemas/Transfer'
 *              application/json:
 *                  schema:
 *                      $ref: '#/components/schemas/Transfer'
 *      responses:
 *          200:
 *              description: Funds transferred successfully
 *          404:
 *              description: Wallet not found
 *          400:    
 *              description: Invalid input or insufficient balance
 *              
 */

/**
 * @swagger
 * /wallet/convert:
 *  post:
 *      summary: convert funds from one currency to another
 *      tags:
 *          -   Wallet
 *      requestBody:
 *          required: true
 *          content:
 *              application/x-www-form-urlencoded:
 *                  schema:
 *                      $ref: '#/components/schemas/Convert'
 *              application/json:
 *                  schema:
 *                      $ref: '#/components/schemas/Convert'
 *      responses:
 *          200:
 *              description: Funds converted successfully
 *          404:
 *              description: Wallet not found
 *          400:    
 *              description: Invalid input or insufficient balance
 *              
 */

/**
 * @swagger
 * /wallet/transactions/{walletId}:
 *  get:
 *      summary: Get transaction history for a wallet
 *      tags:
 *          -   Wallet
 *      parameters:
 *          -   in: path
 *              name: walletId
 *              required: true
 *              schema:
 *                  type: string
 *              description: the wallet ID
 *      responses:
 *          200:
 *              description: Transaction history fetched successfully
 *          404:
 *              description: Wallet not found
 *              
 */

/**
 * @swagger
 * /wallet/balance/{walletId}:
 *  get:
 *      summary: Check the balance of a wallet
 *      tags:
 *          -   Wallet
 *      parameters:
 *          -   in: path
 *              name: walletId
 *              required: true
 *              schema:
 *                  type: string
 *              description: the wallet ID
 *      responses:
 *          200:
 *              description: Wallet balance fetched successfully
 *          404:
 *              description: Wallet not found
 *              
 */

/**
 * @swagger
 * /wallet/lock:
 *  post:
 *      summary: Lock a wallet to prevent transactions
 *      tags:
 *          -   Wallet  
 *      requestBody:
 *          required: true
 *          content:
 *              application/x-www-form-urlencoded:
 *                  schema:
 *                      $ref: '#/components/schemas/Lock-Unlock'
 *              application/json:
 *                  schema:
 *                      $ref: '#/components/schemas/Lock-Unlock'
 *      responses:
 *          200:
 *              description: Wallet locked successfully
 *          404:
 *              description: Wallet not found
 *              
 */

/**
 * @swagger
 * /wallet/unlock:
 *  post:
 *      summary: Unlock a wallet to allow transactions
 *      tags:
 *          -   Wallet  
 *      requestBody:
 *          required: true
 *          content:
 *              application/x-www-form-urlencoded:
 *                  schema:
 *                      $ref: '#/components/schemas/Lock-Unlock'
 *              application/json:
 *                  schema:
 *                      $ref: '#/components/schemas/Lock-Unlock'
 *      responses:
 *          200:
 *              description: Wallet locked successfully
 *          404:
 *              description: Wallet not found
 *              
 */

