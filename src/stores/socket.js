import { create } from "zustand";
import { combine, subscribeWithSelector } from "zustand/middleware";
import { shallow } from "zustand/shallow";
// import { Poline } from "poline";
// import { formatHex, converter } from "culori";
import socket from "./socketConnection";

export const variants = ["Ego", "Pizza"];

// const rgb = converter("rgb");

function readArrayItem(array, index) {
  let arrayItem = array[index % array.length];
  return arrayItem;
}

function getInlineUsers(users) {
  return users.filter(
    ({ isSessionSupported, socketId }) => !isSessionSupported && socketId
  );
}

function getXRUsers(users) {
  return users.filter(({ isSessionSupported }) => isSessionSupported);
}

function getConnectedUsers(users) {
  return users.filter(({ socketId }) => !!socketId);
}

function getFakeUsers(users) {
  return users.filter(({ socketId }) => !socketId);
}

const initialState = {
  socketReady: false,
  variant: variants[0],
  users: [],
  handData: undefined,
  socket: undefined,
};

// based on https://sashamaps.net/docs/resources/20-colors/
const convenientColors = [
  { r: 255 / 255, g: 225 / 255, b: 25 / 255 },
  { r: 0 / 255, g: 130 / 255, b: 200 / 255 },
  { r: 245 / 255, g: 130 / 255, b: 48 / 255 },
  { r: 220 / 255, g: 190 / 255, b: 255 / 255 },
  { r: 128 / 255, g: 0 / 255, b: 0 / 255 },
  { r: 0 / 255, g: 0 / 255, b: 128 / 255 },
  { r: 128 / 255, g: 128 / 255, b: 128 / 255 },
  { r: 255 / 255, g: 255 / 255, b: 255 / 255 },
  { r: 0 / 255, g: 0 / 255, b: 0 / 255 },
];

const mutations = (set, get) => {
  function setUsers(users) {
    // const poline = new Poline({
    //   numPoints: users.length,
    // });
    const newUsers = users.map((user, index) => {
      return {
        // color: rgb(
        //   formatHex({
        //     mode: "okhsl",
        //     h: poline.colors[index][0],
        //     s: poline.colors[index][1],
        //     l: poline.colors[index][2],
        //   })
        // ),
        color: convenientColors[index],
        ...user,
      };
    });
    set({ users: newUsers });
  }

  function updateConnectedUsers(connectedUsers) {
    const oldUsers = get().users;
    const newConnectedUsers = connectedUsers.filter(
      ({ socketId }) =>
        !oldUsers.map(({ socketId }) => socketId).includes(socketId)
    );
    const newOldConnectedUsers = oldUsers.reduce((prev, oldUser) => {
      const user = connectedUsers.find(
        ({ socketId }) => socketId === oldUser.socketId
      );
      if (user) {
        prev.push(user);
      }
      return prev;
    }, []);
    const oldFakeUsers = getFakeUsers(oldUsers);
    const newUsers = newOldConnectedUsers.concat(
      newConnectedUsers,
      oldFakeUsers
    );
    setUsers(newUsers);
  }

  function updateFakeUsers(numFakeUsers) {
    const oldUsers = get().users;
    const oldConnectedUsers = getConnectedUsers(oldUsers);
    const newFakeUsers = new Array(numFakeUsers).fill(null).map(() => ({}));
    const newUsers = oldConnectedUsers.concat(newFakeUsers);
    setUsers(newUsers);
  }

  socket
    .on("connect", () => {
      set({ socket, socketReady: true });
    })
    .on("disconnect", () => {
      set({ socketReady: false });
    })
    .on("connectedUsers", updateConnectedUsers);

  fetch("./handData/handData1.json")
    .then((response) => response.json())
    .then((handData) => {
      set({ handData });
    });

  function step(timestamp) {
    const { rafCallback } = get();
    if (typeof rafCallback === "function") {
      rafCallback(timestamp);
    }
    window.requestAnimationFrame(step);
  }

  window.requestAnimationFrame(step);

  return {
    setFakeUsers(event, newFakeUsers) {
      updateFakeUsers(newFakeUsers);
    },
    setVariant(event, newVariantIndex) {
      const newVariant = variants[newVariantIndex];
      set({ variant: newVariant });
      switch (newVariant) {
        case "Ego": {
          socket.emit("HandViewChange", { type: "Ego" });
          break;
        }
        case "Pizza": {
          // TODO recalc all rotation offsets for all users.
          socket.emit("HandViewChange", { type: "Pizza" });
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

/* const unsub = */ useSocket.subscribe(
  (state) => ({
    socketReady: state.socketReady,
    handData: state.handData?.length,
    usersLength: state.users.length,
  }),
  (curr, prev) => {
    if (curr.socketReady && curr.handData && curr.usersLength) {
      let frame = 0;
      const { users, socket, handData } = useSocket.getState();
      const inlineUsers = getInlineUsers(users);
      const fakeUsers = getFakeUsers(users);
      const rafCallback = () => {
        const fakeHandDatas = [...inlineUsers, ...fakeUsers].reduce(
          (prev, user, index) => {
            const frameOffset = index * 20;
            const userFrame = frame + frameOffset;
            const userFrameHandData = readArrayItem(handData, userFrame);
            const newHandData = {
              left: userFrameHandData.left,
              right: userFrameHandData.right,
            };
            prev.push({
              ...user,
              time: Date.now(),
              userId: user?.socketId ?? index,
              handData: newHandData,
            });
            return prev;
          },
          []
        );
        socket.emit("fakeHandDatas", fakeHandDatas);
        frame++;
      };
      useSocket.setState({ ready: true, rafCallback });
    }
  },
  { equalityFn: shallow }
);

export function useInlineUsers() {
  const users = useSocket(({ users }) => users);
  return getInlineUsers(users);
}
export function useXRUsers() {
  const users = useSocket(({ users }) => users);
  return getXRUsers(users);
}
export function useConnectedUsers() {
  const users = useSocket(({ users }) => users);
  return getConnectedUsers(users);
}
export function useFakeUsers() {
  const users = useSocket(({ users }) => users);
  return getFakeUsers(users);
}

export default useSocket;
