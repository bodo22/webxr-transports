import shuffle from "lodash.shuffle";
import random from "lodash.random";

import { MathUtils } from "three";

export const oldOutput = [
  {
    render: true,
    visible: true,
    name: "my-fun-test-LiverArteries",
    scale: 0.5,
    position: [-0.45, -0.2, -0.3],
  },
  {
    render: true,
    visible: true,
    name: "crate",
    scale: 0.3,
    position: [-0.15, -0.2, -0.3],
    gltfPath: "models/crate/model.gltf",
  },
  {
    render: true,
    visible: true,
    name: "crate-2",
    scale: 0.1,
    position: [0.15, -0.2, -0.3],
    gltfPath: "models/crate/model.gltf",
  },
];

function getTransformFor(index, env, suffix = "") {
  return {
    [`position${suffix}`]: [
      -0.2 + index * 0.2,
      0, // random(-35, 35, true),
      env === "AR" ? 0.25 : -0.25,
    ],
    [`rotation${suffix}`]: [
      suffix === "Goal" ? 0 : MathUtils.degToRad(random(-35, 35)),
      suffix === "Goal" ? 0 : MathUtils.degToRad(random(-35, 35)),
      suffix === "Goal" ? 0 : MathUtils.degToRad(random(-35, 35)),
    ],
  };
}

function getTransformsFor(startIndex, goalIndex, env, type) {
  const otherEnv = env === "VR" ? "AR" : "VR";
  return {
    ...getTransformFor(startIndex, env),
    ...getTransformFor(goalIndex, type === "self" ? env : otherEnv, "Goal"),
  };
}

function getPieceFor(startIndex, goalIndex, env, type, i) {
  const transforms = getTransformsFor(startIndex, goalIndex, env, type);

  return {
    startIndex,
    goalIndex,
    env,
    type,
    render: true,
    visible: true,
    name: `crate-${env}-${i}`,
    gltfPath: "models/crate/model.gltf",
    gltfPathDebug: `models/debug-crates/${env}-${type}.gltf`,
    scale: 0.1,
    ...transforms,
  };
}

/**
 * requirements:
 * - self should never already be in the right position (just potential rotation change)
 * - all give of other side should be aware of that
 * - currently only works for 2 people: one on AR, one on VR
 */

export default function createNewLevelPieces({ give, self }) {
  const ARstartIndices = shuffle([...Array(give + self).keys()]);
  const ARgoalIndices = shuffle([...Array(give + self).keys()]);
  const VRstartIndices = shuffle([...Array(give + self).keys()]);
  const VRGoalIndices = shuffle([...Array(give + self).keys()]);
  let env = "AR";
  const ARpieces = ARstartIndices.map((i, index) => {
    const type = index + 1 <= give ? "give" : "self";
    const startIndex = i;
    let goalIndex;
    if (type === "self") {
      const removeIndex = VRGoalIndices.findIndex((gi) => gi !== startIndex);
      [goalIndex] = VRGoalIndices.splice(removeIndex, 1);
    } else {
      goalIndex = ARgoalIndices.shift();
    }
    return getPieceFor(startIndex, goalIndex, env, type, i);
  });

  env = "VR";
  const VRpieces = VRstartIndices.map((i) => {
    const startIndex = i;
    let type;
    let goalIndices;
    if (ARgoalIndices.length && ARgoalIndices[0] !== startIndex) {
      goalIndices = ARgoalIndices;
      type = "self";
    } else {
      goalIndices = VRGoalIndices;
      type = "give";
    }
    const goalIndex = goalIndices.shift();
    return getPieceFor(startIndex, goalIndex, env, type, i);
  });

  const pieces = [...ARpieces, ...VRpieces];
  return pieces;
}

// test
// [...Array(1000).keys()].forEach(() => {
//   const pieces = createNewLevelPieces({ give: 2, self: 1 });
//   pieces.forEach((piece, index) => {
//     if (piece.type === "self" && piece.startIndex === piece.goalIndex) {
//       console.log(piece, pieces, index);
//       throw new Error("nope!");
//     }
//   });
// });
