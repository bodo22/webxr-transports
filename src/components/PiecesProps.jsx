import React from "react";
import useSocket from "@/stores/socket";
import {
  useControls,
  useCreateStore,
  LevaPanel,
  useStoreContext,
  LevaStoreProvider,
} from "leva";

// partly based on
// https://codesandbox.io/embed/github/pmndrs/leva/tree/main/demo/src/sandboxes/leva-advanced-panels?codemirror=1

function PieceControlPanel({ name, initialData }) {
  const store = useStoreContext();
  const updatePieceProps = useSocket((state) => state.updatePieceProps);
  const data = useControls(name, initialData, { store });

  React.useEffect(() => {
    updatePieceProps({ ...data, name });
  }, [updatePieceProps, name, data]);
  return null;
}

const level = ["none", "blob", "gesture", "virtual"];
const blobJoint = [
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

export default function PiecesProps() {
  const pieces = useSocket((state) => state.pieces);
  const debug = useSocket((state) => state.debug);
  const setAndEmit = useSocket((state) => state.setAndEmit);
  const storeDebug = useCreateStore();
  const storePieces = useCreateStore();
  const storeFidelity = useCreateStore();
  const newDebug = useControls("debug", debug, { store: storeDebug });
  const newFidelity = useControls(
    "Fidelity",
    {
      level: {
        value: level[level.length - 1],
        options: level,
      },
      blobJoint: {
        value: blobJoint[11], // 11 = middle-finger-phalanx-proximal
        options: blobJoint,
      },
    },
    { store: storeFidelity }
  );
  React.useEffect(() => {
    setAndEmit("debug", newDebug);
  }, [setAndEmit, newDebug]);

  React.useEffect(() => {
    setAndEmit("fidelity", newFidelity);
  }, [setAndEmit, newFidelity]);

  return (
    <>
      <LevaPanel store={storeDebug} />
      <LevaPanel store={storeFidelity} />
      <LevaPanel store={storePieces} />
      <LevaStoreProvider store={storePieces}>
        <div style={{ alignItems: "center", justifyContent: "center" }}>
          {pieces.map(({ name, ...data }) => {
            return (
              <>
                <PieceControlPanel
                  key={`controlPanel-for-${name}`}
                  name={name}
                  initialData={data}
                />
              </>
            );
          })}
        </div>
      </LevaStoreProvider>
    </>
  );
}
