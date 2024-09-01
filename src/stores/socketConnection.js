import io from "socket.io-client";

const socket = io("/admin");

// const socket = io("wss://141-44-228-44.my.local-ip.co:3003/admin", {
// const socket = io("wss://127.0.0.1:3003", {
//   transportOptions: {
//     webtransport: {
//       hostname: "127.0.0.1",
//     },
//   },
// });
// const socket = io("wss://localhost:3003/admin");

export default socket;
