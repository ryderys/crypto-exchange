const router = require('express').Router()
const authenticate = require('../../../common/auth.guard')
const authController = require("./auth.controller")

const rateLimit = require("express-rate-limit")

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, //15m
    max: 5, //each ip to 5 request per windowMs
    message: 'Too many login attempts, please try again later'
})


//public routes
router.post('/register', authController.register)
router.post('/login', loginLimiter, authController.login)


//protected routes

router.post('/enable-2fa',authenticate, authController.enable2FA)
router.post('/backup-codes', authenticate, authController.generateBackupCodes)
router.post('/validate-backup-code',authenticate, authController.validateBackupCodes)

router.post('/logout', authController.logout)

module.exports = {
    authRouter : router
}