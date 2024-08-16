/**
 * @swagger
 * tags:
 *  name: Authentication
 *  description: Auth routes
 */

/**
 * @swagger
 *  components:
 *      schemas:
 *          User:
 *              type: object
 *              properties:
 *                  id:
 *                      type: string
 *                      description: The auto-generated ID of the user
 *                  username:
 *                      type: string
 *                      description: the user`s username
 *                  email:
 *                      type: string
 *                  is2FAEnabled:
 *                      type: boolean
 *                      description: Whether 2FA is enabled for the user
 *                  createdAt:
 *                      type: string
 *                      format: date-time   
 *                  updatedAt:
 *                      type: string
 *                      format: date-time   
 *          Register:
 *              type: object
 *              required:   
 *                  -   username
 *                  -   password
 *              properties:
 *                  username:
 *                      type: string
 *                      description: the user`s username
 *                  password:
 *                      type: string
 *                      description: the user`s password  
 *                  email:
 *                      type: string
 *                      description:  the user`s email
 *          login:
 *              type: object
 *              required:   
 *                  -   username
 *                  -   password
 *              properties:
 *                  username:
 *                      type: string
 *                      description: the user`s username
 *                  password:
 *                      type: string
 *                      description: the user`s password  
 *                  otp:
 *                      type: string
 *                      description:  One-time password, required if 2FA is enabled.
 *                  rememberMe:
 *                      type: boolean
 *                      description:   Whether to keep the user logged in for 7 days.
 */

/**
 * @swagger
 * /auth/register:
 *  post:
 *      summary: Register a new user
 *      tags:
 *          -  Authentication
 *      requestBody:
 *          required: true
 *          content:
 *              application/x-www-form-urlencoded:
 *                  schema:
 *                      $ref: '#/components/schemas/Register'
 *              application/json:
 *                  schema:
 *                      $ref: '#/components/schemas/Register'
 *      responses:
 *          201:
 *              description: User registered successfully
 *          400:
 *              description: Bad request
 *                   
 */

/**
 * @swagger
 * /auth/login:
 *  post:
 *      summary: Authenticate user with password and optional OTP
 *      tags:
 *          -  Authentication
 *      requestBody:
 *          required: true
 *          content:
 *              application/x-www-form-urlencoded:
 *                  schema:
 *                      $ref: '#/components/schemas/Register'
 *              application/json:
 *                  schema:
 *                      $ref: '#/components/schemas/Register'
 *      responses:
 *          200:
 *              description: successful login
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          properties:
 *                              token:
 *                                  type: string
 *                              user: 
 *                                  #ref: '#/components/schemas/User'
 *          401:
 *              description: Unauthorized - invalid credentials or OTP required
 *          500:
 *              description: Server error
 *                   
 */

/**
 * @swagger
 * /auth/enable-2fa:
 *  post:
 *      summary: Authenticate user with password and optional OTP
 *      tags:
 *          -  Authentication
 *      security:
 *          -   bearerAuth: []
 *      responses:
 *          200:
 *              description: 2FA enabled
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          properties:
 *                              otpSecret:
 *                                  type: string
 *                                  description: The OTP secret to be used with the authenticator app.
 *          401:
 *              description: Unauthorized - invalid credentials or OTP required
 *          500:
 *              description: Server error
 *                   
 */