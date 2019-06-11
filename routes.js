const router = require("express").Router();
const fs = require("fs");
const path = require("path");
var ipfsAPI = require("ipfs-api");
const crypto = require("crypto");
const ipfs = ipfsAPI("ipfs.infura.io", "5001", { protocol: "https" });

const fetchFile = file => {
  try {
    let content = fs.readFileSync(file, "utf-8");
    if (content.length == 0) {
      return [];
    }
    return JSON.parse(content);
  } catch (msg) {
    console.error(msg);
    return [];
  }
};

const fetchRequests = () => {
  return fetchFile("data/requests.blocks");
};

const fetchFiles = () => {
  return fetchFile("data/files.blocks");
};

const fetchUsers = () => {
  return fetchFile("data/users.blocks");
};

const fetchUser = () => {
  try{
  let user = fetchFile("data/user.txt");
  user.privateKey = fs.readFileSync("data/privateKey.pem", "utf-8");
  user.publicKey = fs.readFileSync("data/publicKey.pem", "utf-8");
  return user;
  }
  catch(msg){
    return null;
  }
};

const uploadFile = async (file, fileDescription) => {
  let user = fetchUser();
  let users = fetchUsers();
  let chunks = [];
  let encryptSize = 256;
  console.log("Node: Encrypting file");
  let publicKey = users.find(
    user => user.aadharNumber == fileDescription.permission
  ).publicKey;
  for (let i = 0; i < file.data.length; i += encryptSize) {
    console.log(Math.floor(i/file.data.length*100)+"%");
    let chunk = file.data.slice(i, i + encryptSize);
    let encryptedData = crypto.publicEncrypt(publicKey, chunk);
    chunks.push(...encryptedData);
  }
  chunks.flat();
  console.log("Node: File encrypted");
  console.log("IPFS: Uploading file");
  let data = await ipfs.files.add(Buffer.from(chunks));
  console.log("IPFS: File uploaded");
  let hash = data[0].hash;
  let files = fetchFiles();
  if (files.find(file => file.hash == hash)) return;
  fileDescription.name = file.name;
  fileDescription.mimetype = file.mimetype;
  fileDescription.hash = hash;
  fileDescription.date = Date.now();
  fileDescription.size = file.length;
  files.push(fileDescription);
  fs.writeFileSync("data/files.blocks", JSON.stringify(files));
};

const downloadFile = async hash => {
  const user = fetchUser();
  const decryptSize = 256 * 2;
  console.log("IPFS: Downloading file");
  const file = (await ipfs.files.get(hash))[0];
  console.log("IPFS: File Downloaded");
  let chunks = [];
  console.log("Node: Decrypting file");
  for (i = 0; i < file.content.length; i += decryptSize) {
    console.log(Math.floor(i/file.content.length*100)+"%");
    let chunk = file.content.slice(i, i + decryptSize);
    let decrypted = crypto.privateDecrypt(
      {
        key: user.privateKey,
        passphrase: user.aadharNumber
      },
      chunk
    );
    chunks.push(...decrypted);
  }
  console.log("Node: File decrypted");
  return Buffer.from(chunks);
};

//ROUTES
router.get("/register", (req, res) => {
  res.sendFile(path.resolve("views/register.html"));
});

router.get("/list", (req, res) => {
  res.sendFile(path.resolve("views/list.html"));
});

router.get("/upload", (req, res) => {
  res.sendFile(path.resolve("views/upload.html"));
});

router.get("/search", (req, res) => {
  res.sendFile(path.resolve("views/search.html"));
});

router.get("/send/:hash", (req, res) => {
  res.sendFile(path.resolve("views/send.html"));
});

router.get("/requests", (req, res) => {
  res.sendFile(path.resolve("views/requests.html"));
});

router.get("/me.html", (req, res) => {
  res.sendFile(path.resolve("views/me.html"));
});

router.get("/view/:hash", (req, res) => {
  res.sendFile(path.resolve("views/view.html"));
});

router.get("/", (req, res, next) => {
  let user = fetchUser();
  if (!user) {
    res.redirect("/register");
  }
  res.sendFile(path.resolve("views/index.html"));
});

router.get("/me", (req, res) => {
  try{
  let user = fetchUser();
    res.send(user.aadharNumber);
  }
  catch(msg){
    res.send('error');
  }
});

router.post("/register", (req, res) => {
  let users = [];
  let aadharNumber = req.body.aadharNumber;
  crypto.generateKeyPair(
    "rsa",
    {
      modulusLength: 4 * 1024,
      publicKeyEncoding: {
        type: "spki",
        format: "pem"
      },
      privateKeyEncoding: {
        type: "pkcs8",
        format: "pem",
        cipher: "aes-256-cbc",
        passphrase: aadharNumber
      }
    },
    (err, publicKey, privateKey) => {
      if (err) {
        res.send(err);
        return;
      }
      user = {
        aadharNumber,
        lastUpdate: Date.now()
      };
      if(!fs.existsSync("data"))
        fs.mkdirSync("data");
      fs.writeFileSync("data/publicKey.pem", publicKey);
      fs.writeFileSync("data/user.txt", JSON.stringify(user));
      fs.writeFileSync("data/privateKey.pem", privateKey);
      users.push({
        aadharNumber,
        publicKey
      });
      fs.writeFileSync("data/users.blocks", JSON.stringify(users));
      fs.writeFileSync("data/files.blocks", JSON.stringify([]));
      fs.writeFileSync("data/requests.blocks", JSON.stringify([]));
      res.redirect("/");
    }
  );
});

router.get("/api/requests", (req, res, next) => {
  let requests = fetchRequests();
  let files = fetchFiles();
  let user = fetchUser();
  requests = requests
    .filter(request => request.author == user.aadharNumber && !request.granted)
    .map(request => {
      let file = files.filter(file => file.hash == request.hash)[0];
      file.requestedBy = request.requestedBy;
      file.date = request.date;
      return file;
    });
  res.json(requests);
});

router.get("/api/list", (req, res) => {
  let files = fetchFiles();
  let user = fetchUser();
  res.json(files.filter(file => file.permission == user.aadharNumber));
});

router.get("/download/:hash", async (req, res) => {
  let files = fetchFiles();
  let data = await downloadFile(req.params.hash);
  let file = files.find(file=>file.hash==req.params.hash);
  console.log(file);
  if(!fs.existsSync("temp"))
      fs.mkdirSync("temp");
  fs.writeFileSync(path.resolve("temp/"+file.name), data);
  res.download(path.resolve("temp/"+file.name));
});

router.post("/upload", async (req, res) => {
  let user = fetchUser();
  let fileDescription = {
    title: req.body.title,
    description: req.body.description,
    permission: user.aadharNumber,
    author: user.aadharNumber
  };
  
  await uploadFile(req.files.file, fileDescription);
  res.redirect("/list");
});

router.get("/search/:aadharNumber", (req, res) => {
  let files = fetchFiles();
  res.json(files.filter(file => file.permission == req.params.aadharNumber));
});

router.get("/request/:aadharNumber/:hash", (req, res) => {
  let user = fetchUser();
  let requests = fetchRequests();
  if (
    requests.find(
      request =>
        request.hash == req.params.hash &&
        request.requestedBy == user.aadharNumber
    )
  ) {
    res.redirect("/");
    return;
  }
  console.log(req.params,user.aadharNumber);
  if (req.params.aadharNumber==user.aadharNumber) {
    res.redirect("/");
    return;
  }
  requests.push({
    hash: req.params.hash,
    requestedBy: user.aadharNumber,
    author: req.params.aadharNumber,
    date: Date.now()
  });
  fs.writeFileSync("data/requests.blocks", JSON.stringify(requests));
  res.redirect("/");
});

router.get("/grant/:aadharNumber/:hash", async (req, res) => {
  let hash = req.params.hash;
  let files = fetchFiles();
  let requests = fetchRequests();
  let file = await downloadFile(hash);
  let fileDescription = files.find(file => file.hash == hash);
  fileDescription.permission = req.params.aadharNumber;
  await uploadFile(file, fileDescription);
  let index = requests.findIndex(request=>request.hash==hash);
  requests[index].granted=true;
  fs.writeFileSync("data/requests.blocks", JSON.stringify(requests));
  res.redirect("/");
});

router.post("/send/:hash", async (req, res) => {
  let hash = req.params.hash;
  let files = fetchFiles();
  let file = await downloadFile(hash);
  let fileDescription = files.find(file => file.hash == hash);
  fileDescription.permission = req.body.aadharNumber;
  await uploadFile(file, fileDescription);
  res.redirect("/");
});

router.get("/data", (req, res) => {
  try{
    let files = fetchFiles();
    let users = fetchUsers();
    let requests = fetchRequests();
    let user = fetchUser();
    let data = {
      files,
      users,
      requests
    };
    if(!user)
    data.error=true;
    res.json(data);
  }
  catch(msg){
    res.json({error:true});
  }

});

router.post("/update", (req, res) => {
  try {
    let files = fetchFiles();
    let users = fetchUsers();
    let requests = fetchRequests();

    let data = req.body;
    let _files = data.files || [];
    let _users = data.users || [];
    let _requests = data.requests || [];
    _files.forEach(_file => {
      if (!files.find(file => file.hash == _file.hash)) {
        files.push(_file);
      }
    });
    fs.writeFileSync("data/files.blocks", JSON.stringify(files));

    _users.forEach(_user => {
      if (!users.find(user => user.aadharNumber == _user.aadharNumber)) {
        users.push(_user);
      }
    });
    fs.writeFileSync("data/users.blocks", JSON.stringify(users));

    _requests.forEach(_request => {
      if (
        !requests.find(
          request =>
            request.requestedBy == _request.requestedBy &&
            request.hash == _request.hash
        )
      ) {
        requests.push(_request);
      }
    });
    fs.writeFileSync("data/requests.blocks", JSON.stringify(requests));

    res.json({ status: 200 });
  } catch (msg) {
    console.error(msg);
  }
});

module.exports = router;
