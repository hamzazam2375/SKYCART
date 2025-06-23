const express = require("express");
const sql = require("mssql");
const cors = require("cors");
const bcrypt = require('bcrypt');  // If using bcrypt
const app = express();
app.use('/img', express.static('backend/img'));
app.use(cors());
const config = {
  user: "wf",
  password: "1234",
  server: "DESKTOP-8JS4PV8",
  database: "Projectfin",
  options: {
    trustServerCertificate: true,
    trustedConnection: false,
    instancename: "SQLEXPRESS",
  },
  port: 1433,
};




app.get("/", (req, res) => {
  return res.json("backend yo");
});
app.listen(3000, () => {
  console.log("server has started");
});
