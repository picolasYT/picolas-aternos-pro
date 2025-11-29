const net = require("net");
const { startServer } = require("./aternos");
const { startBot } = require("./minebot");
const CFG = require("./config");

function isOnline() {
  return new Promise(resolve => {
    const socket = new net.Socket();
    socket.setTimeout(4000);

    socket.on("connect", () => {
      socket.destroy();
      resolve(true);
    }).on("timeout", () => {
      socket.destroy();
      resolve(false);
    }).on("error", () => resolve(false))
      .connect(25565, CFG.SERVER_IP);
  });
}

async function watchdog() {
  const online = await isOnline();

  if (!online) {
    console.log("🔴 Server offline, reiniciando...");
    await startServer();
    setTimeout(startBot, 20000);
  } else {
    console.log("🟢 Server OK");
  }
}

setInterval(watchdog, CFG.CHECK_INTERVAL);
watchdog();
