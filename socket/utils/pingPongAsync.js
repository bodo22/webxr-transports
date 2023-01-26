import { ping, onDisconnect, startInterval } from "./pingPongSync.js";

async function handlePong(socket) {
  this.pingPong++;
}

export async function onConnect(socket) {
  console.log(`socket ${socket.id} connected`);
  socket.on("myPong", handlePong.bind(this, socket));
  socket.on("disconnect", onDisconnect.bind(this, socket));
  socket.on("error", console.error.bind(console));
  socket.on("message", console.log.bind(console));

  startInterval.call(this, socket);
  const data = {
    position: [123.352313, 45.13412, 0.12412],
    rotation: [6.098435762, 7.67363345, 1.1984673],
    scale: [7.1356354324, 1.153376234, 4.13567898],
    objectId: "my-object-id",
  };
  socket.client.conn.on("drain", ping.bind(this, socket, data));
  ping.call(this, socket, data);
}
