const express = require('express');
const router = express.Router();
const { Client, LocalAuth, response } = require('whatsapp-web.js');
var qrcode = require('qrcode-terminal');
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { headless: true }
});

router.use(express.json());
router.use(express.urlencoded(({extended:true})));



router.get("/", async (req,res) =>{

    client.on('qr', (qr) => {
        console.log('QR RECEIVED', qr);
        qrcode.generate(qr, {small: true});
    });
    
    client.on('ready', () => {
        console.log('Client is ready!');
    });

    client.initialize();

    client.on('message', async msg => {

        var incomingChat = msg.body.toUpperCase();
        var text = "Yo";
        var text1 = text.toUpperCase();
        var text2 = "good";
        var text3 = text2.toUpperCase();

        if(incomingChat.includes(text1)) {
            const chat = await msg.getChat();
            chat.sendStateTyping(3000);
            function delay () {
                client.sendMessage(msg.from, 'Yo wazzup bro');
            } 
            setTimeout(delay, 3000);
            
        }
        if (incomingChat.includes(text3)){
            const chat = await msg.getChat();
            chat.sendSeen();
            chat.sendStateTyping(3000);
            function delay2 () {
                client.sendMessage(msg.from, 'nice bro');
            } 
            setTimeout(delay2, 3000);
        }
    });

        

    
});

router.post("/send-message", (req,res) => {
    
    const number = '60103790304@c.us';
    const message = 'test';

    client.sendMessage(number, message).then (response => {
        res.status(200).json({
            status: true,
            response: response
        })
    }).catch(err => {

        res.status(500).json({
            status: false,
            response: err
        })

    });
});

module.exports = router;