const peer = new Peer();
peer.on("open", async id => {
  console.log("Your peer id: " + id);
  let response = await fetch("/me");
  let aadharNumber = await response.text();
  firebase
    .firestore()
    .doc("peers/" + id)
    .set({
      aadharNumber,
      id,
      timestamp: Date.now()
    });

  firebase
    .firestore()
    .collection("peers")
    .onSnapshot(snap => {
      snap.forEach(doc => {
        let data = doc.data();

        if (data.aadharNumber == aadharNumber) {
          return;
        }

        let conn = peer.connect(data.id, {
          label: data.aadharNumber,
          serialization: "json"
        });
      });
    });
});

peer.on("connection", conn => {
  console.log("Connected");
  conn.on("data", function(data) {
    fetch("/update", {
      method: "POST",
      body: JSON.stringify(data),
      headers: {
        "Content-Type": "application/json"
      }
    });
  });
  conn.on("error", error => {
    console.log(`Peer error on ${conn.label} (${conn.id}): ${error}`);
  });
});
peer.on("close", () => {
  console.log("Connection was closed");
});
peer.on("disconnected", () => {
  console.log("Got disconnected");
});
peer.on("error", err => {
  let id = err.message.match(/[\w\d]+$/)[0];
  firebase
    .firestore()
    .doc("peers/" + id)
    .delete();
  //console.log("Peer error occurred: ",err.type);
});

const sendData = async () => {
  try {
    let response = await fetch("/data");
    let data = await response.json();
    if (data.error) window.location = "/register";
    Object.keys(peer.connections).map(conn => {
      if (peer.connections[conn][0].open) {
        peer.connections[conn][0].send(data);
        peer.connections[conn][1].send(data);
      }
    });
  } catch (msg) {
    console.log(msg);
  }
};
setInterval(sendData, 5000);
sendData();

window.onload = async () => {
  let input = document.querySelector("input");
  if (!input) return;
  let button = document.querySelector("button");
  if (input.name == "aadharNumber") {
    button.disabled = true;
    input.addEventListener("change", event => {
      let value = event.target.value;
      if (!value.match(/\d{4}-\d{4}-\d{4}-\d{4}/))
        alert("Invalid Aadhar Number!");
      else button.disabled = false;
    });
  }
};
