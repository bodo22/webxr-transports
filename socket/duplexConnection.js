import fs from "fs";
import path from "path";
import http from "http";
import https from "https";
import express from "express";
import cors from "cors";
import { Server } from "socket.io";
import msgpackParser from "socket.io-msgpack-parser";
import Cache from "file-system-cache";

const cache = Cache.default({
  basePath: "./.cache", // Optional. Path where cache files are stored (default).
  // ns: "my-namespace", // Optional. A grouping namespace for items.
});

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
      this.waitForVite = setInterval(() => {
        const cert = cache.getSync("cert");
        const key = cache.getSync("key");
        console.log("getting cert & key");
        if (cert && key) {
          console.log("found cert & key");
          this.server = https.createServer({
            key,
            cert,
          });
          clearInterval(this.waitForVite);
          this.waitForVite = undefined;
          this.initialize();
        }
      }, 1000);
    } else {
      this.server = http.createServer(this.app);
      this.initialize();
    }
    this.app.use(cors());
    this.pingPongsPerSec = [];
    this.pingPong = 0;
    this.sockets = {};
  }

  initialize() {
    this.server.on("upgrade", (_, socket) => {
      socket.on("close", () => {
        const { bytesRead, bytesWritten } = socket;
        console.log("read", bytesRead);
        console.log("written", bytesWritten);
      });
    });

    this.server.listen(this.port, () => {
      console.log(
        `socket server ${this.options.parser} listening at :${
          this.port
        }, https: ${!!this.options.secure}`
      );
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
    this.io.of("/").on("connection", this.options.onConnect.bind(this));
    if (this.options.onAdminConnect) {
      this.io
        .of("/admin")
        .on("connection", this.options.onAdminConnect.bind(this));
    }
  }
}
