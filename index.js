const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config()
const port = parseInt(process.env.SERVER_PORT, 10);
const db = require('./models');
const https = require('https')
const http = require('http');
const {Server} = require("socket.io");
const multer = require('multer');
const path = require('path');
const { mgenSessions, leads, users} = require('./models');
const { validateToken, validateAdmin } = require('./middlewares/AuthMiddleware');
const {phoneNumberFormatter} = require('./middlewares/WhatsAppFormatter')
const { Client, RemoteAuth, response, LocalAuth, Contact } = require('whatsapp-web.js');
var qrcode = require('qrcode-terminal');
const { MongoStore } = require('wwebjs-mongo');
const mongoose = require('mongoose');





app.use(express.json());
app.use(cors());
app.use(express.urlencoded({
    extended: true
}));
app.use(express.static('form_images'))

const server = http.createServer(app);

const io = new Server(server, {
    cors:{
        origin: "http://localhost:3000",
        methods: ["GET", "POST", "PUT"],
    }
});

const storage = multer.diskStorage({
    destination: (req, file, cb) =>{
        cb(null, 'form_images')
    },
    filename: (req, file, cb) =>{
        console.log(file)
        cb(null,"Mgen" + Date.now() + path.extname(file.originalname))
    }

});

const upload = multer({storage: storage});


// Routers
const usersRouter = require('./routes/user')
app.use("/api/user", usersRouter);

const validateRouter = require('./routes/validate');
app.use("/api/validate", validateRouter);

const mgenRouter = require('./routes/mgen');
app.use("/api/mgen", mgenRouter);

const adminRouter = require('./routes/admin');
app.use("/api/admin", adminRouter);

io.on('connection', () => {console.log("Socket Connected")})

app.get('/', (req,res) => {
res.send("Hola")
})

//WhatsApp Auth
app.get('/check-auth/:clientLink', validateToken, async (req,res) => {
    const username = req.user.username;
    const clientLink = req.params.clientLink;
    const session = await mgenSessions.findOne({where: {session_client:clientLink}});
    if (!session){
        res.json({status: ''})
    }else{
        if(session.session_status === 'created'){
        res.json({status: 'created'})
        }else if(session.session_status === 'ready'){
        const clientlink = session.session_client;
        res.json({status: 'ready', tick: 'yes', client:clientlink})
        }
        
    }
});

app.get('/delete-session', validateToken, async (req,res) => {
    const username = req.user.username;
    mongoose.connect(process.env.MONGODB_URI).then(async () => {
        const store = new MongoStore({ mongoose: mongoose });
        const remove = store.delete({session: 'RemoteAuth-'+username });
        if(remove){
            mgenSessions.update({session_status: 'created'}, {where: {username:username}})
            res.json({msg: "Session deleted successfully"})
        }else{
            res.json ({errmsg: 'Failed to delete session'})
        }
    })
})

app.get('/session/delete/:clientLink', validateToken, async (req,res) => {
    const link = req.params.clientLink;
    const username = req.user.username;

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
    }); mgenSessions.update({session_status: 'created'}, {where: {username:username}})
    res.json({msg: "Session deleted successfully"})
}else{
    res.json ({errmsg: 'Failed to delete session'})
}
})
})

app.post('/whatsapp-auth', validateToken, upload.single('form_image') , async (req,res) => {
    const username = req.user.username;
    const session_client = req.body.session_client;
    const form_title = req.body.form_title;
    const form_body = req.body.form_body;
    const whatsapp_text = req.body.whatsapp_text;
    const form_image = req.file.filename;
    try{
        mgenSessions.create({
            username:username,
            session_client: session_client,
            session_status: "created",
            form_title:form_title,
            form_body: form_body,
            form_image: form_image,
            whatsapp_text: whatsapp_text
        })
    }catch(error){
        res.json({error: error})
    }
});

app.put('/updateMgen', validateToken, upload.single('form_image') , async (req,res) => {
    const username = req.user.username;
    const session_client = req.body.session_client;
    const form_title = req.body.form_title;
    const form_body = req.body.form_body;
    const whatsapp_text = req.body.whatsapp_text;
    const session = await mgenSessions.findOne({where: {username:username}});
    const image = session.form_image
    let form_image;
    if(req.file){
    form_image = req.file.filename;
    }else{
    form_image = image;
    }
    
    try{
        mgenSessions.update({
            username:username,
            session_client: session_client,
            session_status: "ready",
            form_title:form_title,
            form_body: form_body,
            form_image: form_image,
            whatsapp_text: whatsapp_text
        }, {where: {username: username}}).then(() => {
            io.emit('update', 'updated')
            io.emit('status', 'ready')
        })
    }catch(error){
        io.emit('error', JSON.stringify(error))
    }
});


app.get('/whatsapp-auth/:session_client',validateToken, async (req,res) => {

    const clientSession = req.params.session_client;
    const session = await mgenSessions.findOne({where: {username: clientSession}});

    await mongoose.connect(process.env.MONGODB_URI).then(async () => {
                const store = new MongoStore({ mongoose: mongoose });
                const client = new Client({
                        authStrategy: new RemoteAuth({
                            clientId: clientSession,
                            store: store,
                            backupSyncIntervalMs: 60000
                        }),
                        puppeteer: {headless: true,
                        args: [ '--disable-gpu',
                        '--disable-setuid-sandbox',
                        '--no-sandbox',]}
                    });
            
                    
            client.initialize();
        
                client.on('qr', (qr)  => {
                    try{
                        io.emit('qrvalue', qr);
                        io.emit('message', 'QR Code is generated, scan now to get started.')
                        io.emit('btnhide', 'hide');
                        io.emit('loading', '');
                    }
                    catch (err){
                        io.emit({error: err.message})
                    }      
                    
                })
                
            client.on('ready', () => {
                    io.emit('qrvalue', '');
                    io.emit('message', 'QR Scanned. Initializing authorized connection..' );
                    io.emit('loading', 'load');
                });
            
            client.on('remote_session_saved', async () => {
                    io.emit('loading', '');
                    mgenSessions.update({session_status:"ready"}, {where: {session_client: clientSession}});
                    const delay = () =>{
                        client.destroy();
                        io.emit('status','ready')
                    }
                    setTimeout(delay, 2000)
                    io.emit('link', `${clientSession}`);
                });
                
            });
    });

//Get Mgen Page
app.get('/mgen/:session_client', async (req,res) => {
    const session_client = req.params.session_client;
    const session = await mgenSessions.findOne({where: {session_client:session_client}});
    const username = session.username;
    const user = await users.findOne({where: {username:username}});
    try{
        res.json({session:session, user:user});
    }catch(error){
        res.json({error: error})
    }

})

app.get('/test', async (req,res) => {
})

//Send WhatsApp Message
app.post('/send-message/:session_client', async (req,res) => {

    const session_client = req.params.session_client;
    const {leadName, leadPhoneNumber} = await req.body;
    const checkNumber = JSON.stringify(leadPhoneNumber);
    const numberLength = checkNumber.length;
    const session = await mgenSessions.findOne({where: {session_client:session_client}});
    const sessionActive = await session.isActive;
    const addQueue = await session.submitQueue + 1;
    const currentQueue = await session.submitQueue;
    const message = await session.whatsapp_text;
    const username = await session.username;
    const lead = await leads.findOne({where: {leadPhoneNumber:leadPhoneNumber}});
    const leadSession = await leads.findOne({where: {session:session_client}});
    const user = await users.findOne({where: {username:username}});
    const plusContact = user.contacts + 1;

    if(!leadName || !leadPhoneNumber){
        res.json({error: "All fields cannot be blank"})
    }else if(numberLength<12 || numberLength>13){
        res.json({error: "WhatsApp number not valid"})
    }else if(lead && leadSession){
        res.json({error:"WhatsApp number already submitted"})
    }else{
        await leads.create({
            user: username,
            session: session_client,
            leadName: leadName,
            leadPhoneNumber: leadPhoneNumber    
        }).then( async () => {
        res.json({status: "success", msg: "Your details submitted successfully", error: ""})
        users.update({contacts:plusContact}, {where: {username: username}})
        mongoose.connect(process.env.MONGODB_URI).then( async () => {
            const store = new MongoStore({ mongoose: mongoose });
            const client = new Client({
                authStrategy: new RemoteAuth({
                    clientId: session_client,
                    store: store,
                    backupSyncIntervalMs: 60000       
                }),
                puppeteer: {headless: true,
                args: [ '--disable-gpu',
                '--disable-setuid-sandbox',
                '--no-sandbox',]}
            }) 


        if(currentQueue == 0){

        mgenSessions.update({submitQueue: addQueue}, {where: {username:username}});

        client.initialize();
        
        client.on('ready', () => {
            const number = phoneNumberFormatter(leadPhoneNumber);
            client.sendMessage(number, message).then( async () => {
            if(addQueue == 1){
                mgenSessions.update({submitQueue: currentQueue}, {where:{username: username}}).then(async() =>{
                    const delayDestroy = () => {
                        client.destroy();

                        }
                    setTimeout(delayDestroy, 3000);
                    }) 
            }else if (addQueue > 1){
                const minusQueue = currentQueue - 1;
                mgenSessions.update({submitQueue: minusQueue}, {where:{username: username}}).then(async() =>{
                    const delayDestroy = () => {
                        client.destroy();
                        }
                    setTimeout(delayDestroy, 3000);
                    }) 
            }
                        }).catch(err => {
                            console.log(err);
                        });

        
                })

        }else if(currentQueue > 0){
        mgenSessions.update({submitQueue: addQueue}, {where: {username:username}});
        const delayMessage = () => {
        client.initialize();

        client.on('ready', () => {
                const number = phoneNumberFormatter(leadPhoneNumber);
                client.sendMessage(number, message).then(() => {
                if(addQueue == 1){
                    mgenSessions.update({submitQueue: currentQueue}, {where:{username: username}}).then(async() =>{
                        const delayDestroy = () => {
                        client.destroy();
                        }
                    setTimeout(delayDestroy, 3000);
                        }) 
                }else if (addQueue > 1){
                    const minusQueue = currentQueue - 1;
                    mgenSessions.update({submitQueue: minusQueue}, {where:{username: username}}).then(async() =>{
                        const delayDestroy = () => {
                            client.destroy();
                            }
                        setTimeout(delayDestroy, 3000);
                        }) 
                }
                
                    }).catch(err => {
                        console.log(err);
                    }) 
                })
        }
        const timer = 25000 * currentQueue;
        setTimeout(delayMessage, timer)    

        }
            
        })
    })
    }

    });

app.get('/admin-auth', validateAdmin, async (req,res) => {

        const username = process.env.ADMIN_LOGIN;
    
        mongoose.connect(process.env.MONGODB_URI).then(async () => {
                    const store = new MongoStore({ mongoose: mongoose });
                    const client = new Client({
                            authStrategy: new RemoteAuth({
                                clientId: username,
                                store: store,
                                backupSyncIntervalMs: 60000
                            }),
                            puppeteer: {headless: true,
                            args: [ '--disable-gpu',
                            '--disable-setuid-sandbox',
                            '--no-sandbox',]}
                        });
                
                        
                client.initialize();
            
                    client.on('qr', (qr)  => {
                        io.emit('qrvalue', qr);
                        io.emit('message', 'QR Code is generated, scan now to get started.')
                        io.emit('btnhide', 'hide');
                        io.emit('loading', ''); 
                               
                        
                    })
                    
                client.on('ready', () => {
                        io.emit('qrvalue', '');
                        io.emit('message', 'QR Scanned. Initializing authorized connection..' );
                        io.emit('loading', 'load');
                    });
                
                client.on('remote_session_saved', async () => {
                        io.emit('loading', '');
                        const delay = () =>{
                            client.destroy();
                            io.emit('status','ready')
                        }
                        setTimeout(delay, 2000)
                        io.emit('message', 'Session Stored');
                    });
                    
                });
        });

app.get('/admin/session/delete', validateAdmin, async (req,res) => {

            const admin = process.env.ADMIN_LOGIN;
                const chunks = `whatsapp-RemoteAuth-${admin}.chunks`
                const files = `whatsapp-RemoteAuth-${admin}.files`
                
            mongoose.connect(process.env.MONGODB_URI).then(async () => {
                const store = new MongoStore({ mongoose: mongoose });
                const remove = store.delete({session: 'RemoteAuth-'+admin });
            if(remove){
            mongoose.connection.db.dropCollection(chunks, function(err, result){
                console.log("Chunks dropped")
            })
            mongoose.connection.db.dropCollection(files, function(err, result){
                console.log("Files dropped")
            });

        }
        })
        })
 

// Start server
db.sequelize.sync().then(() => {
    server.listen(port, () =>{
                console.log("Server running on port " + port);
    })

})





