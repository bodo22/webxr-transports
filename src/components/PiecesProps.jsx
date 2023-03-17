import React from "react";
import useSocket from "@/stores/socket";
import { useControls } from "leva";

const pieces = [
  {
    name: "my-fun-test-LiverArteries",
    debug: true,
    scale: 0.5,
    position: [-0.15, -0.2, -0.3],
  },
  {
    name: "my-fun-test-crate",
    debug: true,
    scale: 0.3,
    position: [-0.15, -0.2, -0.3],
  },
];

function PieceControlPanel({ name, initialData }) {
  const updatePieceProps = useSocket((state) => state.updatePieceProps);
  const data = useControls(name, initialData);

  React.useEffect(() => {
    updatePieceProps({ ...data, name });
  }, [updatePieceProps, name, data]);
  return null;
}

export default function PiecesProps() {
  return (
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
  );
}
