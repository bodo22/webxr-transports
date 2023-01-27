import json from "../../public/handData/handData1.json" assert { type: "json" };

export async function onDisconnect(socket, reason) {
  console.log(`socket ${socket.id} disconnected`);
  delete this.sockets[socket.id];
  broadcastConnectedUsers.call(this);
}

function broadcastConnectedUsers() {
  this.io.emit("connectedUsers", Object.keys(this.sockets));
  this.io.of("/admin").emit("connectedUsers", Object.keys(this.sockets));
}

export function onAdminConnect(socket) {
  broadcastConnectedUsers.call(this);
  socket.on("fakeHandDatas", (fakeHandDatas) => {
    fakeHandDatas.forEach(({ fakeId, socketId, isFakeHandsClient, handData }, index) => {
      if (!socketId) {
        this.io.emit("handData", { userId: fakeId, handData }); // send fakers without connected fake client to all
      }
      if (this.sockets[socketId]) {
        if (isFakeHandsClient) {
          this.sockets[socketId].to("handRoom").emit("handData", {
            userId: socketId,
            handData,
          });
        }
        this.sockets[socketId].emit("privateHandData", handData); // send "self" to fake client
      }
    });
  });
}

export async function onConnect(socket) {
  console.log(`socket ${socket.id} connected`);
  socket.on("disconnect", onDisconnect.bind(this, socket));
  socket.on("error", console.error.bind(console));
  socket.on("message", console.log.bind(console));

  this.sockets[socket.id] = socket;
  socket.emit("userId", socket.id)
  socket.join("handRoom");

  broadcastConnectedUsers.call(this);

  socket.on("handData", (data) => {
    socket.to("handRoom").emit("handData", data);
  });
  
}
