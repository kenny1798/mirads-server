const express = require('express');
const app = express();
const router = express.Router();
const { MongoStore } = require('wwebjs-mongo');
const mongoose = require('mongoose');
const { mgenSessions, leads, users } = require('../models');
const { validateToken } = require('../middlewares/AuthMiddleware');
require('dotenv').config();


router.get("/edit", validateToken, async (req, res) => {
    const username = req.user.username;
    const session = await mgenSessions.findOne({where: {username:username}});
    const formTitle = session.form_title;
    const formBody = session.form_body;
    const formImage = session.form_image;
    const wsText = session.whatsapp_text;
    const sessionClient = session.session_client
    try{
        res.json({formTitle: formTitle, formBody:formBody, formImage: formImage, wsText: wsText, sessionClient : sessionClient})
    }catch(error){
        res.json({error: error})
    }
    
    });

    router.get("/delete/:clientLink", validateToken, async (req, res) => {
        const link = req.params.clientLink;
        const chunks = `whatsapp-RemoteAuth-${link}.chunks`
        const files = `whatsapp-RemoteAuth-${link}.files`
        
    mongoose.connect(process.env.MONGODB_URI).then(async () => {
        const store = new MongoStore({ mongoose: mongoose });
        const remove = store.delete({session: 'RemoteAuth-'+link });
        if(remove){
    mongoose.connection.db.dropCollection(chunks, function(err, result){
        console.log("Chunks dropped")
    })
    mongoose.connection.db.dropCollection(files, function(err, result){
        console.log("Files dropped")
    });
        mgenSessions.destroy({where: {session_client:link}});
        res.json({delete: "Form deleted successfully"});
        }else{
        res.json({error: "cant delete Form"})
        }
    })
        });

router.get("/getLeads/:session_client", validateToken, async (req, res) => {
    const session = req.params.session_client;
    const listOfLeads = await leads.findAll({where: {session:session}});
    const count = listOfLeads.length;
    res.json({leads: listOfLeads, count: count});
        });

router.get('/getleads', validateToken, async (req,res) => {
    const username = req.user.username;
    const user = await users.findOne({where:{username:username}});
    const contacts = await user.contacts;
    res.json({contacts: contacts});
});

router.get('/getallcontacts', validateToken, async (req,res) => {
    const username = req.user.username;
    const contacts = await leads.findAll({where:{user:username}});
    res.json(contacts);
});

router.get('/getSession', validateToken, async (req,res) => {
    const username = req.user.username;
    const session = await mgenSessions.findAll({where: {username:username}});
    res.json(session);
})

module.exports = router;
    