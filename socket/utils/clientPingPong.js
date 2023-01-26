import { onDisconnect, startInterval } from "./pingPongSync.js";

export async function onConnect(socket) {
  console.log(`socket ${socket.id} connected`);
  socket.on("disconnect", onDisconnect.bind(this, socket));
  socket.on("error", console.error.bind(console));
  socket.on("message", console.log.bind(console));

  this.sockets[socket.id] = socket;

  socket.join("handRoom");
  socket.on("handData", (data) => {
    this.pingPong++;
    socket.to("handRoom").emit("handData", data);
  });

  startInterval.call(this, socket);
}
