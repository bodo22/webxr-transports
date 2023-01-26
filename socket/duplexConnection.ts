// import * as log from "https://deno.land/std@0.170.0/log/mod.ts";
import { serve } from "https://deno.land/std@0.170.0/http/server.ts";
import { Server, Socket } from "https://deno.land/x/socket_io@0.2.0/mod.ts";

// await log.setup({
//   handlers: {
//     console: new log.handlers.ConsoleHandler("DEBUG"),
//   },
//   loggers: {
//     "socket.io": {
//       level: "DEBUG",
//       handlers: ["console"],
//     },
//     "engine.io": {
//       level: "DEBUG",
//       handlers: ["console"],
//     },
//   },
// });

interface Options {
  parser?: any;
  onConnect: Function;
  port: Number;
}

export default class DuplexConnection {
  parser: any;
  app: any;
  port: Number;
  io: any;
  pingPongsPerSec: any;
  pingPong: any;
  sockets: { [key: string]: Socket };
  interval: any;
  options: Options

  constructor(options: Options = { onConnect: () => {}, port: 3002 }) {
    this.options = options;
    this.parser = options.parser;
    this.port = options.port;
    this.pingPongsPerSec = [];
    this.pingPong = 0;
    this.sockets = {};

    const config = {
      // transports: ["websocket"],
      cors: {
        origin: "*",
      },
    };
    this.io = new Server(config);
    this.io.on("connection", options.onConnect.bind(this));
    this.io.on("upgrade", () => {
      console.log("upgraded");
      // boundPing()
    });
  }

  async initConnection() {
    await serve(this.io.handler(), {
      port: this.port,
    });
  }
}
