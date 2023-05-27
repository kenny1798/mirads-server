const express = require('express');
const router = express.Router();
const { users } = require('../models');
const bcrypt = require('bcrypt');
const { sign } = require('jsonwebtoken');
const { validateToken, verifyToken } = require('../middlewares/AuthMiddleware');
require('dotenv').config()


router.get("/username", validateToken, async (req,res) => {
    const username = req.user.username
    const user = await users.findOne({where: {username: username}});
    res.json({user: user});
});

router.get("/cw-auth", validateToken, async (req,res) => {
    const username = req.user.username
    const user = await users.findOne({where: {username: username}});
    const cwIndex = user.allowedGenerateCW;
    if(cwIndex >0){
        res.json({status: 'allowed'});
    }else{
        res.json ({error: 'Access Restricted. Insufficient Copies credit'})
    }
    
});

router.get("/copywriting", validateToken, async (req,res) => {
    const username = req.user.username
    const user = await users.findOne({where: {username: username}});
    const cwIndex = user.allowedGenerateCW - 1;
    try{
        users.update({allowedGenerateCW: cwIndex}, {where: {username: username}}).then(() => {
            res.json({status: 'allowed'})
        })
    }catch(err){
        res.json({error: err})
    }
});

router.get("/validate", validateToken, (req, res) => {
    res.json(req.user)
});

router.post("/signup", async (req,res) => {

    const {username, password, email, phoneNumber} = req.body;
    const verificationCodeGen = Math.floor(100000 + Math.random() * 900000);
    const verificationCode = verificationCodeGen.toString();
    const dupeUsername = await users.findOne({where: {username: username }});
    const dupeEmail = await users.findOne({where: {email: email }});
    const dupePhoneNumber = await users.findOne({where: {phoneNumber: phoneNumber }});

        if (!username || !password || !email || !phoneNumber){
            res.json("All field must be fill");
        }

            else if (dupeUsername){
            res.json({ error: "Username is already taken"});
        }
            else if (dupeEmail){
                res.json({ error: "Email is already taken"});
            } 
            else if (dupePhoneNumber){
                res.json({ error: "Phone Number is already taken"});
            } 
        else{
            const uservalid = 0;
            bcrypt.hash(password, 10).then((hash) => {
            users.create({
                username: username,
                password: hash,
                email: email,
                phoneNumber: phoneNumber,
                isValidate: uservalid,
                verificationCode: verificationCode
                        }).then( async () => {
                        const user = await users.findOne({ where: {username: username }});
                        const accessToken = sign({ username: user.username, id: user.id, isValidate: user.isValidate}, process.env.JWT_SECRET);
                        const loginUser = user.username;
                        res.json({token: accessToken, username:loginUser})
                        })
    })
}
});

router.post("/login", async (req, res) => {

    const {username, password} = req.body;
    const user = await users.findOne({ where: {username: username }});
    if(!username){
        res.json({error: "Please enter a username"})
    }
    else if (!password){
        res.json({error: "Password cannot be blank"})
    }
    else if (!user){
        res.json({ error : "User doesnt exist" });
    }else{
        bcrypt.compare(password, user.password).then((match) => {
        if (!match){ 
            res.json({ error: "Wrong password entered"});
    }else{
        if(user.isValidate === true){
            const accessToken = sign({ username: user.username, id: user.id, isValidate: user.isValidate}, process.env.JWT_SECRET);
            const validToken = sign({id: user.id, isValidate: user.isValidate}, process.env.JWT_ACCESS)
            const loginUser = user.username;
            res.json({token: accessToken, valToken: validToken, username:loginUser})
        }else{
            const accessToken = sign({ username: user.username, id: user.id, isValidate: user.isValidate}, process.env.JWT_SECRET);
            const loginUser = user.username;
            res.json({token: accessToken, username:loginUser})
        }
        }
            
    })}})


router.get("/auth", validateToken, (req, res) => {
    res.json(req.user)
});

module.exports = router;