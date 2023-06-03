import { Matrix4, Quaternion, Vector3 } from "three";
import { createWriteStream } from "fs";
let state = {
  pieces: [],
  piecesTransforms: [],
  fidelity: { level: "virtual", blobJoint: "index-finger-tip" },
  level: { studyMode: true },
  permutations: [],
  permutationIndex: 0,
};

const streams = {};
const intervals = {};

export async function onDisconnect(socket, reason) {
  console.log(`socket ${socket.handshake.query.env} disconnected`);
  delete this.sockets[socket.handshake.query.env];
  streams[socket.handshake.query.env]?.end();
  broadcastConnectedUsers.call(this);
}

function sendHandDataToSockets(sockets, data) {
  sockets.forEach((socket) => {
    socket.emit("handData", data);
  });
}

function broadcastConnectedUsers() {
  const connectedUsers = Object.values(this.sockets).map((socket) => {
    return {
      socketId: socket.id,
      userId: socket.handshake.query.env,
      isSessionSupported: socket.handshake.query.isSessionSupported === "true",
    };
  });
  this.io.emit("level", state.level);
  this.io.emit("fidelity", state.fidelity);
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

const syncEventsToServer = ["pieces", "fidelity", "level", "permutationIndex"];

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
        const now = Date.now();
        const pieces = state.pieces.map(
          ({ trashed, success, pinchStart, ...piece }) => ({
            ...piece,
            key: `${piece.name}-${now}`,
          })
        );
        this.io.to("handRoom").emit("pieces", pieces);
        break;
      }
      case "userUpdate": {
        socket.emit("userId", socket.handshake.query.env);
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
  console.log(`socket ${socket.handshake.query.env} connected`);
  socket.on("disconnect", onDisconnect.bind(this, socket));
  socket.on("error", console.error.bind(console));
  socket.on("message", console.log.bind(console));

  socket.on("connect", () => {
    socket.sendBuffer = [];
  });

  const notSpectator = socket.handshake.query.env !== "spectator";

  this.sockets[socket.handshake.query.env]?.disconnect(true);
  streams[socket.handshake.query.env]?.end();

  this.sockets[socket.handshake.query.env] = socket;

  socket.emit("userId", socket.handshake.query.env);
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
      .filter(([socketId]) => socketId !== socket.handshake.query.env)
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
  });

  socket.on("pieceStateData", (data) => {
    socket.to("handRoom").emit("pieceStateData", data);
  });

  if (notSpectator) {
    streams[socket.handshake.query.env] = createWriteStream(
      `${socket.handshake.query.env}.txt`,
      { flags: "a" }
    );

    function saveLog(log) {
      const serverState = {
        fidelity: state.fidelity,
        level: state.level,
        permutationIndex: state.permutationIndex,
        pieces: state.pieces.map(
          ({
            color,
            visible,
            gltfPath,
            gltfPathGoal,
            gltfPathDebug,
            positionGoal,
            rotationGoal,
            rotation,
            position,
            name,
            scale,
            render,
            ...rest
          }) => rest
        ),
        saveTimestamp: Date.now(),
        piecesTransforms: state.piecesTransforms.map(
          ({ matrix, ...rest }) => rest
        ),
      };
      try {
        streams[socket.handshake.query.env].write(
          JSON.stringify({ log, serverState }) + "\n"
        );
      } catch (err) {
        console.log(
          "log write failed!",
          streams.length,
          Object.keys(streams),
          streams[socket.handshake.query.env]
        );
        console.error(err);
      }
    }

    socket.on("log", (log) => {
      saveLog(log);
    });

    clearInterval(intervals[socket.handshake.query.env]);
    intervals[socket.handshake.query.env] = setInterval(() => {
      saveLog({ stateOnly: true });
    }, 3000);
  }
}
