const net = require("net");
const CFG = require("./config");

async function isOnline() {
  return new Promise(resolve => {
    const socket = new net.Socket();
    socket.setTimeout(4000);

    socket.on("connect", () => {
      socket.destroy();
      resolve(true);
    });

    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });

    socket.on("error", () => resolve(false));

    socket.connect(CFG.SERVER_PORT, CFG.SERVER_IP);
  });
}

let lastState = null;

async function watchdog() {
  const online = await isOnline();

  if (online !== lastState) {
    if (online) {
      console.log("🟢 ONLINE");
    } else {
      console.log("🔴 OFFLINE");
    }
    lastState = online;
  }
}

setInterval(watchdog, CFG.CHECK_INTERVAL);
watchdog();
