import React from "react";
import useSocket from "@/stores/socket";
import {
  useControls,
  useCreateStore,
  LevaPanel,
  useStoreContext,
  LevaStoreProvider,
  // button,
} from "leva";
import { simplifiedHOH } from "./const";
import { Box, Button } from "@mui/material";
import shuffle from "lodash.shuffle";

// partly based on
// https://codesandbox.io/embed/github/pmndrs/leva/tree/main/demo/src/sandboxes/leva-advanced-panels?codemirror=1

// const fidelityLevels = [/* "none", */ "blob", "gesture", "virtual"];
export const blobJoint = [
  "wrist",
  "thumb-metacarpal",
  "thumb-phalanx-proximal",
  "thumb-phalanx-distal",
  "thumb-tip",
  "index-finger-metacarpal",
  "index-finger-phalanx-proximal",
  "index-finger-phalanx-intermediate",
  "index-finger-phalanx-distal",
  "index-finger-tip",
  "middle-finger-metacarpal",
  "middle-finger-phalanx-proximal",
  "middle-finger-phalanx-intermediate",
  "middle-finger-phalanx-distal",
  "middle-finger-tip",
  "ring-finger-metacarpal",
  "ring-finger-phalanx-proximal",
  "ring-finger-phalanx-intermediate",
  "ring-finger-phalanx-distal",
  "ring-finger-tip",
  "pinky-finger-metacarpal",
  "pinky-finger-phalanx-proximal",
  "pinky-finger-phalanx-intermediate",
  "pinky-finger-phalanx-distal",
  "pinky-finger-tip",
];

function PieceControlPanel({ name, initialData }) {
  const store = useStoreContext();
  const [, set] = useControls(name, () => initialData, { store });

  React.useEffect(() => {
    set(initialData);
  }, [set, initialData]);

  // React.useEffect(() => {
  //   updatePieceProps({ ...data, name });
  // }, [updatePieceProps, name, data]);
  // return null;
}

const newLevelDefaultProps = {
  // gltfPath: `models/pieces/ycb/${newLevel.glb}.glb`,
  gltfPathGoal: `models/pieces/ycb/1-cone-4-goal.gltf`,
  // https://chatgpt.com/c/87d209f2-1ea2-441d-9eb3-0b537f00290a
  // top of object 10-20cm below eye level
  // 35-45cm in front of user
  position: [0, -0.35, 0.7 - 0.45],
  rotation: [0, 0, 0],
  positionGoal: [0, -0.45, 0],
  positionTrash: [0, -0.45, 0],
  scale: 0.001,
  render: true,
  visible: true,
};

export default function PiecesProps() {
  const pieces = useSocket((state) => state.pieces);
  const debug = useSocket((state) => state.debug);
  const setAndEmit = useSocket((state) => state.setAndEmit);
  // const socket = useSocket((state) => state.socket);
  const storeDebug = useCreateStore();
  const storePieces = useCreateStore();
  const levels = useCreateStore();
  const newDebug = useControls("debug", debug, { store: storeDebug });
  const [shuffledHOH, setShuffledHOH] = React.useState(simplifiedHOH);
  const [currentGlb, setCurrentGlb] = React.useState(shuffledHOH[0]);
  const newLevel = useControls(
    "Puzzle",
    {
      studyMode: true,
      testMode: false,
      freezeHand: {
        value: "never",
        options: ["never", "onGrab", "onCollision"],
      },
      selectOnCollision: true,
      // testReset: button(() => {
      //   socket.emit("level", { ...newLevel, testReset: true });
      // }),
      // level: {
      //   value: 1,
      //   options: new Array(8).fill(0).map((_, i) => i + 1),
      // },
      positionThreshold: 0.04,
      rotationThreshold: 10,
    },
    { store: levels }
  );

  React.useEffect(() => {
    setAndEmit("debug", newDebug);
  }, [setAndEmit, newDebug]);

  const emitPieces = React.useCallback(
    (currentGlb) => {
      setAndEmit("pieces", [
        {
          ...newLevelDefaultProps,
          name: currentGlb,
          key: `${currentGlb}-${Date.now()}`,
          gltfPath: `models/simplified/glbs/aligned/z-toward-user/${currentGlb}.glb`,
        },
      ]);
    },
    [setAndEmit]
  );
  const users = useSocket((state) => state.users);
  const socketReady = useSocket((state) => state.socketReady);

  React.useEffect(() => {
    setAndEmit("level", { ...newLevel, glb: currentGlb });
    emitPieces(currentGlb);
  }, [socketReady, users.length, setAndEmit, newLevel, emitPieces, currentGlb]);

  const prevLevel = () => {
    const index = shuffledHOH.indexOf(currentGlb);
    if (index > 0) {
      setCurrentGlb(shuffledHOH[index - 1]);
    }
  };
  const nextLevel = () => {
    const index = shuffledHOH.indexOf(currentGlb);
    if (index < shuffledHOH.length - 1) {
      setCurrentGlb(shuffledHOH[index + 1]);
    }
  };

  const shuffleHOH = () => {
    const shuffled = shuffle(simplifiedHOH);
    setShuffledHOH(shuffled);
    setCurrentGlb(shuffled[0]);
  };

  const disablePrev = currentGlb === shuffledHOH[0];
  const disableNext = currentGlb === shuffledHOH[shuffledHOH.length - 1];
  return (
    <>
      <Box sx={{ p: 2, display: "flex" }}>
        <Button
          disabled={disablePrev}
          onClick={prevLevel}
          variant="contained"
          sx={{ mx: 1 }}
        >
          Previous Object
        </Button>
        {currentGlb}
        <Button
          disabled={disableNext}
          onClick={nextLevel}
          variant="contained"
          sx={{ mx: 1 }}
        >
          Next Object
        </Button>
      </Box>
      <Button
        onClick={shuffleHOH}
        variant="contained"
        sx={{ m: 3 }}
      >
        Shuffle Objects
      </Button>
      <div className="flex flex-wrap">
        {[storeDebug, levels, storePieces].map((store) => {
          const cls =
            storePieces.storeId === store.storeId ? "pointer-events-none" : ""; // handled by changing level
          return (
            <div
              key={`leva-panel-${store.storeId}`}
              className={`min-w-[330px] p-5 ${cls}`}
            >
              <LevaPanel store={store} fill flat />
            </div>
          );
        })}
      </div>
      <LevaStoreProvider store={storePieces}>
        {pieces.map(({ name, ...data }) => {
          return (
            <PieceControlPanel
              key={`controlPanel-for-${name}`}
              name={name}
              initialData={data}
            />
          );
        })}
      </LevaStoreProvider>
    </>
  );
}
