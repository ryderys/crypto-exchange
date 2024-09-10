const { format, createLogger, transports } = require("winston")
const { combine, timestamp, printf, colorize } = format;
const jwt = require("jsonwebtoken");
const UserSchema = require("../REST/modules/user/user.model");


const secretKey = process.env.JWT_SECRET


const myFormat = printf(({ level, message, timestamp }) => {
    return `${timestamp} [${level}]: ${message}`;
});

const redactSensitiveData = format((info) => {
    if (info.message && typeof info.message === 'string' && info.message.includes('password')) {
        info.message = info.message.replace(/password:\s*[^,]+/, 'password: [REDACTED]');
    }
    return info;
});

const logger = createLogger({
    level: 'info',
    format: combine(
        redactSensitiveData(),
        timestamp(),
        myFormat
    ),
    transports: [
        new transports.Console({format: combine(colorize())}),
        new transports.File({ filename: 'combined.log' }),
        new transports.File({ filename: 'errors.log', level: 'error' }),
    ]
})

async function VerifyAccessTokenInGraphQL(req) {
    try {
        if(!req) throw new Error('Request object is undefined')
        const token = req.cookies?.token
        if(!token) throw new Error("token is required")
        
        const decoded = jwt.verify(token, secretKey)
        
        const {username} = decoded

        if(!username) throw new Error("Invalid token: no username found")

        const user = await UserSchema.findOne({where: {username}})
        
        if(!user) throw new Error("account not found")
        
        return user
    } catch (error) {
        throw new Error("unAuthorized" + error.message)
    }
}

module.exports = {
    logger,
    VerifyAccessTokenInGraphQL
};




