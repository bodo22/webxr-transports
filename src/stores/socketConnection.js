import io from "socket.io-client";

const socket = io("/admin");

export default socket;
