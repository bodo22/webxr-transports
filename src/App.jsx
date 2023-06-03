import * as React from "react";
import PropTypes from "prop-types";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Box from "@mui/material/Box";
import Slider from "@mui/material/Slider";
import PowerIcon from "@mui/icons-material/Power";
import PowerOffIcon from "@mui/icons-material/PowerOff";
import Divider from "@mui/material/Divider";
import { Button } from "@mui/material";

import useSocket, {
  handViews,
  useConnectedUsers,
  useFakeUsers,
  useInlineUsers,
  useXRUsers,
  useLog,
} from "@/stores/socket";
import Pizza from "@/components/Pizza";
import PiecesProps, { blobJoint } from "@/components/PiecesProps";
import createNewLevelPieces from "@/stores/helpers/createNewLevelPieces";

function TabPanel(props) {
  const { children, value, index } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

TabPanel.propTypes = {
  children: PropTypes.node,
  index: PropTypes.number.isRequired,
  value: PropTypes.number.isRequired,
};

export default function BasicTabs() {
  const socketReady = useSocket((state) => state.socketReady);
  const socket = useSocket((state) => state.socket);
  const handView = useSocket((state) => state.handView);
  const sethandView = useSocket((state) => state.sethandView);
  const connectedUsers = useConnectedUsers();
  const fakeUsers = useFakeUsers();
  const inlineUsers = useInlineUsers();
  const xrUsers = useXRUsers();
  const users = useSocket((state) => state.users);
  const permutations = useSocket((state) => state.permutations);
  const setFakeUsers = useSocket((state) => state.setFakeUsers);
  const permutationIndex = useSocket((state) => state.permutationIndex);
  const fidelity = useSocket((state) => state.fidelity);
  const setAndEmit = useSocket((state) => state.setAndEmit);
  const log = useLog();
  const variantIndex = handViews.findIndex((v) => v === handView);
  const filter = handView !== "Pizza" ? "grayscale" : "";

  const handleReset = () => {
    log({ type: "resetButtonClick" });
    socket.emit("reset");
  };

  const handlePermutation = (permutation, index) => {
    log({ type: "permutationButtonClick", permutation, index });
    setAndEmit("permutationIndex", index);
    setAndEmit("fidelity", {
      ...permutation.fidelity[0],
      blobJoint: blobJoint[9],
    });
  };
  const handleFidelity = (level) => {
    log({ type: "fidelityButtonClick", level });
    setAndEmit("fidelity", { level, blobJoint: blobJoint[9] });
  };

  const handleNewLevel = () => {
    log({ type: "newLevelButtonClick" });
    socket.emit("reset");
    const newPieces = createNewLevelPieces();
    setAndEmit("pieces", newPieces);
  };

  return (
    <Box sx={{ width: "100%" }}>
      Users: {users.length} ({connectedUsers.length} connected ({xrUsers.length}{" "}
      XR, {inlineUsers.length} inline), {fakeUsers.length} fake)
      <br />
      Socket connection state:{" "}
      {socketReady ? (
        <PowerIcon color="success" />
      ) : (
        <PowerOffIcon color="error" />
      )}
      <br />
      <Box sx={{ p: 5, display: "flex", justifyContent: "space-evenly" }}>
        <Button onClick={handleNewLevel} variant="contained">
          New Level
        </Button>
        <Button color="error" onClick={handleReset} variant="contained">
          Reset Level
        </Button>
      </Box>
      <Box sx={{ p: 5, display: "flex", justifyContent: "space-evenly" }}>
        {permutations?.map((perm, index) => {
          return (
            <Button
              key={`perm-${perm.__comment__order}`}
              onClick={() => handlePermutation(perm, index)}
              variant={permutationIndex === index ? "contained" : "outlined"}
            >{`Permutation ${index + 1}`}</Button>
          );
        })}
      </Box>
      <Box sx={{ p: 5, display: "flex", justifyContent: "space-evenly" }}>
        {typeof permutationIndex === "number" &&
          permutations?.[permutationIndex]?.fidelity?.map((f) => {
            return (
              <Button
                key={`fidelity-${f.level}`}
                onClick={() => handleFidelity(f.level)}
                variant={f.level === fidelity?.level ? "contained" : "outlined"}
              >{`Fidelity: ${f.level}`}</Button>
            );
          })}
      </Box>
      {/* <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs value={variantIndex} onChange={sethandView}>
          {handViews.map((v) => {
            return <Tab label={v} key={`tab-${v}`} />;
          })}
        </Tabs>
      </Box> */}
      <div className={`px-16 ${filter}`}>
        {/* <Slider
          defaultValue={2}
          step={1}
          track={false}
          marks={[
            { value: 0, label: 0 },
            { value: 1, label: 1 },
            { value: 2, label: 2 },
            { value: 3, label: 3 },
            { value: 4, label: 4 },
            { value: 5, label: 5 },
            { value: 6, label: 6 },
          ]}
          min={0}
          max={6}
          value={fakeUsers.length}
          onChange={setFakeUsers}
        /> */}
        <Pizza />
      </div>
      <PiecesProps />
    </Box>
  );
}
