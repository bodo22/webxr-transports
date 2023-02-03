import * as React from "react";
import PropTypes from "prop-types";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Box from "@mui/material/Box";
import Slider from "@mui/material/Slider";
import PowerIcon from "@mui/icons-material/Power";
import PowerOffIcon from "@mui/icons-material/PowerOff";

import useSocket, {
  variants,
  useConnectedUsers,
  useFakeUsers,
  useInlineUsers,
  useXRUsers,
} from "@/stores/socket";
import Pizza from "@/components/Pizza";

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
  const variant = useSocket((state) => state.variant);
  const setVariant = useSocket((state) => state.setVariant);
  const connectedUsers = useConnectedUsers();
  const fakeUsers = useFakeUsers();
  const inlineUsers = useInlineUsers();
  const xrUsers = useXRUsers();
  const users = useSocket((state) => state.users);
  const setFakeUsers = useSocket((state) => state.setFakeUsers);

  const variantIndex = variants.findIndex((v) => v === variant);
  const filter = variant !== "Pizza" ? "grayscale" : "";

  return (
    <Box sx={{ width: "100%" }}>
      Users: {users.length} ({connectedUsers.length} connected ({xrUsers.length} XR, {inlineUsers.length} inline), {fakeUsers.length} fake)
      <br />
      Socket connection state:{" "}
      {socketReady ? (
        <PowerIcon color="success" />
      ) : (
        <PowerOffIcon color="error" />
      )}
      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs value={variantIndex} onChange={setVariant}>
          {variants.map((v) => {
            return <Tab label={v} key={`tab-${v}`} />;
          })}
        </Tabs>
      </Box>
      <div className={`px-16 ${filter}`}>
        <Slider
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
        />
        <Pizza />
      </div>
    </Box>
  );
}
