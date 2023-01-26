import fs from "fs";
import path from "path";
import http from "http";
import https from "https";
import express from "express";
import cors from "cors";
import { Server } from "socket.io";
import msgpackParser from "socket.io-msgpack-parser";

const parserMap = {
  default: "",
  msgpack: msgpackParser,
};
const __dirname = path.resolve();
export default class DuplexConnection {
  constructor(options = { port: 3003, secure: false }) {
    this.options = options;
    this.parser = parserMap[options.parser];
    this.app = express();
    this.port = options.port;
    if (this.options.secure) {
      // https://stackoverflow.com/a/35231213
      // openssl req -newkey rsa:2048 -new -nodes -x509 -days 3650 -keyout key.pem -out cert.pem
      this.server = https.createServer({
        key: fs.readFileSync(path.resolve(__dirname, "key.pem")),
        cert: fs.readFileSync(path.resolve(__dirname, "cert.pem"))
      });
    } else {
      this.server = http.createServer(this.app);
    }
    this.app.use(cors());
    this.pingPongsPerSec = [];
    this.pingPong = 0;
    this.sockets = {};

    this.server.on("upgrade", (_, socket) => {
      socket.on("close", () => {
        const { bytesRead, bytesWritten } = socket;
        console.log("read", bytesRead);
        console.log("written", bytesWritten);
      });
    });

    this.server.listen(this.port, () => {
      console.log(`socket server ${options.parser} listening at :${this.port}, https: ${!!this.options.secure}`);
    });

    const config = {
      // transports: ["websocket"],
      cors: {
        origin: "*",
      },
      // path: '/socket.io'
    };
    if (this.parser) {
      config.parser = this.parser;
    }
    this.io = new Server(this.server, config);
    this.io.on("connection", options.onConnect.bind(this));
  }
}
