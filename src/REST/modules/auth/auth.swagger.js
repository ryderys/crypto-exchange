/**
 * @swagger
 * tags:
 *  name: Authentication
 *  description: Auth routes
 */


/**
 * @swagger
 *  components:
 *      securitySchemes:
 *          bearerAuth:
 *              type: http
 *              scheme: bearer
 *              bearerFormat: JWT
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
 *                      description: The user's email address.
 *                  phoneNumber:
 *                      type: string
 *                      description: The user's phone number.
 *                  is2FAEnabled:
 *                      type: boolean
 *                      description: Whether 2FA is enabled for the user
 *                  backupCodes:
 *                      type: array
 *                      items:
 *                          type: string
 *                  createdAt:
 *                      type: string
 *                      format: date-time   
 *                  updatedAt:
 *                      type: string
 *                      format: date-time   
 *          RegisterRequest:
 *              type: object
 *              required:   
 *                  -   username
 *                  -   password
 *                  -   phoneNumber
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
 *                  phoneNumber:
 *                      type: string
 *                      description:  the user`s mobile
 *          LoginRequest:
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
 *          LoginResponse:
 *              type: object
 *              properties:
 *                  token:  
 *                      type: string
 *                  user:
 *                      $ref: '#/components/schemas/User'
 *          BackupCodeRequest:
 *              type: object
 *              required: 
 *                  -   code
 *              properties:
 *                  code:
 *                      type: string
 *                      description: "Backup code for 2FA"
 *                  rememberMe:
 *                      type: boolean
 *                      description: 'Optional, to extend the session if backup code is used'
 *      responses:
 *          UnauthorizedError:
 *              description: 'JWT token is missing or invalid'
 *          BadRequestError:
 *              description: 'Invalid input or request data'
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
 *                      $ref: '#/components/schemas/RegisterRequest'
 *              application/json:
 *                  schema:
 *                      $ref: '#/components/schemas/RegisterRequest'
 *      responses:
 *          201:
 *              description: User registered successfully
 *          400:
 *              $ref: '#/components/responses/BadRequestError'
 *                   
 */

// /**
//  * @swagger
//  * /auth/validate-otp:
//  *  post:
//  *      summary: Validate OTP for Two-Factor Authentication
//  *      tags:
//  *          -  Authentication
//  *      requestBody:
//  *          required: true
//  *          content:
//  *              application/x-www-form-urlencoded:
//  *                  schema:
//  *                      $ref: '#/components/schemas/Validate-OTP'
//  *              application/json:
//  *                  schema:
//  *                      $ref: '#/components/schemas/Validate-OTP'
//  *      responses:
//  *          201:
//  *              description: OTP successfully validated, login successful.
//  *          400:
//  *              description:  Invalid OTP or OTP expired.
//  *              content:
//  *                  application/json:
//  *                      schema:
//  *                          $ref: '#/components/schemas/Error'
//  *                   
//  */

/**
 * @swagger
 * /auth/login:
 *  post:
 *      summary: Login with username, password, and optional OTP
 *      tags:
 *          -  Authentication
 *      requestBody:
 *          required: true
 *          content:
 *              application/x-www-form-urlencoded:
 *                  schema:
 *                      $ref: '#/components/schemas/LoginRequest'
 *              application/json:
 *                  schema:
 *                      $ref: '#/components/schemas/LoginRequest'
 *      responses:
 *          200:
 *              description: successful login
 *              content:
 *                  application/json:
 *                      schema:
 *                          $ref: '#/components/schemas/LoginResponse'                    
 *          401:
 *              $ref: '#/components/responses/UnauthorizedError' 
 *          400:
 *              $ref: '#/components/responses/BadRequestError' 
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
 *          401:
 *              $ref: '#/components/responses/UnauthorizedError'
 *                   
 */

/**
 * @swagger
 * /auth/backup-codes:
 *  post:
 *      summary: Generate backup codes for 2FA
 *      tags:
 *          -  Authentication
 *      security:
 *          -   bearerAuth: []
 *      responses:
 *          200:
 *              description: New backup codes generated successfully. The user must store these codes securely.
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          properties:
 *                              backupCodes:
 *                                  type: array
 *                                  items:
 *                                      type: string
 *          401:
 *              $ref: '#/components/responses/UnauthorizedError'
 *                   
 */

/**
 * @swagger
 * /auth/validate-backup-code:
 *  post:
 *      summary: Validate a backup code for 2FA
 *      tags:
 *          -  Authentication
 *      security:
 *          -   bearerAuth: []
 *      requestBody:
 *          required: true
 *          content:
 *              application/x-www-form-urlencoded:
 *                  schema:
 *                      $ref: '#/components/responses/BackupCodeRequest'
 *              application/json:
 *                  schema:
 *                      $ref: '#/components/responses/BackupCodeRequest'
 *      responses:
 *          200:
 *              description: Backup code validated successfully
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          properties:
 *                              token:
 *                                  type: string
 *                              remainBackupCodes:
 *                                  type: integer
 *                                  description: Number of backup codes remaining
 *          401:
 *              $ref: '#/components/responses/UnauthorizedError'
 *          400:
 *              $ref: '#/components/responses/BadRequestError'
 *                   
 */

/**
 * @swagger
 * /auth/reset-password-request:
 *  post:
 *      summary: Request a password reset by phone number
 *      description: Sends a password reset OTP to the user's phone number.
 *      tags:
 *          -   Authentication
 *      requestBody:
 *          required: true
 *          content:
 *              application/x-www-form-urlencoded:
 *                  schema:
 *                      type: object
 *                      properties:
 *                          phoneNumber:
 *                              type: string
 *                              description: the user's phoneNumber
 *              application/json:
 *                  schema:
 *                      type: object
 *                      properties:
 *                          phoneNumber:
 *                              type: string
 *                              description: the user's phoneNumber
 *      responses:
 *          200:
 *              description: Password reset OTP sent to the phone number.
 *          400:
 *              $ref: '#/components/responses/BadRequestError'
 */

/**
 * @swagger
 * /auth/reset-password:
 *  post:
 *      summary: password reset via OTP
 *      description: Resets the user's password using a valid OTP.
 *      tags:
 *          -   Authentication
 *      requestBody:
 *          required: true
 *          content:
 *              application/x-www-form-urlencoded:
 *                  schema:
 *                      type: object
 *                      properties:
 *                          phoneNumber:
 *                              type: string
 *                              description: the user's phoneNumber
 *                          otp:
 *                              type: string
 *                          newPassword:
 *                              type: string
 *                              description: The new password to set.
 *              application/json:
 *                  schema:
 *                      type: object
 *                      properties:
 *                          phoneNumber:
 *                              type: string
 *                              description: the user's phoneNumber
 *                          otp:
 *                              type: string
 *                          newPassword:
 *                              type: string
 *                              description: The new password to set.
 *      responses:
 *          200:
 *              description: Password reset successful.
 *          400:
 *              $ref: '#/components/responses/BadRequestError'
 */

/**
 * @swagger
 * /auth/logout:
 *  post:
 *      summary: Logout the user
 *      tags:
 *          -   Authentication
 *      security:
 *          -   bearerAuth: []
 *      responses:
 *          200:
 *              description: User logged out successfully
 */