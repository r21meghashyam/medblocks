const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const fileUpload = require("express-fileupload");
const routes = require("./routes");

app.use(express.static("assets"));
app.use(
  fileUpload({
    limits: { fileSize: 50 * 1024 * 1024 }
  })
);
app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true
  })
);
app.use("/", routes);

const listen = port => {
    app
      .listen(port)
      .on("error", err => {
        listen(port + 1);
      })
      .on("listening", () => {
        console.log("Running on http://localhost:" + port);
      });
  };
  listen(8080);
