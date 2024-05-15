import { createWriteStream } from "fs";
import state from "./state.js";

const streams = {};

function getServerLog() {
  return {
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
  };
}

export function createStream(name) {
  streams[name]?.end();
  streams[name] = createWriteStream(`logs/${name}.txt`, { flags: "a" });
}

export function endStream(name) {
  streams[name]?.end();
}

export function saveLog(log, name, state) {
  try {
    streams[name].write(
      JSON.stringify({ log, serverState: getServerLog(state) }) + "\n"
    );
  } catch (err) {
    console.log(
      `${name} log write failed!`,
      streams.length,
      Object.keys(streams),
      streams[name]
    );
    console.error(err);
  }
}
