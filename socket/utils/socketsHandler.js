import { Matrix4, Quaternion, Vector3 } from "three";

let state = {
  pieces: [],
  piecesTransforms: [],
  fidelity: { level: "virtual" },
  level: { studyMode: true },
};

export async function onDisconnect(socket, reason) {
  console.log(`socket ${socket.id} disconnected`);
  delete this.sockets[socket.id];
  broadcastConnectedUsers.call(this);
}

function sendHandDataToSockets(sockets, data) {
  data.fidelity = state.fidelity;
  sockets.forEach((socket) => {
    socket.emit("handData", data);
  });
}

function broadcastConnectedUsers() {
  const connectedUsers = Object.values(this.sockets).map((socket) => {
    return {
      socketId: socket.id,
      userId: socket.id,
      isSessionSupported: socket.handshake.query.isSessionSupported === "true",
    };
  });
  this.io.emit("level", state.level);
  this.io.emit("connectedUsers", connectedUsers);
  this.io.of("/admin").emit("connectedUsers", connectedUsers);
}
const broadcastEvents = [
  "userUpdate",
  "reset",
  "handView",
  "pieces",
  "debug",
  "fidelity",
  "level",
];

const syncEventsToServer = ["pieces", "fidelity", "level"];

export function onAdminConnect(socket) {
  broadcastConnectedUsers.call(this);
  socket.onAny((eventName, ...args) => {
    if (broadcastEvents.includes(eventName)) {
      this.io.to("handRoom").emit(eventName, ...args);
    }
    if (syncEventsToServer.includes(eventName)) {
      state[eventName] = args[0];
    }
    switch (eventName) {
      case "reset": {
        state.piecesTransforms = [];
        const pieces = state.pieces.map((piece) => ({
          ...piece,
          key: `${piece.name}-${Date.now()}`,
        }));
        this.io.to("handRoom").emit("pieces", pieces);
        break;
      }
      case "userUpdate": {
        socket.emit("userId", socket.id);
        break;
      }
      case "fakeHandDatas": {
        args[0].forEach((data) => {
          // send data for fake clients & clients that don't support WebXR sessions
          sendHandDataToSockets(Object.values(this.sockets), data);
        });
        break;
      }
      default:
        break;
    }
  });
  this.io.to("handRoom").emit("pieces", state.pieces);
}

function isEmitDisposable(data, curr) {
  let isDisposable = false;
  const incomingPinchIsOlder =
    curr?.pinchStart && data.pinchStart < curr.pinchStart;
  const pinchStartOverlap =
    curr?.pinchStart && data.pinchStart === curr.pinchStart;
  if (incomingPinchIsOlder || pinchStartOverlap) {
    if (incomingPinchIsOlder) {
      // console.log("incoming is older", curr.pinchStart, data.pinchStart);
      isDisposable = true;
    }
    const incomingPinchHasDifferentUserId =
      curr?.userId && data.userId !== curr.userId;
    if (pinchStartOverlap && incomingPinchHasDifferentUserId) {
      // console.log("pinchstart overlap but diff userId", curr, data);
      isDisposable = true;
    }
  }
  return isDisposable;
}

function updatePiecesProps(data, index) {
  const newPiecesTransforms = [...state.piecesTransforms];
  newPiecesTransforms.splice(
    index === -1 ? newPiecesTransforms.length : index,
    index === -1 ? 0 : 1,
    data
  );
  state.piecesTransforms = newPiecesTransforms;
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
  const initialPiecesProps = state.pieces.map((piece) => {
    const initialPinchTransform = state.piecesTransforms.find(
      (p) => p.name === piece.name
    );
    let newProps = {};
    if (initialPinchTransform) {
      const matrix = new Matrix4();
      matrix.elements = initialPinchTransform.matrix;
      newProps = {
        position: new Vector3(),
        quaternion: new Quaternion(),
        scale: new Vector3(),
      };

      matrix.decompose(newProps.position, newProps.quaternion, newProps.scale);
    }
    const props = Object.entries(newProps).reduce((prev, [key, value]) => {
      prev[key] = value.toArray();
      return prev;
    }, {});
    return { ...piece, ...props };
  });
  socket.emit("pieces", initialPiecesProps);

  socket.on("handData", (data) => {
    const otherSockets = Object.entries(this.sockets)
      .filter(([socketId]) => socketId !== socket.id)
      .map(([_, s]) => s);

    sendHandDataToSockets(otherSockets, data);
  });

  socket.on("pinchData", (data) => {
    const index = state.piecesTransforms.findIndex((p) => p.name === data.name);
    const curr = state.piecesTransforms[index];
    if (isEmitDisposable(data, curr)) {
      return;
    }

    updatePiecesProps(data, index);

    socket.to("handRoom").emit("pinchData", data);
    // this.io.to("handRoom").emit("pinchData", data);
  });
}
