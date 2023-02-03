import http from "http";
import Cache from "file-system-cache";
import ipUtil from "ip";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import eslint from "vite-plugin-eslint";
import jsconfigPaths from "vite-jsconfig-paths";

const hostname = "local-ip.co";
const port = 5174;

const addLocalIpLog = () => {
  return {
    name: "custom-log",
    configureServer(server) {
      const { printUrls } = server;
      server.printUrls = () => {
        const ip = ipUtil.address().replaceAll(".", "-");
        server.resolvedUrls["network"].push(
          `https://${ip}.my.${hostname}:${port}/`
        );
        printUrls();
      };
    },
  };
};

async function getFile(path) {
  return new Promise((resolve) => {
    let data = "";
    const uri = `http://${hostname}${path}`;
    http.get(uri, (res) => {
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        resolve(data);
      });
    });
  });
}

const cache = Cache.default({
  basePath: "./.cache", // Optional. Path where cache files are stored (default).
  // ns: "my-namespace", // Optional. A grouping namespace for items.
});

// for 443 port: https://stackoverflow.com/a/23281417

// https://vitejs.dev/config/
export default defineConfig(async () => {
  let cert = await cache.get("cert");
  let key = await cache.get("key");

  if (!cert || !key) {
    cert = await getFile("/cert/server.pem");
    key = await getFile("/cert/server.key");
    await cache.save([
      { key: "cert", value: cert },
      { key: "key", value: key },
    ]);
    console.log("added cert & private key to cache");
  } else {
    console.log("using cert & private key from cache");
  }

  return {
    plugins: [react(), eslint(), jsconfigPaths(), addLocalIpLog()],
    server: {
      port,
      host: true,
      https: { key, cert },
      proxy: {
        "/socket.io": {
          target: "https://localhost:3003",
          ws: true,
          secure: false,
        },
      },
    },
  };
});
