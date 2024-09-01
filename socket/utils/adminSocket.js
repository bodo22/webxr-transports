import { streams, createStream, saveLog, updateFileNameTimestamps } from "./logging.js";
import state from "./state.js";
import {
  sendHandDataToSockets,
  broadcastConnectedUsers,
} from "./socketsHandler.js";
import { addFinalLog } from "./final-logger.js";

const broadcastEvents = [
  "userUpdate",
  "reset",
  "handView",
  "debug",
  "pieces",
  "fidelity",
  "level",
  "objectOrientation",
  "recenter",
];

const syncEventsToServer = [
  "permutationIndex",
  "pieces",
  "fidelity",
  "level",
  "objectOrientation",
];

export function onAdminConnect(socket) {
  createStream("admin");
  broadcastConnectedUsers(this.sockets, this.io);

  socket.onAny((eventName, ...args) => {
    const beforeState = {...state}
    if (broadcastEvents.includes(eventName)) {
      this.io.to("handRoom").emit(eventName, ...args);
    }
    if (syncEventsToServer.includes(eventName)) {
      state[eventName] = args[0];
    }
    switch (eventName) {
      case "reset": {
        addFinalLog(streams, true);
        updateFileNameTimestamps();
        const now = Date.now();
        const resetPieces = state.pieces.map(
          ({ trashed, success, pinchStart, pinchData, ...piece }) => ({
            ...piece,
            key: `${piece.name}-${now}`,
          })
        );
        state.pieces = resetPieces;
        this.io.to("handRoom").emit("pieces", resetPieces);
        break;
      }
      case "userUpdate": {
        state.users = args[0];
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
      // case "newLevelButtonClick": {
      //   updateFileNameTimestamps();
      //   break;
      // }
      case "level": {
        if (beforeState.level.glb && beforeState.level.glb !== args[0].glb) {
          addFinalLog(streams, false);
          updateFileNameTimestamps();
        }
        break;
      }
      /* 
        TODO:
          - one button to restart object
            - reset
            - new log file
            - try to final log but with "failed" state true
          - one button to go to next object
            - reset
            - next object
            - new log file
            - final log with failed state false 
       */

      default:
        break;
    }
  });
  this.io.to("handRoom").emit("pieces", state.pieces);

  socket.on("log", (log) => {
    saveLog(log, "admin");
  });
}
