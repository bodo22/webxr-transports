import { promises, createWriteStream } from "fs";
import state from "./state.js";

export const streams = {};

function getServerLog() {
  return {
    fidelity: state.fidelity,
    objectOrientation: state.objectOrientation,
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

export function updateFileNameTimestamps() {
  const d = new Date();
  Object.keys(streams).forEach(async (name) => {
    streams[name]?.end();
    const folders = `logs/${name}/${d.getUTCFullYear()}/${d.toLocaleString(
      "default",
      { month: "long" }
    )}/${d.getUTCDate()}`;
    await promises.mkdir(folders, { recursive: true });
    streams[name] = createWriteStream(
      `${folders}/${name}-${new Date().toISOString()}.txt`,
      { flags: "a" }
    );
  });
}

export async function createStream(name) {
  streams[name]?.end();
  const d = new Date();
  const folders = `logs/${name}/${d.getUTCFullYear()}/${d.toLocaleString(
    "default",
    { month: "long" }
  )}/${d.getUTCDate()}`;
  await promises.mkdir(folders, { recursive: true });
  streams[name] = createWriteStream(
    `${folders}/${name}-${new Date().toISOString()}.txt`,
    { flags: "a" }
  );
}

export function endStream(name) {
  streams[name]?.end();
}

export function saveLog(log, name) {
  const personId = state.users?.find((u) => u.userId === name)?.personId;
  try {
    streams[name].write(
      JSON.stringify({ log, personId, serverState: getServerLog(state) }) + "\n"
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
