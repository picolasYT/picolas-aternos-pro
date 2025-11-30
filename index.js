const { spawn } = require("child_process");

function start(name, file, restart = true) {
  console.log(`🚀 Iniciando ${name}...`);

  const p = spawn("node", [file], { stdio: "inherit" });

  if (restart) {
    p.on("exit", (code) => {
      console.log(`❌ ${name} se cerró (code ${code}). Reiniciando en 3s...`);
      setTimeout(() => start(name, file, restart), 3000);
    });
  } else {
    // SIN auto-restart (para Mineflayer)
    p.on("exit", (code) => {
      console.log(`❌ ${name} se cerró (code ${code}).`);
    });
  }

  p.on("error", (err) => {
    console.log(`⚠ Error en ${name}:`, err.message);
  });

  return p;
}

// ---- Lanzamos TODO con un solo comando ----
const discord  = start("Discord Bot", "discord.js", true);
const watchdog = start("Watchdog", "main.js", true);
const mine     = start("Mineflayer", "minebot.js", false); // ⬅️ SIN auto-restart

// ---- Cierre limpio con Ctrl+C ----
process.on("SIGINT", () => {
  console.log("\n🛑 Cerrando procesos...");
  discord.kill();
  watchdog.kill();
  mine.kill();
  process.exit();
});
