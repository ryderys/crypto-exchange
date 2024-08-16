const autoBind = require("auto-bind");
const authService = require("./auth.service");

class AuthController {
    #service
    constructor(){
        autoBind(this)
        this.#service = authService
    }
    #sendResponse(res, statusCode, message, data = {}) {
        return res.status(statusCode).json({
            statusCode,
            data: {
                message,
                ...data
            }
        });
    }

    async register(req, res, next){
        try {
            const user = await this.#service.registerUser(req.body)
            return this.#sendResponse(res, 201, 'User registered successfully ', {user})
        } catch (error) {
            next(error)
        }
    }

    async login(req, res, next){
        try {
            const {username, password, otp, rememberMe } = req.body
            const loginResult = await this.#service.authenticateUser(username, password, otp, rememberMe)

            if(loginResult.requires2FA){
                return this.#sendResponse(res, 200, '2FA required', {userId: loginResult.userId})
            }
            const {token, user} = loginResult;

            const cookieOptions = {
                httpOnly: true,

                secure: process.env.NODE_ENV === 'production', //set true in production

                sameSite: 'Strict',

                maxAge: rememberMe ? 7 * 24 * 60 * 60 * 1000 : 1 * 60 * 60 * 1000 // 7 days for Remember Me, 1 hour otherwise
            } 

            res.cookie('token', token, cookieOptions)
            return this.#sendResponse(res, 200, 'Login successful', {token, user})
        } catch (error) {
            next(error)
        }
    }

    async validateOTP(req, res, next){
        try {
            const {userId, otp, rememberMe} = req.body;
            const {token, user} = await this.#service.validateOTP(userId, otp, rememberMe)

            const cookieOptions = {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "Strict",
                maxAge: rememberMe ? 7 * 24 * 60 * 60 * 1000 : 1 * 60 * 60 * 1000, // 7 days for Remember Me, 1 hour otherwise
            };
            res.cookie("token", token, cookieOptions);
            return this.#sendResponse(res, 200, "2FA validated, login successful", { token, user });
        
        } catch (error) {
            next(error)
        }
    }

    async enable2FA(req, res, next){
        try {
            const {otpSecret} = await this.#service.enable2FA(req.user.id)
            return this.#sendResponse(res, 200, '2FA enabled', {otpSecret})
        } catch (error) {
            next(error)
        }
    }

    async generateBackupCodes(req, res, next){
        try {
            const backupCodes = await this.#service.generateBackupCode(req.user.id)
            return this.#sendResponse(res, 200, 'backup Codes generated', {backupCodes})
        } catch (error) {
            next(error)
        }
    }
    async validateBackupCodes(req, res, next){
        try {
            const { code } = req.body
            await this.#service.validateBackupCode(req.user.id, code)
            return this.#sendResponse(res, 200, 'backup Codes validated')
        } catch (error) {
            next(error)
        }
    }

    async logout(req, res, next){
        try {
            res.clearCookie('token', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'Strict'
            })
            return this.#sendResponse(res, 200,'Logout successful' )
        } catch (error) {
            next(error)
        }
    }
}
module.exports = new AuthController()