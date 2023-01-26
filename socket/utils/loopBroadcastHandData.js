import { onDisconnect } from "./pingPongSync.js";
import json from "../../handData/handData1.json" assert { type: "json" };

export async function onConnect(socket) {
  console.log(`socket ${socket.id} connected`);
  socket.on("disconnect", onDisconnect.bind(this, socket));
  socket.on("error", console.error.bind(console));
  socket.on("message", console.log.bind(console));

  this.sockets[socket.id] = socket;

  socket.join("handRoom");

  let frame = 0;

  // socket.on("handData", (data) => {
  //   // console.log(data);
  //   socket.to("handRoom").emit("handData", data);
  // });

  if (!this.sendHandDataInterval) {
    this.sendHandDataInterval = setInterval(() => {
      const data = {
        left: json[frame].left,
        right: json[frame].right,
        time: Date.now(),
      };
      // console.log(data);
      this.io.in("handRoom").emit("handData", data);
      // this.io.in("handRoom").emit("handData", 'hello');
      frame++;
      if (frame > json.length - 1) {
        frame = 0;
      }
    }, 50);
  }

  // startInterval.call(this, socket);
}
