import { create } from "zustand";
import { combine, subscribeWithSelector } from "zustand/middleware";
import { shallow } from "zustand/shallow";
import socket from "./socketConnection";

export const variants = ["Ego", "Pizza"];

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

const mutations = (set, get) => {
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
    set({ users: [...newUsers] });
  }

  function updateFakeUsers(numFakeUsers) {
    const oldUsers = get().users;
    const oldConnectedUsers = getConnectedUsers(oldUsers);
    const newFakeUsers = new Array(numFakeUsers).fill(null).map(() => ({}));
    const newUsers = oldConnectedUsers.concat(newFakeUsers);
    set({ users: [...newUsers] });
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
