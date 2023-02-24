import json from "../../public/handData/handData1.json" assert { type: "json" };

export async function onDisconnect(socket, reason) {
  console.log(`socket ${socket.id} disconnected`);
  delete this.sockets[socket.id];
  broadcastConnectedUsers.call(this);
}

function broadcastConnectedUsers() {
  const connectedUsers = Object.values(this.sockets).map((socket) => {
    return {
      socketId: socket.id,
      userId: socket.id,
      isSessionSupported: socket.handshake.query.isSessionSupported === "true",
    };
  });
  this.io.emit("connectedUsers", connectedUsers);
  this.io.of("/admin").emit("connectedUsers", connectedUsers);
}

export function onAdminConnect(socket) {
  broadcastConnectedUsers.call(this);
  socket.on("fakeHandDatas", (fakeHandDatas) => {
    fakeHandDatas.forEach((data) => {
      // send data for fake clients & clients that don't support WebXR sessions
      this.io.to("handRoom").emit("handData", data);
    });
  });
  socket.on("userUpdate", (users) => {
    socket.emit("userId", socket.id);
    this.io.to("handRoom").emit("userUpdate", users);
  });
  socket.on("handViewChange", (event) => {
    this.io.to("handRoom").emit("handViewChange", event);
  });
}

export async function onConnect(socket) {
  console.log(`socket ${socket.id} connected`);
  socket.on("disconnect", onDisconnect.bind(this, socket));
  socket.on("error", console.error.bind(console));
  socket.on("message", console.log.bind(console));

  this.sockets[socket.id] = socket;
  socket.emit("userId", socket.id);
  socket.join("handRoom");

  broadcastConnectedUsers.call(this);

  socket.on("handData", (data) => {
    socket.to("handRoom").emit("handData", data);
  });

  socket.on("pinchData", (data) => {
    socket.to("handRoom").emit("pinchData", data);
    // this.io.to("handRoom").emit("pinchData", data);
  });
}
