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
      isSessionSupported: socket.handshake.query.isSessionSupported,
    };
  });
  this.io.emit("connectedUsers", connectedUsers);
  this.io.of("/admin").emit("connectedUsers", connectedUsers);
}

export function onAdminConnect(socket) {
  broadcastConnectedUsers.call(this);
  socket.on("fakeHandDatas", (fakeHandDatas) => {
    fakeHandDatas.forEach(
      ({ fakeId, socketId, isSessionSupported, handData }, index) => {
        const clientSocket = this.sockets[socketId];
        if (!socketId) {
          this.io.to("handRoom").emit("handData", { userId: fakeId, handData }); // send fakers without connected fake client to all
        } else if (clientSocket && isSessionSupported) {
          clientSocket
            .to("handRoom")
            .emit("handData", { userId: socketId, handData });
          clientSocket.emit("handData", { userId: socketId, handData }); // send "self" to non session-supporting client
        }
      }
    );
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
}
