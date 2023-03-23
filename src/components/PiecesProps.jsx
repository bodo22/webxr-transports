import React from "react";
import useSocket from "@/stores/socket";
import { useControls } from "leva";

function PieceControlPanel({ name, initialData }) {
  const updatePieceProps = useSocket((state) => state.updatePieceProps);
  const data = useControls(name, initialData);

  React.useEffect(() => {
    updatePieceProps({ ...data, name });
  }, [updatePieceProps, name, data]);
  return null;
}

export default function PiecesProps() {
  const pieces = useSocket((state) => state.pieces);

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
