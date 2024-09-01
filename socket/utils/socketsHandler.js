import { Matrix4, Quaternion, Vector3 } from "three";

import { createStream, endStream, saveLog } from "./logging.js";
import state from "./state.js";
import { showLogs } from "../../src/components/const.js";

const intervals = {};

export async function onDisconnect(socket, reason) {
  console.log(`socket ${socket.handshake.query.env} disconnected`);
  delete this.sockets[socket.handshake.query.env];
  endStream(socket.handshake.query.env);
  broadcastConnectedUsers(this.sockets, this.io);
}

export function sendHandDataToSockets(sockets, data) {
  sockets.forEach((socket) => {
    socket.emit("handData", {
      ...data,
      timestamp: Date.now(),
    });
  });
}

export function broadcastConnectedUsers(sockets, io) {
  const connectedUsers = Object.values(sockets).map((socket) => {
    return {
      socketId: socket.id,
      userId: socket.handshake.query.env,
      isSessionSupported: socket.handshake.query.isSessionSupported === "true",
    };
  });
  io.emit("level", state.level);
  io.emit("fidelity", state.fidelity);
  io.emit("objectOrientation", state.objectOrientation);
  io.emit("connectedUsers", connectedUsers);
  io.of("/admin").emit("connectedUsers", connectedUsers);
}

function isEmitDisposable(pinchData, pinchCurr) {
  let isDisposable = false;
  const incomingPinchIsOlder =
    pinchCurr?.pinchStart && pinchData.pinchStart < pinchCurr.pinchStart;
  const pinchStartOverlap =
    pinchCurr?.pinchStart && pinchData.pinchStart === pinchCurr.pinchStart;
  if (incomingPinchIsOlder || pinchStartOverlap) {
    if (incomingPinchIsOlder) {
      saveLog(
        {
          isDisposable: true,
          reason: "incomingPinchIsOlder",
          pinchData,
          pinchCurr,
        },
        pinchData.userId
      );
      isDisposable = true;
    }
    const incomingPinchHasDifferentUserId =
      pinchCurr?.userId && pinchData.userId !== pinchCurr.userId;
    if (pinchStartOverlap && incomingPinchHasDifferentUserId) {
      saveLog(
        {
          isDisposable: true,
          reason: "pinchStartOverlap",
          pinchData,
          pinchCurr,
        },
        pinchData.userId
      );
      isDisposable = true;
    }
  }
  return isDisposable;
}

const handleHandData = (data, userId, sockets) => {
  const otherSockets = Object.entries(sockets)
    .filter(([socketId]) => socketId !== userId)
    .map(([_, s]) => s);

  sendHandDataToSockets(otherSockets, data);
};

const handleViewerData = (data, socket) => {
  socket.to("handRoom").emit("viewerData", data);
  // const userId = socket.handshake.query.env;
  // saveLog({ type: "viewerData", ...data }, userId);
};

const handlePinchData = (pinchData, socket) => {
  // const pieceIndex = state.pieces.findIndex((p) => p.name === pinchData.name);
  const pieceCurr = state.pieces[0]?.pinchData;
  if (isEmitDisposable(pinchData, pieceCurr)) {
    return;
  }

  const newPieces = [...state.pieces];
  newPieces[0].pinchData = pinchData;
  state.pieces = newPieces;
  socket.to("handRoom").emit("pinchData", pinchData);
  const userId = socket.handshake.query.env;
  saveLog({ type: "pinchData", ...pinchData }, userId);
};

const handlePieceStateData = (pieceStateData, socket) => {
  // const pieceIndex = state.pieces.findIndex(
  //   (p) => p.name === pieceStateData.name
  // );
  const pieceCurr = state.pieces[0];
  const newPieces = [...state.pieces];
  newPieces[0] = {
    ...pieceCurr,
    ...pieceStateData,
  };
  state.pieces = newPieces;
  socket.to("handRoom").emit("pieceStateData", pieceStateData);
};

const getPiecesProps = () => {
  return state.pieces.map((piece) => {
    const initialPiecePinchData = state.pieces.find(
      (p) => p.name === piece.name
    ).pinchData;
    let newProps = {};
    if (initialPiecePinchData) {
      const matrix = new Matrix4();
      matrix.elements = initialPiecePinchData.matrix;
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
};

export async function onConnect(socket) {
  const userId = socket.handshake.query.env;
  console.log(`socket ${userId} connected`);
  socket.on("disconnect", onDisconnect.bind(this, socket));
  socket.on("error", console.error.bind(console));
  socket.on("message", console.log.bind(console));

  socket.on("connect", () => {
    socket.sendBuffer = [];
  });

  const notSpectator = userId !== "spectator";

  this.sockets[userId]?.disconnect(true);
  this.sockets[userId] = socket;
  endStream(userId);

  socket.emit("userId", userId);
  socket.join("handRoom");

  broadcastConnectedUsers(this.sockets, this.io);
  const initialPiecesProps = getPiecesProps();
  socket.emit("pieces", initialPiecesProps);

  socket.on("handData", (d) => handleHandData(d, userId, this.sockets));
  socket.on("viewerData", (d) => handleViewerData(d, socket));
  socket.on("pinchData", (d) => handlePinchData(d, socket));
  socket.on("pieceStateData", (d) => handlePieceStateData(d, socket));

  if (notSpectator) {
    createStream(userId);

    socket.on("log", (log) => {
      saveLog(log, userId);
      if (showLogs.includes(log.type)) {
        this.io.of("/admin").emit(log.type, { ...log, userId });
      }
    });

    clearInterval(intervals[userId]);
    intervals[userId] = setInterval(() => {
      saveLog({ stateOnly: true }, userId);
    }, 3000);
  }
}
