import { createWriteStream, createReadStream } from "fs";
import { createInterface } from "readline";
import { HOHTypes } from "../../src/components/const.js";
import { MathUtils, Matrix4, Quaternion, Vector3 } from "three";

const flStream = createWriteStream("logs/final/logs.txt", { flags: "a" });

async function getLines(path) {
  const lineReader = createInterface({
    input: createReadStream(path),
  });
  const lines = [];
  for await (const line of lineReader) {
    // lines.push(fastJsonParse(line).value);
    // lines.push(fastJsonParse(line).value);
    lines.push(JSON.parse(line));
  }
  return lines;
}

function getQuat(m) {
  const matrix = new Matrix4();
  matrix.elements = m;
  const quatFirst = new Quaternion();
  matrix.decompose(new Vector3(), quatFirst, new Vector3());
  return quatFirst;
}

function getNeededVR1(logs) {
  const r = {};
  logs.forEach((l) => {
    if (!r.beginReach && l?.log?.type === "beginReach") {
      r.beginReach = l.log.timestamp;
    }
    if (
      !r.lockObjectToHand &&
      l?.log?.type === "lockObjectToHand" &&
      l.log.handQuat
    ) {
      r.lockObjectToHand = l.log.timestamp;
      r.quatFirst = new Quaternion().fromArray(l.log.handQuat);
    }
    if (
      !r.releaseObjectFromHand &&
      l?.log?.type === "releaseObjectFromHand" &&
      l.log.handQuat
    ) {
      r.quatLast = new Quaternion().fromArray(l.log.handQuat);
    }
    if (l?.log?.type === "howComfortable") {
      r.howComfortable = l.log.answer;
    }
  });
  if (r.quatFirst && r.quatLast) {
    r.geoDist = MathUtils.radToDeg(r.quatFirst.angleTo(r.quatLast));
  }
  return r;
}

function getNeededVR2(logs) {
  const r = {};
  logs.forEach((l) => {
    if (!r.endOfHandover && l?.log?.type === "endOfHandover") {
      r.endOfHandover = l.log.timestamp;
    }
    if (
      !r.lockObjectToHand &&
      l?.log?.type === "lockObjectToHand" &&
      l.log.handQuat
    ) {
      r.lockObjectToHand = l.log.timestamp;
      r.quatFirst = new Quaternion().fromArray(l.log.handQuat);
    }
    if (
      !r.releaseObjectFromHand &&
      l?.log?.type === "releaseObjectFromHand" &&
      l.log.handQuat
    ) {
      r.quatLast = new Quaternion().fromArray(l.log.handQuat);
    }
    if (l?.log?.type === "howComfortable") {
      r.howComfortable = l.log.answer;
    }
  });
  if (r.quatFirst && r.quatLast) {
    r.geoDist = MathUtils.radToDeg(r.quatFirst.angleTo(r.quatLast));
  }
  return r;
}

export async function addFinalLog(streams = {}, failed) {
  if (!streams.VR1 || !streams.VR2 || !streams.admin) {
    return;
  }
  const lines = await Promise.all([
    getLines(streams.VR1.path),
    getLines(streams.VR2.path),
    getLines(streams.admin.path),
  ]);
  const VR1Lines = lines[0];
  const VR2Lines = lines[1];
  const objID = VR1Lines[0]?.serverState?.level?.glb;
  if (VR1Lines.length === 0 || VR2Lines.length === 0 || !objID) {
    return;
  }
  console.time("addFinalLog");
  let finalLog = [failed, VR1Lines[0].serverState.level.testMode];
  const VR1logs = getNeededVR1(VR1Lines);
  const VR2logs = getNeededVR2(VR2Lines);
  finalLog.push(VR1Lines[0].personId);
  finalLog.push(VR2Lines[0].personId);
  finalLog.push(objID);
  finalLog.push(HOHTypes[objID].objForm);
  finalLog.push(HOHTypes[objID].objType);
  finalLog.push(VR1Lines[0].serverState.objectOrientation.level);
  finalLog.push(VR1Lines[0].serverState.permutationIndex);
  finalLog.push(VR1logs.beginReach); // start
  finalLog.push(VR2logs.endOfHandover); // end
  finalLog.push(VR2logs.endOfHandover - VR1logs.beginReach); // TCT
  finalLog.push(VR1logs.geoDist);
  finalLog.push(VR2logs.geoDist);
  finalLog.push(VR1logs.howComfortable);
  finalLog.push(VR2logs.howComfortable);
  flStream.write(finalLog.join(",") + "\n");
  console.timeEnd("addFinalLog");
}

// addFinalLog({
//   VR1: { path: "logs/VR1/2024/August/28/VR1-2024-08-28T09:44:12.146Z.txt" },
//   VR2: { path: "logs/VR2/2024/August/28/VR2-2024-08-28T09:44:12.146Z.txt" },
//   admin: {
//     path: "logs/admin/2024/August/28/admin-2024-08-28T09:44:12.145Z.txt",
//   },
// });
