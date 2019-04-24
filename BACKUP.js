const crypto = require('crypto');
const fs = require("fs");
const ipfsAPI = require('ipfs-api');
const app = require('express')();
const path = require('path');
const bodyParser = require('body-parser');
const fileUpload = require('express-fileupload');
var Peer = require('simple-peer')
var wrtc = require('wrtc')
const firebase = require('firebase');
let start = Date.now();
let last=0;

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

var con = null;
let c1=false,c2=false;

var peer1 = new Peer({ initiator: true, trickle: false , wrtc })
var peer2 = new Peer({wrtc});
peer1.on('signal',(data)=>{
    console.log("signal on peer1");
    data.timestamp=Date.now();
    firebase.firestore().doc("p1/"+phoneNumber).set(data);
});
peer2.on('signal',(data)=>{
    console.log("signal on peer2");
    data.timestamp=Date.now();
    firebase.firestore().doc("p2/"+phoneNumber).set(data);
})

x=async ()=>{
    
    peer1.send("test");
}
y=async ()=>{
   
    peer2.send("test");
}
peer1.on('connect', x);
peer1.on('data', function (data) {
    // console.log('data1: ' + JSON.stringify(data));
    // console.log(data.length)
    // console.log(data.toString())
    read(data);
    c1=true;
    con = peer1;
  })

peer2.on('connect', x);
peer2.on('data', function (data) {
    // console.log('data2: ' + JSON.stringify(data));
    // console.log(data.length)
    // console.log(data.toString())
    read(data);
    c2=true;
    con = peer2;

})


const read=(data)=>{
    if(!phoneNumber)
     return;
    console.log(data.length+" bytes recieved");
    try{
        let d = JSON.parse(data);
        console.log(d.last);
        let local = {
            files,
            users,
            requests,
            last: last
        }
        if(d.last>last&&JSON.stringify(data).length>JSON.stringify(local).length){
            console.log("Updating...");
            if(d.files){
                files=d.files;
                fs.writeFileSync('data/files.blocks',JSON.stringify(files));
            }
            if(d.users){
                users=d.users;
                fs.writeFileSync('data/users.blocks',JSON.stringify(users));
            }
            if(d.requests){
                requests=d.requests;
                last=Date.now();
                fs.writeFileSync('data/requests.blocks',JSON.stringify(requests));
            }
        }
    }
    catch(msg){
        console.log(msg);
    }
}

firebase.firestore().collection("p1").where("timestamp",">",start).onSnapshot(snap=>{
    console.log("firebase p1");
    snap.forEach(doc=>{
        if(doc.id!=phoneNumber){
            peer2.signal(doc.data());
        }
    })
})

firebase.firestore().collection("p2").where("timestamp",">",start).onSnapshot(snap=>{
    console.log("firebase p2");

    snap.forEach(doc=>{
        if(doc.id!=phoneNumber){
            peer1.signal(doc.data());
        }
    })
})


/*
peer1.on('signal', function (data) {
  // when peer1 has signaling data, give it to peer2 somehow
  peer2.signal(data)
})
 
peer2.on('signal', function (data) {
  // when peer2 has signaling data, give it. to peer1 somehow
  peer1.signal(data)
})
 
peer1.on('connect', function () {
  // wait for 'connect' event before using the data channel
  peer1.send('hey peer2, how is it going?')
})
 
peer2.on('data', function (data) {
  // got a data channel message
  console.log('got a message from peer1: ' + data)
})
  

 peer1.on('signal', function (data) {
    firebase.firestore().collection("connections").add(data);
    firebase.firestore().collection("connections").onSnapshot(snapshot=>{
        snapshot.forEach(doc=>{
            try{
               // console.log(doc.data());
             peer1.signal(doc.data());
            }
            catch(msg){
             //   console.log(msg);
            }
        })
    })
  })

  peer1.on('connect', function () {
    // wait for 'connect' event before using the data channel
    peer1.send('hey peer2, how is it going?')
  })

  peer1.on('data', function (data) {
    // got a data channel message
    console.log('got a message from peer1: ' + data)
  })
*/

app.use(fileUpload({
    limits: { fileSize: 50 * 1024 * 1024 },
  }))
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
  }))

app.get('/',(req,res)=>{
    load();
    if(!phoneNumber)
        res.redirect("/register");
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
app.listen(8080);

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
                console.log(users,req.params);
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

app.get('/send/:hash',(req,res)=>{
    let hash = req.params.hash;
    let phoneNumber = req.body.phoneNumber;
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

app.get('/send/:hash',(req,res)=>{
    res.sendFile( path.resolve('send.html'));
})

app.post('/send/:hash',(req,res)=>{
    res.sendFile( path.resolve('send.html'));
})


const ipfs = ipfsAPI('ipfs.infura.io', '5001', {protocol: 'https'})
let users=[];
let files=[];
let requests=[];
let publicKey;
let privateKey;
let phoneNumber;

//add phone number & public key to users blockchain on register
//no login maybe locally for saftey

// files=[
//     {
//         ipfs:"1111",
//         description:"",
//         type:"image/jpeg",
//         to:"8123928667"
//     },
// ]


// list

const getBlocksFile=(file)=>{
    try{
        let content = fs.readFileSync(file, 'utf-8');
        if(content.length==0)
            return [];
        return JSON.parse(content);
    }
    catch(msg){
        console.log(msg);
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
        console.log("Failed"+msg);
    }
}
load();

setInterval(()=>{
    load();
    console.log(users);
    console.log(c1,c2);
    let data = {
        files,
        users,
        requests,
        last: last
    }
    if(con){
        con.send(JSON.stringify(data));
        
    }
},5000)

/*
const register=async ()=>{
    let phoneNumber = await promptly.prompt("Enter your phone number: ");
    if(users.find(user=>user.phoneNumber==phoneNumber)){
        console.log("Your phone number is already registered. Please find your private key.");
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
        console.log(phoneNumber)

          console.log(err,publicKey,privateKey);
        if(err){
            console.log(err);
            return;
        }
        fs.writeFileSync('data/publicKey.pem',publicKey);
        fs.writeFileSync('data/phoneNumber.txt',phoneNumber);
        fs.writeFileSync('data/privateKey.pem',privateKey);
        users.push({
            phoneNumber,
            publicKey
        });
        fs.writeFileSync('data/users.blocks',JSON.stringify(users));
    
        console.log("Registration successfull.")
          
        // Handle errors and use the generated key pair.
      });
    
    
    
}
const checkRegistered=async ()=>{
    try{
    let privateKey = fs.readFileSync('data/privateKey.pem', 'utf-8');
    return true;
    }
    catch(msg){
        console.log("Not registered");
        return false;
    }
    
   
}


const addFile=async()=>{
    let file = await promptly.prompt("Enter file path: ");
    try{
        let fileData = fs.readFileSync(file);
        let i=0;
        let chunks=[];
        let size = 256;
        while(i<=fileData.length){
            let chunk = fileData.slice(i,i+size);
            i+=size;
            let encryptedData = crypto.publicEncrypt(publicKey, chunk);
            chunks.push(...encryptedData);
            console.log(encryptedData.length,chunks.length);
        }
        //console.log(chunks);
        
        chunks.flat();
        console.log(chunks.length);
        let data = await ipfs.files.add(Buffer.from(chunks));
        console.log(data);
        if(files.find(file=>file.hash==data[0].hash)){
            return;
        }
        files.push({
            hash:data[0].hash,
            author:phoneNumber
        })
        fs.writeFileSync('data/files.blocks',JSON.stringify(files));
    }
    catch(msg){
        console.log("Failed to open file"+msg);
    }
}

const getFile=async()=>{
    let hash = await promptly.prompt("Enter file hash: ");
    let path = await promptly.prompt("Enter file path: ");
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
                console.log(chunks.length);
                fs.writeFileSync(path,Buffer.from(chunks));
                console.log("File downloaded: "+path);
              })
          })
    }
    catch(msg){
        console.log(msg);
    }
}

const main=async ()=>{
    
    console.log(`!!MEDBLOCKS!!`);
    await load();
    if(!await checkRegistered())
       await register();
    console.log("1. Upload File");
    console.log("2. Download File");
    let option = await promptly.prompt("Enter option");
    console.log(option);
    switch(Number(option)){
        case 1: await addFile();break;
        case 2: await getFile();break;
    }
}

main();
*/