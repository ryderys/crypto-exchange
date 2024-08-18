const router = require('express').Router()
const authenticate = require('../../../common/auth.guard')
const authController = require("./auth.controller")

const rateLimit = require("express-rate-limit")

const rateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, //15m
    max: 5, //each ip to 5 request per windowMs
    message: 'Too many attempts, please try again later'
})


//public routes
router.post('/register', authController.register)
router.post('/login', rateLimiter, authController.login)

// router.post('/validate-otp', authController.validateOTP)

//protected routes

router.post('/enable-2fa',authenticate, authController.enable2FA)
router.post('/backup-codes', rateLimiter, authenticate, authController.generateBackupCodes)
router.post('/validate-backup-code', rateLimiter, authenticate, authController.validateBackupCodes)

router.post('/reset-password-request', authController.requestPasswordReset)
router.post('/reset-password', authController.resetPassword)

router.post('/logout', authenticate, authController.logout)

module.exports = {
    authRouter : router
}