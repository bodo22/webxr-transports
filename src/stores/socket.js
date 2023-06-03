import { create } from "zustand";
import { combine, subscribeWithSelector } from "zustand/middleware";
import { shallow } from "zustand/shallow";
// import { Poline } from "poline";
// import { formatHex, converter } from "culori";
import shortUuid from "short-uuid";
import throttle from "lodash.throttle";

import socket from "@/stores/socketConnection";
import { convenientColors } from "@/stores/helpers/createNewLevelPieces";

export const handViews = ["Pizza", "Ego"];

// const rgb = converter("rgb");

function readArrayItem(array, index) {
  let arrayItem = array[index % array.length];
  return arrayItem;
}

function getInlineUsers(users) {
  return users.filter(
    ({ isSessionSupported, socketId, userId }) =>
      !isSessionSupported && socketId && userId !== "spectator"
  );
}

function getXRUsers(users) {
  return users.filter(({ isSessionSupported }) => isSessionSupported);
}

function getConnectedUsers(users) {
  return users.filter(
    ({ socketId, userId }) => !!socketId && userId !== "spectator"
  );
}

function getFakeUsers(users) {
  return users.filter(({ socketId }) => !socketId);
}

const initialState = {
  socketReady: false,
  handView: handViews[0],
  users: [],
  handData: undefined,
  socket: undefined,
  pieces: [],
  fidelity: { level: "virtual", blobJoint: "index-finger-tip" },
  permutations: [],
  permutationIndex: [],
  debug: {
    boundBoxes: false,
    grid: false,
    pizzaGeo: false,
    pizzaNums: false,
    stats: false,
    center: false,
    gizmo: false,
    hands: false,
    piecesPos: false,
    // pieces: false,
    collide: false,
    singlePlayer: false,
    pizzaRadius: 0.5,
  },
};

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
    socket.emit("userUpdate", newUsers);
    socket.emit("handView", get().handView);
    socket.emit("debug", get().debug);
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
    const newFakeUsers = new Array(numFakeUsers)
      .fill(null)
      .map(() => ({ userId: shortUuid.generate() }));
    const newUsers = oldConnectedUsers.concat(newFakeUsers);
    setUsers(newUsers);
  }

  socket
    .on("connect", () => {
      set({ socket, socketReady: true });
      socket.emit("pieces", get().pieces);
    })
    .on("disconnect", () => {
      set({ socketReady: false });
    })
    .on("connectedUsers", updateConnectedUsers);

  fetch("./handData/handData-gesture.json")
    // fetch("./handData/handData-gesture-wrist-base.json") // use -2 to select pose for gesture fidelity
    .then((response) => response.json())
    .then((handData) => {
      set({ handData });
    });
  fetch("./handData/permutations.json")
    .then((response) => response.json())
    .then(({ permutations }) => {
      set({ permutations });
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
    socket,
    setUsers,
    setFakeUsers(event, newFakeUsers) {
      updateFakeUsers(newFakeUsers);
    },
    sethandView(event, newVariantIndex) {
      const handView = handViews[newVariantIndex];
      set({ handView });
      socket.emit("handView", handView);
    },
    // updatePieceProps(pieceProps) {
    //   const oldPieces = get().pieces;
    //   const oldIndex = oldPieces.findIndex((p) => p.name === pieceProps.name);
    //   const newPieces = [...oldPieces];
    //   newPieces.splice(oldIndex, oldIndex === -1 ? 0 : 1, pieceProps);
    //   set({ pieces: newPieces });
    //   socket.emit("pieces", newPieces);
    // },
    setAndEmit(key, value) {
      // e.g. key = debug, value = newDebug obj
      socket.emit(key, value);
      set({ [key]: value });
    },
  };
};

const useSocket = create(
  subscribeWithSelector(combine(initialState, mutations))
);

/* const unsub = */ useSocket.subscribe(
  (state) => ({
    socketReady: state.socketReady,
    handDataLength: state.handData?.length,
    userIdsJoined: state.users.map(({ userId }) => userId).join(""),
  }),
  (curr, prev) => {
    if (curr.socketReady && curr.handDataLength && curr.userIdsJoined) {
      let frame = 0;
      const { users, socket, handData } = useSocket.getState();
      const fps = 30;
      const wait = 1000 / fps;
      function emitFakeHandDatas(fakeHandDatas) {
        socket.emit("fakeHandDatas", fakeHandDatas);
      }
      const throttledEmitFakeHandDatas = throttle(emitFakeHandDatas, wait);
      function rafCallback() {
        const fakeHandDatas = users.reduce((prev, user, index) => {
          if (user.isSessionSupported || user.userId === "spectator") {
            return prev; // this user will be generating their own hand data or they are just watching
          }
          const { fidelity } = useSocket.getState();
          const frameOffset = index * 90;
          const userFrame = frame + frameOffset;
          const userFrameHandData = readArrayItem(handData, userFrame);
          userFrameHandData.joints = Object.entries(
            userFrameHandData.joints
          ).reduce((acc, [handedness, joints]) => {
            acc[handedness] = Object.values(joints).map(
              ({ transformMatrix, radius }) => {
                return {
                  transformMatrix: transformMatrix.map(
                    (v) => Math.round(v * 1000) / 1000
                  ),
                  radius: Math.round(radius * 1000) / 1000,
                };
              }
            );
            return acc;
          }, {});
          const newHandData = { ...userFrameHandData };
          prev.push({
            ...user,
            time: Date.now(),
            ...newHandData,
            fidelity,
          });
          return prev;
        }, []);
        throttledEmitFakeHandDatas(fakeHandDatas);
        frame++;
      }

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
