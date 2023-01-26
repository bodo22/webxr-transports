export async function ping(socket, data) {
  // console.log('myPing');
  this.pingPong++;
  data.n = this.pingPong;
  socket.emit("myPing", data);
}

export async function onDisconnect(socket, reason) {
  console.log(`socket ${socket.id} disconnected`);
  delete this.sockets[socket.id];
}

async function finish() {
  clearInterval(this.interval);
  this.interval = null;
  Object.values(this.sockets).forEach((socket) => {
    socket.disconnect();
  });
  const avgPingPongs =
    this.pingPongsPerSec.reduce((sum, curr) => sum + curr, 0) /
    this.pingPongsPerSec.length;
  console.log(`${avgPingPongs} average per sec`);
  this.pingPongsPerSec = [];
}

export async function startInterval(socket) {
  if (this.interval) {
    return;
  }
  this.interval = setInterval(() => {
    this.pingPongsPerSec.push(this.pingPong);
    console.log(
      `${this.pingPong} ping pongs exchanged, ${
        Object.keys(this.sockets).length
      } connected sockets ${this.pingPongsPerSec.length}`
    );
    this.pingPong = 0;
    if (this.pingPongsPerSec.length >= 300) {
      console.log("!!finished!!");
      finish.call(this);
    }
  }, 1000);
}

export async function onConnect(socket) {
  console.log(
    `socket ${socket.id} connected on port ${this.port} (${this.options.parser})`
  );

  socket.on("myPong", ping.bind(this, socket));
  socket.on("disconnect", onDisconnect.bind(this, socket));

  this.sockets[socket.id] = socket;
  ping.call(this, socket, {
    position: [123.352313, 45.13412, 0.12412],
    rotation: [6.098435762, 7.67363345, 1.1984673],
    scale: [7.1356354324, 1.153376234, 4.13567898],
    objectId: "my-object-id",
  });
  startInterval.call(this, socket);
}
