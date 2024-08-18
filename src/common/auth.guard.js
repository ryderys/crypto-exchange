const jwt = require("jsonwebtoken")
const secretKey = process.env.JWT_SECRET

const authenticate = (req, res, next) => {
    let token = req.headers['authorization']

    if(token){
         token = token.split(' ')[1]
    }else {
        token = req.cookies?.token
    }

    if(!token){
        return res.status(401).json({
            message: 'Access Denied. No token provided'
        })
    }

    try {
        const verified = jwt.verify(token, secretKey)
        req.user = verified
        next()
    } catch (error) {
        return res.status(403).json({data: {
            message: 'Invalid token'
        }})    
    }
}

module.exports = authenticate