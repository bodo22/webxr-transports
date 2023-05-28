import { create } from "zustand";
import { combine, subscribeWithSelector } from "zustand/middleware";
import { shallow } from "zustand/shallow";
// import { Poline } from "poline";
// import { formatHex, converter } from "culori";
import shortUuid from "short-uuid";
import throttle from "lodash.throttle";

import socket from "@/stores/socketConnection";
import createNewLevelPieces from "@/stores/helpers/createNewLevelPieces";

export const handViews = ["Pizza", "Ego"];

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

const pieces = createNewLevelPieces({ give: 2, self: 1 });

const initialState = {
  socketReady: false,
  handView: handViews[0],
  users: [],
  handData: undefined,
  socket: undefined,
  pieces,
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
    pieces: true,
    collide: false,
    pizzaRadius: 0.5,
  },
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
          if (user.isSessionSupported) {
            return prev; // this user will be generating their own hand data
          }
          const frameOffset = index * 90;
          const userFrame = frame + frameOffset;
          const userFrameHandData = readArrayItem(handData, userFrame);
          const newHandData = { ...userFrameHandData };
          prev.push({
            ...user,
            time: Date.now(),
            ...newHandData,
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
