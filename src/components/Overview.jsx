import * as React from "react";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import useSocket from "@/stores/socket";
import { formatRgb } from "culori";
import { Button, TextField } from "@mui/material";
import { showLogs } from "@/components/const.js";
function useFpsLogListener({
  userId,
  stats = {},
  ref,
  setObjectOrientation,
  setLevel,
}) {
  const socket = useSocket((state) => state.socket);
  React.useEffect(() => {
    function newFps(fps) {
      if (fps.userId === userId) {
        stats.fpsPanel.update(fps.frames, fps.frames, 100, 100, 0);
        const usedMB = fps.usedJSHeapSize / 1024 / 1024;
        const totalMB = fps.totalJSHeapSize / 1024 / 1024;
        stats.msPanel.update(usedMB, usedMB, totalMB, totalMB, 0);
        if (fps.objectOrientation) {
          setObjectOrientation(fps.objectOrientation.level);
        }
        if (fps.level) {
          const { testMode, studyMode, glb } = fps.level;
          setLevel({ testMode, studyMode, glb });
        }
      }
    }
    socket.on("fps", newFps);
    return () => {
      socket.off("fps", newFps);
    };
  }, [
    setLevel,
    setObjectOrientation,
    socket,
    stats.fpsPanel,
    stats.msPanel,
    stats.precision,
    userId,
  ]);

  React.useEffect(() => {
    if (stats.dom) {
      ref.current.replaceChildren(stats.dom);
      stats.dom.style.cssText = "position:relative;height:48px;width:90px";
    }
  }, [ref, stats, stats.dom, stats.fpsPanel]);
}

function UserRow({ user }) {
  const [events, setEvents] = React.useState({});

  const socket = useSocket((state) => state.socket);
  const setPersonId = useSocket((state) => state.setPersonId);
  const ref = React.useRef();
  const [objectOrientation, setObjectOrientation] = React.useState("");
  const [level, setLevel] = React.useState("");
  useFpsLogListener({ ...user, ref, setObjectOrientation, setLevel });

  React.useEffect(() => {
    function handleEvent(event, data) {
      if ((data && data.userId !== user.userId) || !showLogs.includes(event)) {
        return;
      }
      setEvents((prev) => {
        const prevEvent = prev[event] ?? 0;
        return {
          ...prev,
          [event]: prevEvent + 1,
        };
      });
    }
    socket.onAny(handleEvent);
    return () => {
      socket.offAny(handleEvent);
    };
  }, [events, socket, user.userId]);

  React.useEffect(() => {
    function handleReset(event) {
      if (["reset", "level"].includes(event)) {
        setEvents({});
      }
    }
    socket.onAnyOutgoing(handleReset);
    return () => {
      socket.offAnyOutgoing(handleReset);
    };
  }, [socket]);

  function recenter() {
    socket.emit("recenter", user.userId);
  }

  return (
    <TableRow
      style={{
        backgroundColor: formatRgb({ ...user.color, alpha: 0.7 }),
      }}
    >
      <TableCell component="th" scope="row">
        {user.userId}
      </TableCell>
      <TableCell component="th" scope="row">
        <Button variant="contained" onClick={recenter}>
          recenter view
        </Button>
      </TableCell>
      <TableCell component="th" scope="row">
        <TextField
          value={user.personId || ''}
          onChange={(event) => {
            setPersonId(user.userId, event.target.value);
          }}
        />
      </TableCell>
      <TableCell>{user.userId === "VR1" ? 3 : 8}</TableCell>
      <TableCell>
        {user.userId === "VR1" ? "141.44.233.22" : "141.44.217.192"}
      </TableCell>
      <TableCell>
        <div>orientation: {objectOrientation}</div>
        {Object.entries(level).map(([k, v]) => {
          return <div key={`level-${k}`}>{`${k}: ${v}`}</div>;
        })}
      </TableCell>
      <TableCell>
        <div ref={ref} />
      </TableCell>
      <TableCell>
        {Object.entries(events).map(([k, v]) => {
          return <div key={`event-name-${k}`}>{`${k}: ${v}`}</div>;
        })}
      </TableCell>
    </TableRow>
  );
}

export default function Overview() {
  const users = useSocket((state) => state.users);
  return (
    <Table sx={{ minWidth: 650 }} aria-label="simple table">
      <TableHead>
        <TableRow>
          <TableCell>UserID</TableCell>
          <TableCell>Reset</TableCell>
          <TableCell>PersonID</TableCell>
          <TableCell>InventarNr.</TableCell>
          <TableCell>IP</TableCell>
          <TableCell>Level Info</TableCell>
          <TableCell>FPS</TableCell>
          <TableCell>logs since reset</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {users.filter(u => u.userId !== "spectator").sort().map((user) => {
          return <UserRow key={user.userId} user={user} />;
        })}
      </TableBody>
    </Table>
  );
}
