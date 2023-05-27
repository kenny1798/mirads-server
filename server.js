app.get('/test2', validateToken, async (req,res) => {

    const username = req.user.username;
    const checkStamp = mgenSession.findOne({where: {username:username}});

    const client = new Client({
        authStrategy: new LocalAuth({
        clientId: username
        }),
        puppeteer: {headless: true,
        args: [ '--disable-gpu',
        '--disable-setuid-sandbox',
        '--no-sandbox',]}
    });


client.on('qr', (qr)  => {
    io.emit('qrvalue', qr);
    io.emit('message', 'QR Code is generated, scan now to get started.');
    io.emit('btnhide', 'hide');
    io.emit('loading', '')
});

if(!checkStamp){
    client.on('ready', async () => {
        await mgenSession.create({
            username: username,
            session: "ready"
        })
        io.emit('qrvalue', '');
        io.emit('message', 'QR Scanned. Initializing authorized connection..');
        io.emit('loading', '');
        
    });
  
}else{
    client.on('ready', async () => {
        await mgenSession.update({session: "ready"}, {where: {username:username}})
        io.emit('qrvalue', '');
        io.emit('message', 'QR Scanned. Initializing authorized connection..' )
        
    });

}
    
client.initialize();   

    client.on('message', message => {
        if(message.body === 'test') {
            message.reply('haha');
        }
    })  
    
});