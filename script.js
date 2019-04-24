var config = {
    apiKey: "AIzaSyBiv8n9P8Tq9yybLOhQRuCeLIQDGIY4oYY",
    authDomain: "sac-it.firebaseapp.com",
    databaseURL: "https://sac-it.firebaseio.com",
    projectId: "sac-it",
    storageBucket: "sac-it.appspot.com",
    messagingSenderId: "520393312941"
    };
    firebase.initializeApp(config);
    
const connect=async()=>{
    const peer = new Peer({key:"MyKey"});
    let response = await fetch("/me");
    let phoneNumber = await response.text();
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
                    if(data.phoneNumber==phoneNumber)
                        return;
                    console.log(data.id);
                    let conn = peer.connect(data.id,{
                        label: data.phoneNumber,
                        serialization:'json'
                    });
                    
                    
                })
        });

    })
    console.log("PEER",peer);
    peer.on("connection",(conn)=>{
        console.log("CONN",conn);

      conn.on('open', function() {
        console.log(`Connected to ${conn.peer}`);
        conn.send({ value: 'hello' });
        console.log("Sent");
    });
    conn.on('data', function(data) {
        console.log('Received', data);
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
   
}
