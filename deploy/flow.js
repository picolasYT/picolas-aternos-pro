const fs = require("fs");
const path = require("path");

const USERS_FILE = path.join(__dirname, "users.json");

function loadUsers() {
  if (!fs.existsSync(USERS_FILE)) return {};
  return JSON.parse(fs.readFileSync(USERS_FILE));
}

function saveUsers(data) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2));
}

function startSession(userId) {
  const users = loadUsers();
  users[userId] = { step: 1, config: {} };
  saveUsers(users);
}

function setAnswer(userId, key, value) {
  const users = loadUsers();
  users[userId].config[key] = value;
  users[userId].step += 1;
  saveUsers(users);
}

function getSession(userId) {
  const users = loadUsers();
  return users[userId];
}

function endSession(userId) {
  const users = loadUsers();
  delete users[userId];
  saveUsers(users);
}

module.exports = { startSession, setAnswer, getSession, endSession };