# PICOLAS Aternos Bot 🤖

Bot automático para Discord que incluye:

- Watchdog de servidor Minecraft
- Bot Mineflayer (AFK / autoconexión)
- Comandos de Discord
- Arranque único con `index.js`
- Compatible con Windows / Linux / Termux

---

## 📦 Requisitos

- Node.js v18+
- Cuenta de Discord con bot creado
- Servidor Minecraft (Aternos u otro)

---

## 📁 Estructura del proyecto

picolas-aternos-bot/
│
├── index.js # Launcher principal
├── discord.js # Bot Discord
├── main.js # Watchdog (online/offline)
├── minebot.js # Bot Mineflayer
├── config.example.js
├── package.json
└── README.md

yaml
Copiar código

---

## ⚙ Instalación

pkg update -y && pkg upgrade -y && pkg install -y git nodejs && rm -rf picolas-aternos-pro && git clone https://github.com/picolasYT/picolas-aternos-pro.git && cd picolas-aternos-pro && npm install && nano config.js


## 💬 Comandos de Discord

| Comando | Acción |
|---------|--------|
| !status | Muestra si el servidor está online |
| !start  | Abre el panel de Aternos |
| !start2 | Inicia Mineflayer |
| !stop2  | Detiene Mineflayer |

---

## ⚠ Importante

- No subir nunca `config.js`
- Cambiar token si lo filtrás
- Mineflayer puede no funcionar en servidores premium
- Aternos no permite arranque automático sin navegador

---

## 🧠 Créditos

Desarrollado por **PICOLAS**

---

## 📜 Licencia

MIT