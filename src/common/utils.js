const { format, createLogger, transports } = require("winston")
const { combine, timestamp, printf, colorize } = format;

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

module.exports = logger;



