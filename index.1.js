const crypto = require('crypto');
const fs = require("fs");
const ipfsAPI = require('ipfs-api');
const app = require('express')();
const path = require('path');
const bodyParser = require('body-parser');
const fileUpload = require('express-fileupload');
const firebase = require('firebase');
let connectCalled=false;
const Peer = require('peerjs-nodejs');
let running=false;

function trace(s) {
    const orig = Error.prepareStackTrace;
    Error.prepareStackTrace = (_, stack) => stack;
    const err = new Error();
    Error.captureStackTrace(err, arguments.callee);
    Error.prepareStackTrace = orig;
    const callee = err.stack[0];
    let line = err.stack.match(/index\.js\:\d+/)[0].replace("index.js:","");
    let fn = err.stack.match(/at [\w\.\<\>]+ \(/)[0].replace("at ","").replace(" (","");
    console.log("\033[32m","TRACE ",fn,line,'\033[37m');
}
trace("");
trace("");var myLogger = function (req, res, next) {
            running=true;
trace("");   console.log('On Request: ',running)
            res.on("finish", function() {
                running=false;
                console.log('On Request: ',running)
            });
trace("");    next()
trace("");  }
trace("");app.use(myLogger)
trace("");const connect=()=>{
trace("");    
trace("");
trace("");    const peer = new Peer();
trace("");   
trace("");
trace("");    peer.on('open',(id)=>{
trace("");       
trace("");
trace("");        console.log("Your peer id: "+id);
trace("");        firebase.firestore().doc("peers/"+phoneNumber).set({
            phoneNumber,
            id,
            timestamp: Date.now()
        });
trace("");        
trace("");
trace("");        firebase.firestore().collection("peers").onSnapshot(snap=>{
trace("");            
trace("");
trace("");                snap.forEach(doc=>{
trace("");                    
trace("");
trace("");                    let data = doc.data();
trace("");                   
trace("");
trace("");                    if(data.phoneNumber==phoneNumber){
trace("");                        return;}
trace("");                    
trace("");
trace("");                    let conn = peer.connect(data.id,{
                        label: data.phoneNumber,
                      serialization:'json'
                   });
trace("");                    
trace("");
trace("");                    
trace("");                })
trace("");                
trace("");
trace("");        });
trace("");        
trace("");
trace("");
trace("");    })
trace("");    
trace("");
trace("");    peer.on("connection",(conn)=>{
trace("");      conn.on('open', function() {
trace("");        
trace("");    });
trace("");    conn.on('data', function(data) {
trace("");       console.log("Recieved");
trace("");       try{
trace("");        let _files = data.files;
trace("");        let _users = data.users;
trace("");        let _requests = data.requests;
trace("");
trace("");        _files.forEach(_file=>{
trace("");            
trace("");            if(!files.find(file=>file.hash==_file.hash)){
trace("");                files.push(_file);
trace("");            }
trace("");        });
trace("");        
trace("");        fs.writeFileSync('data/files.blocks',JSON.stringify(files));
trace("");        
trace("");        _users.forEach(_user=>{
trace("");            
trace("");            if(!users.find(user=>user.phoneNumber==_user.phoneNumber)){
trace("");                users.push(_user);}
trace("");        });
trace("");       
trace("");        fs.writeFileSync('data/users.blocks',JSON.stringify(users));
trace("");        _requests.forEach(_request=>{
trace("");            if(!requests.find(request=>request.requestedBy==_request.requestedBy&&request.hash==_request.hash)){
trace("");                requests.push(_request);}
trace("");        });
trace("");        fs.writeFileSync('data/requests.blocks',JSON.stringify(requests));
trace("");    }catch(msg){console.log(msg)}
trace("");    });
trace("");    conn.on('error',(error)=>{
trace("");        console.log(`Peer error on ${conn.label} (${conn.id}): ${error}`);
trace("");    })
trace("");    })
trace("");    peer.on('close',()=>{
trace("");        console.log("Connection was closed");
trace("");    })
trace("");    peer.on('disconnected',()=>{
trace("");        console.log("Got disconnected");
trace("");    })
trace("");    peer.on('error',(err)=>{
trace("");        console.log("Peer error occurred: ",err.type);
trace("");    })
trace("");
trace("");    setInterval(()=>{
trace("");        try{
trace("");        load();
trace("");        
trace("");        console.log(111);
trace("");        let data = {
            files,
           users,
           requests
        }
trace("");       Object.keys(peer.connections).map(conn=>{
trace("");        console.log(conn);
trace("");        if(peer.connections[conn][0].open){
trace("");            peer.connections[conn][0].send(data);
trace("");            peer.connections[conn][1].send(data);
trace("");        }
trace("");       })
trace("");    }catch(msg){
trace("");        console.log(msg);
trace("");    }
trace("");    },5000)
trace("");}
trace("");
trace("");
trace("");// Initialize Firebase
trace("");var config = {
apiKey: "AIzaSyBiv8n9P8Tq9yybLOhQRuCeLIQDGIY4oYY",
authDomain: "sac-it.firebaseapp.com",
databaseURL: "https://sac-it.firebaseio.com",
projectId: "sac-it",
storageBucket: "sac-it.appspot.com",
messagingSenderId: "520393312941"
};
trace("");firebase.initializeApp(config);
trace("");
trace("");
trace("");
trace("");app.use(fileUpload({
    limits: { fileSize: 50 * 1024 * 1024 },
  }))
trace("");app.use(bodyParser.json());
trace("");app.use(bodyParser.urlencoded({
    extended: true
  }))
trace("");
trace("");app.get('/',(req,res,next)=>{
trace("");    load();
trace("");    if(!phoneNumber){
trace("");        res.redirect("/register");}
trace("");    res.sendFile( path.resolve('index.html'));
trace("");})
trace("");
trace("");app.get('/register',(req,res)=>{
trace("");    res.sendFile( path.resolve('register.html'));
trace("");})
trace("");
trace("");
trace("");app.get('/list',(req,res)=>{
trace("");    res.sendFile( path.resolve('list.html'));
trace("");})
trace("");app.get('/list/api',(req,res)=>{
trace("");   res.json(files.filter(file=>file.permission==phoneNumber));
trace("");})
trace("");
trace("");app.get('/download/:hash',(req,res)=>{
trace("");    running=true;
trace("");    let hash = req.params.hash;
trace("");    try{
trace("");        ipfs.files.get(hash, (err, files)=> {
trace("");            files.forEach((file) => {
trace("");                
trace("");                let i=0;
trace("");                let chunks=[];
trace("");                let size = 256*2;
trace("");                let data= file.content;
trace("");                while(i<data.length){
trace("");                    console.log(i,data.length,i+size);
trace("");                    let chunk = data.slice(i,i+size);
trace("");                    i+=size;
trace("");                    let decrypted = crypto.privateDecrypt(
                       {
                        key: privateKey,
                       passphrase: phoneNumber,
                       },
                      chunk,
                    );
trace("");                    chunks.push(...decrypted);
trace("");                    console.log(chunks.length,decrypted.length);
trace("");                }
trace("");                
trace("");                last=Date.now();
trace("");                fs.writeFileSync("temp",Buffer.from(chunks));
trace("");                res.sendFile(path.resolve("temp"));
trace("");                
trace("");              })
trace("");          })
trace("");    }
    catch(msg){
trace("");        console.log(msg);
trace("");    }
trace("");    runnng=false;
trace(""); })
trace("");
trace("");app.post('/register',(req,res)=>{
trace("");    let phoneNumber = req.body.phoneNumber;
trace("");    console.log(req.body);
trace("");    if(users.find(user=>user.phoneNumber==phoneNumber)){
trace("");        res.send("Your phone number is already registered. Please find your private key.");
trace("");        return;
trace("");    }
trace("");
trace("");    crypto.generateKeyPair('rsa', {
       modulusLength: 4*1024,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem'
       },
      privateKeyEncoding: {
        type: 'pkcs8',
          format: 'pem',
          cipher: 'aes-256-cbc',
         passphrase: phoneNumber
        }
      }, (err, publicKey, privateKey) => {
trace("");
trace("");        if(err){
trace("");            res.send(err);
trace("");            return;
trace("");        }
trace("");        user={
            phoneNumber,
           lastUpdate:Date.now()
        }
trace("");        fs.writeFileSync('data/publicKey.pem',publicKey);
trace("");        fs.writeFileSync('data/user.txt',JSON.stringify(user));
trace("");        fs.writeFileSync('data/privateKey.pem',privateKey);
trace("");        users.push({
           phoneNumber,
           publicKey
       });
trace("");        last=Date.now();
trace("");        fs.writeFileSync('data/users.blocks',JSON.stringify(users));
trace("");    
trace("");        res.redirect("/")
trace("");          
trace("");        // Handle errors and use the generated key pair.
trace("");      });
trace("");    
trace("");    
trace("");    
trace("");})
trace("");
trace("");
trace("");app.get('/upload',(req,res)=>{
trace("");    res.sendFile(path.resolve('upload.html'))
trace("");});
trace("");
trace("");app.post('/upload',async(req,res)=>{
trace("");    try{
trace("");        let fileData = req.files.file.data;
trace("");
trace("");
trace("");        let i=0;
trace("");        let chunks=[];
trace("");        let size = 256;
trace("");        while(i<=fileData.length){
trace("");            let chunk = fileData.slice(i,i+size);
trace("");            i+=size;
trace("");            let encryptedData = crypto.publicEncrypt(publicKey, chunk);
trace("");            chunks.push(...encryptedData);
trace("");        }
trace("");        //console.log(chunks);
trace("");        
trace("");        chunks.flat();
trace("");        let data = await ipfs.files.add(Buffer.from(chunks));
trace("");        if(files.find(file=>file.hash==data[0].hash)){
trace("");            res.redirect("/list");
trace("");            return;
trace("");        }
trace("");        files.push({
            hash:data[0].hash,
           author:phoneNumber,
            permission:phoneNumber,
            date:Date.now(),
            size:fileData.length,
            title:req.body.title,
            description:req.body.description
        })
trace("");        last=Date.now();
trace("");        fs.writeFileSync('data/files.blocks',JSON.stringify(files));
trace("");        res.redirect("/list");
trace("");    }
    catch(msg){
trace("");        res.send("Failed to open file"+msg);
trace("");    }
trace("");   
trace("");});
trace("");
trace("");app.get('/search',(req,res)=>{
trace("");    res.sendFile(path.resolve('search.html'))
trace("");});
trace("");
trace("");app.get('/search/:phoneNumber',(req,res)=>{
trace("");    res.json(files.filter(file=>file.permission==req.params.phoneNumber));
trace(""); })
trace(""); let port = 8080;
trace("");
trace("");const listen=()=>{
trace("");    app.listen(port).on("error",(err)=>{
trace("");        port++;
trace("");        listen();
trace("");    }).on("listening",()=>{
trace("");        console.log("Running on port "+port);
trace("");    });
trace("");}
trace("");listen();
trace("");
trace("");
trace("");app.get('/me',(req,res)=>{
trace("");    res.send(phoneNumber);
trace("");})
trace("");
trace("");app.get('/requests',(req,res)=>{
trace("");    res.sendFile(path.resolve('requests.html'))
trace("");});
trace("");
trace("");app.get('/request/:phoneNumber/:hash',(req,res)=>{
trace("");    if(requests.find(request=>request.hash==req.param.hash&&request.requestedBy==phoneNumber))
trace("");        {
trace("");            res.redirect("/");
trace("");            return;
trace("");        }
trace("");    requests.push({
        hash:req.params.hash,
        requestedBy:phoneNumber,
        author:req.params.phoneNumber,
        date:Date.now()
    })
trace("");    last=Date.now();
trace("");    fs.writeFileSync('data/requests.blocks',JSON.stringify(requests));
trace("");    res.redirect("/")
trace("");});
trace("");
trace("");app.get('/requests/api',(req,res)=>{
trace("");    let reqs = requests.filter(request=>request.author==phoneNumber).map(request=>{
trace("");        let file = files.filter(file=>file.hash==request.hash)[0];
trace("");        file.requestedBy=request.requestedBy;
trace("");        file.date = request.date;
trace("");        return file; 
trace("");    })
trace("");    res.json(reqs);
trace("");});
trace("");
trace("");
trace("");app.get('/grant/:phoneNumber/:hash',(req,res)=>{
trace("");    let hash = req.params.hash;
trace("");    try{
trace("");        ipfs.files.get(hash, (err, filesX)=> {
trace("");            filesX.forEach(async (file) => {
trace("");                
trace("");                let i=0;
trace("");                let chunks=[];
trace("");                let size = 256*2;
trace("");                let data= file.content;
trace("");                while(i<data.length){
trace("");                    console.log(i,data.length,i+size);
trace("");                    let chunk = data.slice(i,i+size);
trace("");                    i+=size;
trace("");                    let decrypted = crypto.privateDecrypt(
                        {
                        key: privateKey,
                        passphrase: phoneNumber,
                        },
                        chunk,
                    );
trace("");                    chunks.push(...decrypted);
trace("");                    console.log(chunks.length,decrypted.length);
trace("");                }
trace("");                let fileData = Buffer.from(chunks);
trace("");                i=0;
trace("");                chunks=[];
trace("");                size = 256;
trace("");                let publicKey = users.filter(user=>user.phoneNumber==req.params.phoneNumber)[0].publicKey;
trace("");                console.log(publicKey)
trace("");                while(i<=fileData.length){
trace("");                    let chunk = fileData.slice(i,i+size);
trace("");                    i+=size;
trace("");                    let encryptedData = crypto.publicEncrypt(publicKey, chunk);
trace("");                    chunks.push(...encryptedData);
trace("");                }
trace("");                //console.log(chunks);
trace("");                
trace("");                chunks.flat();
trace("");                data = await ipfs.files.add(Buffer.from(chunks));
trace("");                if(files.find(file=>file.hash==data[0].hash)){
trace("");                    res.redirect("/list");
trace("");                    return;
trace("");                }
trace("");                file = files.filter(i=>i.hash==req.params.hash)[0];
trace("");                console.log(files);
trace("");                files.push({
                    hash:data[0].hash,
                    author:phoneNumber,
                    permission:req.params.phoneNumber,
                    date:file.date,
                    size:fileData.length,
                    title:file.title,
                    description:file.description
                })
trace("");                last=Date.now();
trace("");                fs.writeFileSync('data/files.blocks',JSON.stringify(files));
trace("");                res.redirect("/");
trace("");              })
trace("");          })
trace("");    }
    catch(msg){
trace("");        console.log(msg);
trace("");    }
trace("");});
trace("");
trace("");app.post('/send/:hash',(req,res)=>{
trace("");    let hash = req.params.hash;
trace("");    try{
trace("");        ipfs.files.get(hash, (err, filesX)=> {
trace("");            filesX.forEach(async (file) => {
trace("");                
trace("");                let i=0;
trace("");                let chunks=[];
trace("");                let size = 256*2;
trace("");                let data= file.content;
trace("");                while(i<data.length){
trace("");                    console.log(i,data.length,i+size);
trace("");                    let chunk = data.slice(i,i+size);
trace("");                    i+=size;
trace("");                    let decrypted = crypto.privateDecrypt(
                        {
                        key: privateKey,
                        passphrase: phoneNumber,
                        },
                        chunk,
                    );
trace("");                    chunks.push(...decrypted);
trace("");                    console.log(chunks.length,decrypted.length);
trace("");                }
trace("");                let fileData = Buffer.from(chunks);
trace("");                i=0;
trace("");                chunks=[];
trace("");                size = 256;
trace("");                
trace("");                let publicKey = users.filter(user=>user.phoneNumber==req.body.phoneNumber)[0].publicKey;
trace("");                console.log(publicKey)
trace("");                while(i<=fileData.length){
trace("");                    let chunk = fileData.slice(i,i+size);
trace("");                    i+=size;
trace("");                    let encryptedData = crypto.publicEncrypt(publicKey, chunk);
trace("");                    chunks.push(...encryptedData);
trace("");                }
trace("");                //console.log(chunks);
trace("");                
trace("");                chunks.flat();
trace("");                data = await ipfs.files.add(Buffer.from(chunks));
trace("");                if(files.find(file=>file.hash==data[0].hash)){
trace("");                    res.redirect("/list");
trace("");                    return;
trace("");                }
trace("");                file = files.filter(i=>i.hash==req.params.hash)[0];
trace("");                console.log(files);
trace("");                files.push({
                    hash:data[0].hash,
                    author:phoneNumber,
                    permission:req.body.phoneNumber,
                    date:file.date,
                    size:fileData.length,
                    title:file.title,
                    description:file.description
                })
trace("");                last=Date.now();
trace("");                fs.writeFileSync('data/files.blocks',JSON.stringify(files));
trace("");                res.redirect("/");
trace("");              })
trace("");          })
trace("");    }
    catch(msg){
trace("");        console.log(msg);
trace("");    }
trace("");});
trace("");
trace("");app.get('/send/:hash',(req,res)=>{
trace("");    res.sendFile( path.resolve('send.html'));
trace("");})
trace("");
trace("");
trace("");const ipfs = ipfsAPI('ipfs.infura.io', '5001', {protocol: 'https'})
trace("");let users=[];
trace("");let files=[];
trace("");let requests=[];
trace("");let publicKey;
trace("");let privateKey;
trace("");let phoneNumber;
trace("");
trace("");
trace("");const getBlocksFile=(file)=>{
trace("");    try{
trace("");        let content = fs.readFileSync(file, 'utf-8');
trace("");        if(content.length==0){
trace("");            return [];
}
trace("");        return JSON.parse(content);
trace("");    }
    catch(msg){
trace("");       // console.log(msg);
trace("");        return [];
trace("");    }
trace("");}
trace("");
trace("");const load=()=>{
trace("");    try{
trace("");        fs.mkdirSync("data");
trace("");        }catch(msg){}
trace("");    users = getBlocksFile('data/users.blocks');
trace("");    files = getBlocksFile('data/files.blocks');
trace("");    requests = getBlocksFile('data/requests.blocks');
trace("");    try{
trace("");        user = JSON.parse(fs.readFileSync("data/user.txt", 'utf-8'));
trace("");        phoneNumber=user.phoneNumber;
trace("");        privateKey = fs.readFileSync("data/privateKey.pem", 'utf-8');
trace("");        publicKey = fs.readFileSync("data/publicKey.pem", 'utf-8');
trace("");
trace("");    }
    catch(msg){
trace("");       // console.log("Failed"+msg);
trace("");    }
trace("");   
trace("");    if(phoneNumber&&!connectCalled){
trace("");        console.log(phoneNumber);
trace("");        connect();
trace("");        connectCalled=true;
trace("");    }
trace("");}
trace("");load();
trace("");
trace("");
trace("");
trace("");