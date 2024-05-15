import { createStream, saveLog } from "./logging.js";
import state from "./state.js";
import { sendHandDataToSockets } from "./socketsHandler.js";

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
  createStream("admin");

  socket.onAny((eventName, ...args) => {
    if (broadcastEvents.includes(eventName)) {
      this.io.to("handRoom").emit(eventName, ...args);
    }
    if (syncEventsToServer.includes(eventName)) {
      state[eventName] = args[0];
    }
    switch (eventName) {
      case "reset": {
        const now = Date.now();
        const resetPieces = state.pieces.map(
          ({ trashed, success, pinchStart, pinchData, ...piece }) => ({
            ...piece,
            key: `${piece.name}-${now}`,
          })
        );
        state.pieces = resetPieces
        this.io.to("handRoom").emit("pieces", resetPieces);
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

  socket.on("log", (log) => {
    saveLog(log, "admin");
  });
}
