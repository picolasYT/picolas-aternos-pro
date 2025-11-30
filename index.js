const { spawn } = require("child_process");

function start(name, file) {
  console.log(`🚀 Iniciando ${name}...`);

  const p = spawn("node", [file], { stdio: "inherit" });

  p.on("exit", (code) => {
    console.log(`❌ ${name} se cerró (code ${code}). Reiniciando en 3s...`);
    setTimeout(() => start(name, file), 3000);
  });

  p.on("error", (err) => {
    console.log(`⚠ Error en ${name}:`, err.message);
  });

  return p;
}

// ---- Lanzamos TODO con un solo comando ----
const discord = start("Discord Bot", "discord.js");
const watchdog = start("Watchdog", "main.js");
const mine = start("Mineflayer", "minebot.js");

// ---- Cierre limpio con Ctrl+C ----
process.on("SIGINT", () => {
  console.log("\n🛑 Cerrando procesos...");
  discord.kill();
  watchdog.kill();
  mine.kill();
  process.exit();
});
