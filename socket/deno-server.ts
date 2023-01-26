// import * as log from "https://deno.land/std@0.150.0/log/mod.ts";

// await log.setup({
//   handlers: {
//     console: new log.handlers.ConsoleHandler("DEBUG", {
//       formatter: "{datetime} {levelName} {msg}"
//     }),
//   },
//   loggers: {
//     default: {
//       level: "DEBUG",
//       handlers: ["console"],
//     },
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

import DuplexConnection from "./duplexConnection.ts";
// import { onConnect } from "./utils/pingPongSync.js";
// import { onConnect } from "./utils/pingPongAsync.js";
import { onConnect } from "./utils/clientPingPong.js";

await new DuplexConnection({
  port: 3002,
  onConnect,
}).initConnection();

// const io = new Server({
//   cors: {
//     origin: "*",
//   },
// });

// const port = 3003;
// const pingPongs = Infinity;

// io.on("connection", (socket) => {
//     const pingPongsPerSec = [];
//     let n = 0;
//     console.log(`socket ${socket.id} connected`);

//     let interval = setInterval(() => {
//       pingPongsPerSec.push(n);
//       console.log(`${n} ping pongs exchanged, ${pingPongsPerSec.length}`);
//       n = 0;
//       if (pingPongsPerSec.length > 60) {
//         finish();
//       }
//     }, 1000);

//     function finish() {
//       socket.disconnect();
//       clearInterval(interval);
//       const avgPingPongs =
//         pingPongsPerSec.reduce((sum, curr) => sum + curr, 0) /
//         pingPongsPerSec.length;
//       console.log(`${avgPingPongs} average per sec`);
//     }

//     function ping(data) {
//       n++;
//       data.n = n;
//       socket.emit("myPing", data);
//     }
//     ping({
//       position: [123.352313, 45.13412, 0.12412],
//       rotation: [6.098435762, 7.67363345, 1.1984673],
//       scale: [7.1356354324, 1.153376234, 4.13567898],
//       objectId: `my-object-id`,
//     });

//     socket.on("myPong", (data) => {
//       if (data.n < pingPongs) {
//         ping(data);
//       } else {
//         n = 0;
//         finish();
//         // console.log(socket.bytesRead)
//         // console.log(socket.bytesWritten)
//       }
//     });

//     socket.on("disconnect", (reason) => {
//       console.log(`socket ${socket.id} disconnected`);
//     });
// });

// await serve(io.handler(), {
//   port,
// });
