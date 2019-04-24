const crypto = require('crypto');
const fs = require("fs");
const ipfsAPI = require('ipfs-api');
const app = require('express')();
const path = require('path');
const bodyParser = require('body-parser');
const fileUpload = require('express-fileupload');
const firebase = require('firebase');
const Peer = require('peerjs-nodejs');

let connectCalled=false;
let running=false;

var myLogger = function (req, res, next) {
            running=true;
   //console.log('On Request: ',running)
            res.on("finish", function() {
                running=false;
                //console.log('On Request: ',running)
            });
    next()
  }

app.use(myLogger)
const connect=()=>{
    const peer = new Peer();
    peer.on('open',(id)=>{
        console.log("Your peer id: "+id);
        firebase.firestore().doc("peers/"+phoneNumber).set({
            phoneNumber,
            id,
            timestamp: Date.now()
        });
        

        firebase.firestore().collection("peers").onSnapshot(snap=>{
            

                snap.forEach(doc=>{
                    

                    let data = doc.data();
                   

                    if(data.phoneNumber==phoneNumber){
                        return;}
                    

                    let conn = peer.connect(data.id,{
                        label: data.phoneNumber,
                      serialization:'json'
                   });
                    

                    
                })
                

        });
        


    })
    

    peer.on("connection",(conn)=>{
      conn.on('open', function() {
        
    });
    conn.on('data', function(data) {
       //console.log("Recieved");
       try{
        let _files = data.files;
        let _users = data.users;
        let _requests = data.requests;

        _files.forEach(_file=>{
            
            if(!files.find(file=>file.hash==_file.hash)){
                files.push(_file);
            }
        });
        
        fs.writeFileSync('data/files.blocks',JSON.stringify(files));
        
        _users.forEach(_user=>{
            
            if(!users.find(user=>user.phoneNumber==_user.phoneNumber)){
                users.push(_user);}
        });
       
        fs.writeFileSync('data/users.blocks',JSON.stringify(users));
        _requests.forEach(_request=>{
            if(!requests.find(request=>request.requestedBy==_request.requestedBy&&request.hash==_request.hash)){
                requests.push(_request);}
        });
        fs.writeFileSync('data/requests.blocks',JSON.stringify(requests));
    }catch(msg){console.log(msg)}
    });
    conn.on('error',(error)=>{
        console.log(`Peer error on ${conn.label} (${conn.id}): ${error}`);
    })
    })
    peer.on('close',()=>{
        console.log("Connection was closed");
    })
    peer.on('disconnected',()=>{
        console.log("Got disconnected");
    })
    peer.on('error',(err)=>{
        console.log("Peer error occurred: ",err.type);
    })

    setInterval(()=>{
        try{
        load();
        
        console.log(111);
        let data = {
            files,
           users,
           requests
        }
       Object.keys(peer.connections).map(conn=>{
        console.log(conn);
        if(peer.connections[conn][0].open){
            peer.connections[conn][0].send(data);
            peer.connections[conn][1].send(data);
        }
       })
    }catch(msg){
        console.log(msg);
    }
    },5000)
}


// Initialize Firebase
var config = {
apiKey: "AIzaSyBiv8n9P8Tq9yybLOhQRuCeLIQDGIY4oYY",
authDomain: "sac-it.firebaseapp.com",
databaseURL: "https://sac-it.firebaseio.com",
projectId: "sac-it",
storageBucket: "sac-it.appspot.com",
messagingSenderId: "520393312941"
};
firebase.initializeApp(config);



app.use(fileUpload({
    limits: { fileSize: 50 * 1024 * 1024 },
  }))
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
  }))

app.get('/',(req,res,next)=>{
    load();
    if(!phoneNumber){
        res.redirect("/register");}
    res.sendFile( path.resolve('index.html'));
})

app.get('/register',(req,res)=>{
    res.sendFile( path.resolve('register.html'));
})


app.get('/list',(req,res)=>{
    res.sendFile( path.resolve('list.html'));
})
app.get('/list/api',(req,res)=>{
   res.json(files.filter(file=>file.permission==phoneNumber));
})

app.get('/download/:hash',(req,res)=>{
    running=true;
    let hash = req.params.hash;
    try{
        ipfs.files.get(hash, (err, files)=> {
            files.forEach((file) => {
                
                let i=0;
                let chunks=[];
                let size = 256*2;
                let data= file.content;
                while(i<data.length){
                    console.log(i,data.length,i+size);
                    let chunk = data.slice(i,i+size);
                    i+=size;
                    let decrypted = crypto.privateDecrypt(
                       {
                        key: privateKey,
                       passphrase: phoneNumber,
                       },
                      chunk,
                    );
                    chunks.push(...decrypted);
                    console.log(chunks.length,decrypted.length);
                }
                
                last=Date.now();
                fs.writeFileSync("temp",Buffer.from(chunks));
                res.sendFile(path.resolve("temp"));
                
              })
          })
    }
    catch(msg){
        console.log(msg);
    }
    runnng=false;
 })

app.post('/register',(req,res)=>{
    let phoneNumber = req.body.phoneNumber;
    console.log(req.body);
    if(users.find(user=>user.phoneNumber==phoneNumber)){
        res.send("Your phone number is already registered. Please find your private key.");
        return;
    }

    crypto.generateKeyPair('rsa', {
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

        if(err){
            res.send(err);
            return;
        }
        user={
            phoneNumber,
           lastUpdate:Date.now()
        }
        fs.writeFileSync('data/publicKey.pem',publicKey);
        fs.writeFileSync('data/user.txt',JSON.stringify(user));
        fs.writeFileSync('data/privateKey.pem',privateKey);
        users.push({
           phoneNumber,
           publicKey
       });
        last=Date.now();
        fs.writeFileSync('data/users.blocks',JSON.stringify(users));
    
        res.redirect("/")
          
        // Handle errors and use the generated key pair.
      });
    
    
    
})


app.get('/upload',(req,res)=>{
    res.sendFile(path.resolve('upload.html'))
});

app.post('/upload',async(req,res)=>{
    try{
        let fileData = req.files.file.data;


        let i=0;
        let chunks=[];
        let size = 256;
        while(i<=fileData.length){
            let chunk = fileData.slice(i,i+size);
            i+=size;
            let encryptedData = crypto.publicEncrypt(publicKey, chunk);
            chunks.push(...encryptedData);
        }
        //console.log(chunks);
        
        chunks.flat();
        let data = await ipfs.files.add(Buffer.from(chunks));
        if(files.find(file=>file.hash==data[0].hash)){
            res.redirect("/list");
            return;
        }
        files.push({
            hash:data[0].hash,
           author:phoneNumber,
            permission:phoneNumber,
            date:Date.now(),
            size:fileData.length,
            title:req.body.title,
            description:req.body.description
        })
        last=Date.now();
        fs.writeFileSync('data/files.blocks',JSON.stringify(files));
        res.redirect("/list");
    }
    catch(msg){
        res.send("Failed to open file"+msg);
    }
   
});

app.get('/search',(req,res)=>{
    res.sendFile(path.resolve('search.html'))
});

app.get('/search/:phoneNumber',(req,res)=>{
    res.json(files.filter(file=>file.permission==req.params.phoneNumber));
 })
 let port = 8080;

const listen=()=>{
    app.listen(port).on("error",(err)=>{
        port++;
        listen();
    }).on("listening",()=>{
        console.log("Running on port "+port);
    });
}
listen();


app.get('/me',(req,res)=>{
    res.send(phoneNumber);
})

app.get('/requests',(req,res)=>{
    res.sendFile(path.resolve('requests.html'))
});

app.get('/request/:phoneNumber/:hash',(req,res)=>{
    if(requests.find(request=>request.hash==req.param.hash&&request.requestedBy==phoneNumber))
        {
            res.redirect("/");
            return;
        }
    requests.push({
        hash:req.params.hash,
        requestedBy:phoneNumber,
        author:req.params.phoneNumber,
        date:Date.now()
    })
    last=Date.now();
    fs.writeFileSync('data/requests.blocks',JSON.stringify(requests));
    res.redirect("/")
});

app.get('/requests/api',(req,res)=>{
    let reqs = requests.filter(request=>request.author==phoneNumber).map(request=>{
        let file = files.filter(file=>file.hash==request.hash)[0];
        file.requestedBy=request.requestedBy;
        file.date = request.date;
        return file; 
    })
    res.json(reqs);
});


app.get('/grant/:phoneNumber/:hash',(req,res)=>{
    let hash = req.params.hash;
    try{
        ipfs.files.get(hash, (err, filesX)=> {
            filesX.forEach(async (file) => {
                
                let i=0;
                let chunks=[];
                let size = 256*2;
                let data= file.content;
                while(i<data.length){
                    console.log(i,data.length,i+size);
                    let chunk = data.slice(i,i+size);
                    i+=size;
                    let decrypted = crypto.privateDecrypt(
                        {
                        key: privateKey,
                        passphrase: phoneNumber,
                        },
                        chunk,
                    );
                    chunks.push(...decrypted);
                    console.log(chunks.length,decrypted.length);
                }
                let fileData = Buffer.from(chunks);
                i=0;
                chunks=[];
                size = 256;
                let publicKey = users.filter(user=>user.phoneNumber==req.params.phoneNumber)[0].publicKey;
                console.log(publicKey)
                while(i<=fileData.length){
                    let chunk = fileData.slice(i,i+size);
                    i+=size;
                    let encryptedData = crypto.publicEncrypt(publicKey, chunk);
                    chunks.push(...encryptedData);
                }
                //console.log(chunks);
                
                chunks.flat();
                data = await ipfs.files.add(Buffer.from(chunks));
                if(files.find(file=>file.hash==data[0].hash)){
                    res.redirect("/list");
                    return;
                }
                file = files.filter(i=>i.hash==req.params.hash)[0];
                console.log(files);
                files.push({
                    hash:data[0].hash,
                    author:phoneNumber,
                    permission:req.params.phoneNumber,
                    date:file.date,
                    size:fileData.length,
                    title:file.title,
                    description:file.description
                })
                last=Date.now();
                fs.writeFileSync('data/files.blocks',JSON.stringify(files));
                res.redirect("/");
              })
          })
    }
    catch(msg){
        console.log(msg);
    }
});

app.post('/send/:hash',(req,res)=>{
    let hash = req.params.hash;
    try{
        ipfs.files.get(hash, (err, filesX)=> {
            filesX.forEach(async (file) => {
                
                let i=0;
                let chunks=[];
                let size = 256*2;
                let data= file.content;
                while(i<data.length){
                    console.log(i,data.length,i+size);
                    let chunk = data.slice(i,i+size);
                    i+=size;
                    let decrypted = crypto.privateDecrypt(
                        {
                        key: privateKey,
                        passphrase: phoneNumber,
                        },
                        chunk,
                    );
                    chunks.push(...decrypted);
                    console.log(chunks.length,decrypted.length);
                }
                let fileData = Buffer.from(chunks);
                i=0;
                chunks=[];
                size = 256;
                
                let publicKey = users.filter(user=>user.phoneNumber==req.body.phoneNumber)[0].publicKey;
                console.log(publicKey)
                while(i<=fileData.length){
                    let chunk = fileData.slice(i,i+size);
                    i+=size;
                    let encryptedData = crypto.publicEncrypt(publicKey, chunk);
                    chunks.push(...encryptedData);
                }
                //console.log(chunks);
                
                chunks.flat();
                data = await ipfs.files.add(Buffer.from(chunks));
                if(files.find(file=>file.hash==data[0].hash)){
                    res.redirect("/list");
                    return;
                }
                file = files.filter(i=>i.hash==req.params.hash)[0];
                console.log(files);
                files.push({
                    hash:data[0].hash,
                    author:phoneNumber,
                    permission:req.body.phoneNumber,
                    date:file.date,
                    size:fileData.length,
                    title:file.title,
                    description:file.description
                })
                last=Date.now();
                fs.writeFileSync('data/files.blocks',JSON.stringify(files));
                res.redirect("/");
              })
          })
    }
    catch(msg){
        console.log(msg);
    }
});

app.get('/send/:hash',(req,res)=>{
    res.sendFile( path.resolve('send.html'));
})


const ipfs = ipfsAPI('ipfs.infura.io', '5001', {protocol: 'https'})
let users=[];
let files=[];
let requests=[];
let publicKey;
let privateKey;
let phoneNumber;


const getBlocksFile=(file)=>{
    try{
        let content = fs.readFileSync(file, 'utf-8');
        if(content.length==0){
            return [];
}
        return JSON.parse(content);
    }
    catch(msg){
       // console.log(msg);
        return [];
    }
}

const load=()=>{
    try{
        fs.mkdirSync("data");
        }catch(msg){}
    users = getBlocksFile('data/users.blocks');
    files = getBlocksFile('data/files.blocks');
    requests = getBlocksFile('data/requests.blocks');
    try{
        user = JSON.parse(fs.readFileSync("data/user.txt", 'utf-8'));
        phoneNumber=user.phoneNumber;
        privateKey = fs.readFileSync("data/privateKey.pem", 'utf-8');
        publicKey = fs.readFileSync("data/publicKey.pem", 'utf-8');

    }
    catch(msg){
       // console.log("Failed"+msg);
    }
   
    if(phoneNumber&&!connectCalled&&!running){
        connect();
        connectCalled=true;
    }
}
load();



