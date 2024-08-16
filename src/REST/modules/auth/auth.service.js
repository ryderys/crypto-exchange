const autoBind = require("auto-bind");
const bcrypt = require("bcrypt")
const { totp,authenticator } = require("otplib")
const crypto = require("crypto")
const jwt = require("jsonwebtoken")
const User = require("../user/user.model")
const {logger} = require("../../../common/utils")


const saltRounds = process.env.SALT_ROUNDS || 10;
const secretKey = process.env.JWT_SECRET
const maxFailedAttempts = process.env.MAX_FAILED_ATTEMPTS || 3;
const lockoutTime = process.env.LOCKOUT_TIME || 30 * 60 * 1000; //30 minutes


class AuthService {
    #model
    constructor(){
        autoBind(this)
        this.#model = User
    }

    async #findUserById(userId){
        const user = await this.#model.findByPk(userId)
        if(!user) throw new Error('User not found')
        return user
    }

    async registerUser(userData){
        //Register a new user with hashed password

        if(!this.#validatePassword(userData.password)){
                throw new Error('Password must be at least 8 characters long, include an uppercase letter, a lowercase letter, a number, and a special character.')
        }

        const hashedPassword = await bcrypt.hash(userData.password, saltRounds)
        const user = await this.#model.create({
            ...userData,
            password: hashedPassword
        })
        return user
    }

    // Authenticate user with password and (otp if enabled)
    async authenticateUser(username, password, rememberMe){
        const user = await this.#model.findOne({where: {username}})
        if(!user) throw new Error('User not found')

        // Check if account is locked and if the lockout period has expired
        if (user.isLocked && user.lockedUntil > new Date()) {
            throw new Error(`Account is locked until ${user.lockedUntil}`);
        } else if (user.isLocked && user.lockedUntil <= new Date()) {
            // Automatically unlock account if lockout period has passed
            await this.resetFailedAttempts(user);
        }
        
        const isPasswordValid = await bcrypt.compare(password, user.password)
        if(!isPasswordValid) {
            await this.handleFailedLoginAttempt(user)
            throw new Error('invalid password')
        }

        await this.resetFailedAttempts(user)

        logger.info(`User ${user.username} successfully logged in`);
        
        // If 2FA is enabled, return an indication that OTP is required
        if(user.is2FAEnabled){
            return {requires2FA: true, userId: user.id}
        }

        const token = this.#generateJWT(user, rememberMe)
        return { token, user}
    }

    async validateOTP(userId, otp, rememberMe){
        const user = await this.#findUserById(userId)

        if(!user.is2FAEnabled){
            throw new Error('2FA is not enabled for this user')
        }

        const isOTPValid = totp.check(otp, user.otpSecret) 
        if(!isOTPValid){
            throw new Error('invalid OTP')
        }
        const token = this.#generateJWT(user, rememberMe)
        logger.info(`User ${user.username} successfully verified OTP`);
        return {token, user}
    }

    //enable 2fa for user
    async enable2FA(userId){
        const user = await this.#findUserById(userId)
        const otpSecret = authenticator.generateSecret()
        await user.update({ otpSecret, is2FAEnabled: true})
        return {otpSecret}
    }

    // Validate and consume a backup code
    async validateBackupCode(userId, code){
        const user = await this.#findUserById(userId)

        const validCode = await Promise.any(
            user.backupCodes.map(async (storedCode) => {
                return await bcrypt.compare(code, storedCode)
            })
        ) 
        if(!validCode) throw new Error('Invalid backup code')


        const updatedBackupCode = await Promise.all(
            user.backupCodes.filter(async (storedCode) => {
                return !(await bcrypt.compare(code, storedCode))
            })
        )

        await user.update({backupCodes: updatedBackupCode})
        return true
    }

    // Generate backup codes for a user
    async generateBackupCode(userId){
        const user = await this.#findUserById(userId)
        
        const hashedBackupCodes = []
        const backupCodes = []

        for (let i = 0; i < 5; i++) {
            const code = crypto.randomBytes(4).toString('hex');
            const hashedCode = await bcrypt.hash(code, saltRounds)
            backupCodes.push(code)
            hashedBackupCodes.push(hashedCode)
        }

        await user.update({backupCodes: hashedBackupCodes})
        return backupCodes
    }

    async handleFailedLoginAttempt(user){
        user.failedLogInAttempts += 1;
        if (user.failedLogInAttempts >= maxFailedAttempts){
            user.isLocked = true
            user.lockedUntil = new Date(Date.now() + lockoutTime)
            logger.warn(`User ${user.username} account locked until ${user.lockedUntil}`)
        }
        await user.save()
    }

    async resetFailedAttempts(user){
        user.failedLogInAttempts = 0
        user.isLocked = false
        user.lockedUntil = null
        await user.save()
    }

    #validatePassword(password){
        const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        return regex.test(password)
    }

    #generateJWT(user, rememberMe){
        const expiresIn = rememberMe ? '7d' : '1h'; // 7 days if Remember Me is selected, otherwise 1 hour
        return jwt.sign(
            { id: user.id, username: user.username, email: user.email },
            secretKey,
            { expiresIn }
        );
    };

}

module.exports = new AuthService()