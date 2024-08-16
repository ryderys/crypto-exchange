const jwt = require("jsonwebtoken")
const secretKey = process.env.JWT_SECRET

const authenticate = (req, res, next) => {
    const token = req.headers['authorization']
    if(!token) throw new Error('No token provided')

    jwt.verify(token, secretKey, (err, decoded) => {
        if(err) throw new Error('Invalid token')
        req.user = decoded
        next()
    })
}

module.exports = authenticate