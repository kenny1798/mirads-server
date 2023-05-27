const { verify } = require('jsonwebtoken');
require('dotenv').config();
const {users} = require('../models')

const validateToken = (req, res, next) => {
    const accessToken = req.header("accessToken");

    if (!accessToken) {
    return res.json({ error: "User not Logged In"});
    }
    try{
        const validToken = verify(accessToken, process.env.JWT_SECRET);
        req.user = validToken;
        if (validToken){
            return next();
        }
    }catch (err){
        return res.json({ error: err })
    }
};

const validateAdmin = (req, res, next) => {
    const adminToken = req.header("adminToken");

    if (!adminToken) {
    return res.json({ error: "Unauthorized User"});
    }
    try{
        const validToken = verify(adminToken, process.env.JWT_SECRET);
        req.admin = validToken;
        if (validToken){
            return next();
        }
    }catch (err){
        return res.json({ error: err })
    }
};

const verifyToken = (req, res, next) => {
    const valToken = req.header("valToken");

    if (!valToken) {
    return res.json({ error: "User user not validate"});
    }
    try{
        const verifiedToken = verify(valToken, process.env.JWT_ACCESS);
        req.user = verifiedToken;
        if (verifiedToken){
            return next();
        }
    }catch (err){
        return res.json({ error: err })
    }
};

module.exports = {validateToken, verifyToken, validateAdmin};