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
    // (no usamos auto-restart acá)
    p.on("exit", (code) => {
      console.log(`❌ ${name} se cerró (code ${code}).`);
    });
  }

  p.on("error", (err) => {
    console.log(`⚠ Error en ${name}:`, err.message);
  });

  return p;
}

// ------------------------
// PROCESOS PRINCIPALES
// ------------------------
const discord  = start("Discord Bot", "discord.js", true);
const watchdog = start("Watchdog", "main.js", true); // solo mira estado

// ------------------------
// CIERRE LIMPIO
// ------------------------
process.on("SIGINT", () => {
  console.log("\n🛑 Cerrando procesos...");
  discord.kill();
  watchdog.kill();
  process.exit();
});
