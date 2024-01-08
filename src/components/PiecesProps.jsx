import React from "react";
import useSocket from "@/stores/socket";
import {
  useControls,
  useCreateStore,
  LevaPanel,
  useStoreContext,
  LevaStoreProvider,
  button,
} from "leva";

// partly based on
// https://codesandbox.io/embed/github/pmndrs/leva/tree/main/demo/src/sandboxes/leva-advanced-panels?codemirror=1

const fidelityLevels = [/* "none", */ "blob", "gesture", "virtual"];
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

export default function PiecesProps() {
  const pieces = useSocket((state) => state.pieces);
  const debug = useSocket((state) => state.debug);
  const setAndEmit = useSocket((state) => state.setAndEmit);
  const socket = useSocket((state) => state.socket);
  const storeDebug = useCreateStore();
  const storePieces = useCreateStore();
  const levels = useCreateStore();
  const newDebug = useControls("debug", debug, { store: storeDebug });
  const newLevel = useControls(
    "Puzzle",
    {
      studyMode: true,
      testMode: false,
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

  React.useEffect(() => {
    setAndEmit("level", newLevel);
  }, [setAndEmit, newLevel]);

  return (
    <>
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
