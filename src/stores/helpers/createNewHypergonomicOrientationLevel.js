import shuffle from "lodash.shuffle";
// import random from "lodash.random";

// import { MathUtils } from "three";

// import testPieces from "./testPieces.json";
// import ycbTestPieces from "./ycbTestPieces.json"
import { convenientColors } from "./createNewLevelPieces";

function getTransformFor(index, env, suffix = "") {
  const z = suffix === "Goal" ? 0.3 : 0.3;
  const y = suffix === "Goal" ? -0.35 : -0.25;
  return {
    // [`position${suffix}`]: [-0.35 + index * 0.35, y, env === "AR" ? z : -z],
    [`position${suffix}`]: [0, y, env === "AR" ? z : -z],
    [`rotation${suffix}`]: [
      0, // suffix === "Goal" ? 0 : MathUtils.degToRad(random(-35, 35)),
      0, // suffix === "Goal" ? 0 : MathUtils.degToRad(random(-35, 35)),
      0, // suffix === "Goal" ? 0 : MathUtils.degToRad(random(-35, 35)),
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
  const name = `crate-${env}-${i}`;

  return {
    startIndex,
    goalIndex,
    env,
    type,
    render: true,
    visible: true,
    name,
    gltfPathDebug: `models/debug-crates/${env}-${type}.gltf`,
    scaleGoal: 0.05,
    scale: 1,
    key: `${name}-${Date.now()}`,
    trash: false,
    ...transforms,
  };
}

/**
 * requirements:
 * - self should never already be in the right position (just potential rotation change)
 * - all give of other side should be aware of that
 * - currently only works for 2 people: one on AR, one on VR
 */

const pieceFileNamesBase = [
  {
    gltfPath: "models/pieces/ycb/banana.glb",
    gltfPathGoal: "models/pieces/ycb/1-cone-4-goal.gltf", // not used
  },
  {
    gltfPath: "models/pieces/ycb/banana.glb",
    gltfPathGoal: "models/pieces/ycb/1-cone-4-goal.gltf", // not used
  },
  {
    gltfPath: "models/pieces/ycb/banana.glb",
    gltfPathGoal: "models/pieces/ycb/1-cone-4-goal.gltf", // not used
  },
  {
    gltfPath: "models/pieces/ycb/banana.glb",
    gltfPathGoal: "models/pieces/ycb/1-cone-4-goal.gltf", // not used
  },
  {
    gltfPath: "models/pieces/ycb/banana.glb",
    gltfPathGoal: "models/pieces/ycb/1-cone-4-goal.gltf", // not used
  },
  {
    gltfPath: "models/pieces/ycb/banana.glb",
    gltfPathGoal: "models/pieces/ycb/1-cone-4-goal.gltf", // not used
  },
  // {
  //   gltfPath: "models/pieces/ycb/medium-clamp.glb",
  //   gltfPathGoal: "models/pieces/2-cone-5-goal.gltf", // not used
  // },
  // {
  //   gltfPath: "models/pieces/ycb/banana.glb",
  //   gltfPathGoal: "models/pieces/ycb/1-cone-4-goal.gltf", // not used
  // },
  // {
  //   gltfPath: "models/pieces/ycb/medium-clamp.glb",
  //   gltfPathGoal: "models/pieces/2-cone-5-goal.gltf", // not used
  // },
  // {
  //   gltfPath: "models/pieces/ycb/banana.glb",
  //   gltfPathGoal: "models/pieces/ycb/1-cone-4-goal.gltf", // not used
  // },
  // {
  //   gltfPath: "models/pieces/ycb/medium-clamp.glb",
  //   gltfPathGoal: "models/pieces/2-cone-5-goal.gltf", // not used
  // },
  // {
  //   gltfPath: "models/pieces/1-cone-4.gltf",
  //   gltfPathGoal: "models/pieces/1-cone-4-goal.gltf",
  // },
  // {
  //   gltfPath: "models/pieces/2-cone-5.gltf",
  //   gltfPathGoal: "models/pieces/2-cone-5-goal.gltf",
  // },
  // {
  //   gltfPath: "models/pieces/3-cone-half.gltf",
  //   gltfPathGoal: "models/pieces/3-cone-half-goal.gltf",
  // },
  // {
  //   gltfPath: "models/pieces/4-cone-quarter.gltf",
  //   gltfPathGoal: "models/pieces/4-cone-quarter-goal.gltf",
  // },
  // {
  //   gltfPath: "models/pieces/5-cylinder-5.gltf",
  //   gltfPathGoal: "models/pieces/5-cylinder-5-goal.gltf",
  // },
  // {
  //   gltfPath: "models/pieces/6-cylinder-60.gltf",
  //   gltfPathGoal: "models/pieces/6-cylinder-60-goal.gltf",
  // },
];

export default function createNewHypergonomicOrientationLevel(
  { give, self } = { give: 1, self: 0 }
) {
  const ARstartIndices = shuffle([...Array(give + self).keys()]);
  const ARgoalIndices = shuffle([...Array(give + self).keys()]);
  const VRstartIndices = shuffle([...Array(give + self).keys()]);
  const VRGoalIndices = shuffle([...Array(give + self).keys()]);
  const colors = shuffle(convenientColors);
  const pieceFileNames = shuffle(pieceFileNamesBase);
  let env = "AR";
  const ARpieces = ARstartIndices.reduce((curr, i, index) => {
    const type = index + 1 <= give ? "give" : "self";
    const startIndex = i;
    let goalIndex;
    if (type === "self") {
      const removeIndex = VRGoalIndices.findIndex((gi) => gi !== startIndex);
      [goalIndex] = VRGoalIndices.splice(removeIndex, 1);
    } else {
      goalIndex = ARgoalIndices.shift();
    }

    const newPiece = {
      color: colors[index],
      ...pieceFileNames[index],
      ...getPieceFor(startIndex, goalIndex, env, type, i),
    };

    // if (
    //   curr.filter(({ type }) => type === "give").length === give - 1 &&
    //   type === "give"
    // ) {
    //   newPiece.trash = true;
    // }
    curr.push(newPiece);
    return curr;
  }, []);

  env = "VR";
  const VRpieces = VRstartIndices.reduce((curr, i, index) => {
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

    const newPiece = {
      color: colors[index + 3],
      ...pieceFileNames[index + 3],
      ...getPieceFor(startIndex, goalIndex, env, type, i),
    };

    // if (
    //   curr.filter(({ type }) => type === "give").length === give - 1 &&
    //   type === "give"
    // ) {
    //   newPiece.trash = true;
    // }
    curr.push(newPiece);

    return curr;
  }, []);

  // ARpieces when VR1 is giver
  // VRpieces when VR2 is giver
  const pieces = [...ARpieces, ...VRpieces];
  console.log(pieces);
  return pieces;
  // return testPieces ?? pieces;
  // return ycbTestPieces;
}

// test
// [...Array(1000).keys()].forEach(() => {
//   const pieces = createNewLevelPieces();
//   pieces.forEach((piece, index) => {
//     if (piece.type === "self" && piece.startIndex === piece.goalIndex) {
//       console.log(piece, pieces, index);
//       throw new Error("nope!");
//     }
//   });
// });
