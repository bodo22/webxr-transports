// sync on local machine 60s
// msgpack /sec: 4285 4297 14173.95081967213 6631.131147540984 6373.836065573771 13993.655737704918
// default /sec: 4087 4089 13211.098360655738 6314.55737704918 8315.737704918032 12829.573770491803 13790.16393442623
// deno default /sec: 5796 6239.55737704918 12153.852459016394 12721.95081967213


// sync on local machine 30s
// msgpack /sec: ~9800
// default /sec: 10099.6
// deno default /sec: 17778.966666666667

// sync on local JA10 network with fairphone 30s
// msgpack /sec: 105.16666666666667
// default /sec: 98.36666666666666
// deno default /sec: 

// sync on local JA10 network with Quest 2 30s
// msgpack /sec: 125.5
// default /sec: 125.26666666666667
// deno default /sec: 

// client handData broadcast: 15 local firefox, 1 chrome instances
// default: ~10-13% CPU, 16MB JS heap
// msgpack: ~10-12% CPU, 25MB JS heap
// deno: ~6-8% CPU, 16MB JS heap (only manages to send ~760-800 events to chrome)

// async on local machine
// msgpack /sec: 36711.983606557376
// default /sec: 44048.16393442623 40334.34426229508
// deno default /sec: buggy


import DuplexConnection from "./duplexConnection.js";
// import { onConnect } from "./utils/pingPongSync.js";
// import { onConnect } from "./utils/pingPongAsync.js";
// import { onConnect } from "./utils/clientPingPong.js";
import { onConnect, onAdminConnect } from "./utils/socketsHandler.js";

new DuplexConnection({
  port: 3003,
  parser: 'default',
  onConnect,
  onAdminConnect,
  secure: process.env.SECURE,
});

new DuplexConnection({
  port: 3001,
  parser: 'msgpack',
  onConnect,
});

// io.listen(port);
// console.log(`socket server listening at :${port}`);
