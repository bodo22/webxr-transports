import json from "../../public/handData/handData1.json" assert { type: "json" };
import { Matrix4, Quaternion, Vector3 } from "three";

let state = {
  pieces: [],
  piecesTransforms: [],
};

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
const broadcastEvents = [
  "userUpdate",
  "reset",
  "handViewChange",
  "piecesPropsChange",
  "debug",
];
export function onAdminConnect(socket) {
  broadcastConnectedUsers.call(this);
  socket.onAny((eventName, ...args) => {
    if (broadcastEvents.includes(eventName)) {
      this.io.to("handRoom").emit(eventName, ...args);
    }
    switch (eventName) {
      case "reset": {
        state.piecesTransforms = [];
        const pieces = state.pieces.map((piece) => ({
          ...piece,
          key: `${piece.name}-${Date.now()}`,
        }));
        this.io.to("handRoom").emit("piecesPropsChange", pieces);
        break;
      }
      case "userUpdate": {
        socket.emit("userId", socket.id);
        break;
      }
      case "piecesPropsChange": {
        state.pieces = args[0];
        break;
      }
      case "fakeHandDatas": {
        args[0].forEach((data) => {
          // send data for fake clients & clients that don't support WebXR sessions
          this.io.to("handRoom").emit("handData", data);
        });
        break;
      }
      default:
        break;
    }
  });
  this.io.to("handRoom").emit("piecesPropsChange", state.pieces);
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
  socket.emit("piecesPropsChange", initialPiecesProps);

  socket.on("handData", (data) => {
    socket.to("handRoom").emit("handData", data);
  });

  socket.on("pinchData", (data) => {
    const index = state.piecesTransforms.findIndex((p) => p.name === data.name);
    const curr = state.piecesTransforms[index];
    const incomingPinchIsOlder =
      curr?.pinchStart && data.pinchStart < curr.pinchStart;
    const pinchStartOverlap =
      curr?.pinchStart && data.pinchStart === curr.pinchStart;
    if (incomingPinchIsOlder || pinchStartOverlap) {
      if (incomingPinchIsOlder) {
        // console.log("incoming is older", curr.pinchStart, data.pinchStart);
        return;
      }
      const incomingPinchHasDifferentUserId =
        curr?.userId && data.userId !== curr.userId;
      if (pinchStartOverlap && incomingPinchHasDifferentUserId) {
        // console.log("pinchstart overlap but diff userId", curr, data);
        return;
      }
    }
    const newPiecesTransforms = [...state.piecesTransforms];
    newPiecesTransforms.splice(
      index === -1 ? newPiecesTransforms.length : index,
      index === -1 ? 0 : 1,
      data
    );
    state.piecesTransforms = newPiecesTransforms;

    socket.to("handRoom").emit("pinchData", data);
    // this.io.to("handRoom").emit("pinchData", data);
  });
}