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

let firstFakeSendTime;
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
    // .map((_, index) => ({ userId: index % 2 ? 'AR' :'VR' }));
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

  // fetch("./handData/recorded-03-10-23.json")
  // fetch("./handData/recorded-04-10-23-morning.json")
  fetch("./handData/recorded-anne.json")
    // fetch("./handData/recorded-04-10-23_13:30.json")
    // fetch("./handData/handData-gesture.json")
    // fetch("./handData/handData-gesture-wrist-base.json") // use -2 to select pose for gesture fidelity
    .then((response) => response.json())
    .then((rawHandData) => {
      // const first10 = [...handData.slice(0, 10)]
      // set({ handData: [...first10, ...first10, ...first10, ...first10, ...first10, ...handData] /* .slice(-5, -4) */ });
      const startFrameIndex = 650;
      const endFrameIndex = rawHandData.findIndex((rhd) => {
        return (
          rhd.predictedDisplayTime -
            rawHandData[startFrameIndex].predictedDisplayTime >
          10000
        );
      });
      // console.log(startFrameIndex, endFrameIndex);
      set({ handData: rawHandData.slice(startFrameIndex, endFrameIndex) });
      // const { handData } = get();
      // console.log(
      //   handData[0].predictedDisplayTime,
      //   handData[handData.length - 1].predictedDisplayTime
      // );
      // 59285.723 - 44806.512
      // set({ handData: handData.slice(300, -500)});
      // TODO: remove cycle through handData with timeout waiting on predictedDisplayTime
      let frame = 0;
      function step() {
        const { rafCallback, handData } = get();
        const userFrameHandData = readArrayItem(handData, frame);
        const nextUserFrameHandData = readArrayItem(handData, frame + 1);
        let timeout = 0;
        if (frame !== 0) {
          timeout =
            nextUserFrameHandData.predictedDisplayTime -
            userFrameHandData.predictedDisplayTime;
        }
        // console.log(handData.length, frame, timeout);
        frame = frame + 1 === handData.length ? 0 : frame + 1;
        setTimeout(() => {
          if (typeof rafCallback === "function") {
            rafCallback();
          }
          step();
        }, timeout);
      }

      step();
    });
  fetch("./handData/permutations.json")
    .then((response) => response.json())
    .then(({ permutations }) => {
      set({ permutations });
    });

  // function step(timestamp) {
  //   const { rafCallback } = get();
  //   if (typeof rafCallback === "function") {
  //     rafCallback(timestamp);
  //   }
  //   // setTimeout(() => {
  //   window.requestAnimationFrame(step);
  //   // }, 50)
  // }

  // window.requestAnimationFrame(step);

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
    log(log) {
      socket.emit("log", { ...log, timestamp: Date.now() });
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
      function rafCallback(timestamp) {
        // if (!firstFakeSendTime) {
        //   firstFakeSendTime = timestamp;
        // }
        // console.log(timestamp, firstFakeSendTime, handData[frame].predictedDisplayTime, handData[0].predictedDisplayTime, timestamp - firstFakeSendTime, handData[frame].predictedDisplayTime - handData[0].predictedDisplayTime);
        // if (timestamp - firstFakeSendTime < handData[frame].predictedDisplayTime - handData[0].predictedDisplayTime) {
        //   console.log('send');
        // } else {
        //   console.log('dont send');
        //   return
        // }
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
        // emitFakeHandDatas(fakeHandDatas);
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

export function useLog() {
  return useSocket((state) => state.log);
}

export default useSocket;
