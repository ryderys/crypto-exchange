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
            const {username, password, rememberMe, otp } = req.body
            const loginResult = await this.#service.authenticateUser(username, password,otp, rememberMe)

            if(loginResult.requires2FA){
                return this.#sendResponse(res, 200, '2FA required', {userId: loginResult.userId, otp: loginResult.otp})
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

    // async validateOTP(req, res, next){
    //     try {
    //         const {userId, otp, rememberMe} = req.body;
    //         const {token, user} = await this.#service.validateOTP(userId, otp, rememberMe)

    //         const cookieOptions = {
    //             httpOnly: true,
    //             secure: process.env.NODE_ENV === "production",
    //             sameSite: "Strict",
    //             maxAge: rememberMe ? 7 * 24 * 60 * 60 * 1000 : 1 * 60 * 60 * 1000, // 7 days for Remember Me, 1 hour otherwise
    //         };
    //         res.cookie("token", token, cookieOptions);
    //         return this.#sendResponse(res, 200, "2FA validated, login successful", { token, user });
        
    //     } catch (error) {
    //         next(error)
    //     }
    // }

    async enable2FA(req, res, next){
        try {
            const userId = req.user.id;
            await this.#service.enable2FA(userId)
            return this.#sendResponse(res, 200, '2FA enabled')
        } catch (error) {
            next(error)
        }
    }

    async generateBackupCodes(req, res, next){
        try {
            const backupCodes = await this.#service.generateBackupCode(req.user.id)
            return this.#sendResponse(res, 200, 'New backup codes generated. Please store them securely.', {backupCodes})
        } catch (error) {
            next(error)
        }
    }
    async validateBackupCodes(req, res, next){
        try {
            const { code , rememberMe } = req.body
            const {token, user} = await this.#service.validateBackupCode(req.user.id, code, rememberMe)
            const cookieOptions = {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "Strict",
                maxAge: rememberMe ? 7 * 24 * 60 * 60 * 1000 : 1 * 60 * 60 * 1000, // 7 days for Remember Me, 1 hour otherwise
            };
            res.cookie("token", token, cookieOptions);
                return this.#sendResponse(res, 200, 'Backup code validated, login successful', {token, user})
        } catch (error) {
            next(error)
        }
    }

    async requestPasswordReset(req, res, next){
        try {
            const {phoneNumber} = req.body;
            const {otp, user} = await this.#service.initiatePasswordReset(phoneNumber)
            return this.#sendResponse(res, 200, "Password reset OTP sent to the phone number.", {otp, phoneNumber, user})
        } catch (error) {
            next(error)
        }
    }

    async resetPassword(req, res, next){
        try {
            const {phoneNumber, otp, newPassword} = req.body;
            await this.#service.validateOtpAndResetPassword(phoneNumber, otp, newPassword)
            return this.#sendResponse(res, 200, 'password reset successful')
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