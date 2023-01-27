import { create } from "zustand";
import { combine, subscribeWithSelector } from "zustand/middleware";
import { shallow } from "zustand/shallow";
import io from "socket.io-client";

export const variants = ["Ego", "Distributed"];

function readArrayItem(array, index) {
  let arrayItem = array[index % array.length];
  return arrayItem;
}

const initialState = {
  socketReady: false,
  variant: variants[0],
  connectedUsers: [],
  fakeUsers: 0,
  handData: undefined,
  socket: undefined,
};

const mutations = (set, get) => {
  const socket = io("/admin");

  socket
    .on("connect", () => {
      set({ socket, socketReady: true });
    })
    .on("disconnect", () => {
      set({ socketReady: false });
    })
    .on("connectedUsers", (connectedUsers) => {
      let fakeUsers = get().fakeUsers;
      if (connectedUsers.length > fakeUsers) {
        // to make sure every connected user gets a unique handData
        fakeUsers = connectedUsers.length;
      }
      set({ connectedUsers, fakeUsers });
    });

  fetch("./handData/handData1.json")
    .then((response) => response.json())
    .then((handData) => {
      set({ handData });
    });

  function step(timestamp) {
    if (get().rafCallback) {
      get().rafCallback(timestamp);
    }
    window.requestAnimationFrame(step);
  }

  window.requestAnimationFrame(step);

  return {
    setFakeUsers(event, newFakeUsers) {
      set({ fakeUsers: newFakeUsers });
    },
    setVariant(event, newVariantIndex) {
      const newVariant = variants[newVariantIndex];
      set({ variant: newVariant });
      switch (newVariant) {
        case "Ego": {
          socket.emit("HandViewChange", { type: "Ego" });
          break;
        }
        case "Distributed": {
          // TODO recalc all rotation offsets for all users.
          socket.emit("HandViewChange", { type: "Ego" });
          break;
        }
        default: {
          break;
        }
      }
    },
  };
};

const useSocket = create(
  subscribeWithSelector(combine(initialState, mutations))
);

const unsub = useSocket.subscribe(
  (state) => ({
    socketReady: state.socketReady,
    handData: state.handData?.length,
    connectedUsers: state.connectedUsers.join(" "),
    fakeUsers: state.fakeUsers,
  }),
  (curr, prev) => {
    if (curr.socketReady && curr.handData && curr.connectedUsers) {
      let frame = 0;
      const { fakeUsers, connectedUsers, socket, handData } =
        useSocket.getState();
      const rafCallback = () => {
        // console.log("hello", curr.connectedUsers);
        const fakeHandDatas = new Array(fakeUsers).fill().reduce((prev, _, index) => {
          const socketId = connectedUsers[index];
          const frameOffset = index * 20;
          const userFrame = frame + frameOffset;
          const userFrameHandData = readArrayItem(handData, userFrame);
          const newHandData = {
            left: userFrameHandData.left,
            right: userFrameHandData.right,
            time: Date.now(),
          };
          prev.push({ fakeId: index, socketId, handData: newHandData });
          return prev;
        }, []);
        socket.emit("fakeHandDatas", fakeHandDatas);
        frame++;
      };
      useSocket.setState({ ready: true, rafCallback });
    }
  },
  { equalityFn: shallow }
);

export default useSocket;
