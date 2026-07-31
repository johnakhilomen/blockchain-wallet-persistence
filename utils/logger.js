const config = require("../config");

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const activeLevel = config.env === "production" ? "warn" : "debug";

const timestamp = () => new Date().toISOString();

const log = (level, message) => {
  if (LEVELS[level] > LEVELS[activeLevel]) return;

  const line = `[${timestamp()}] [${level.toUpperCase().padEnd(5)}] ${message}`;

  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else if (level === "debug") {
    console.debug(line);
  } else {
    console.log(line);
  }
};

module.exports = {
  error: (msg) => log("error", msg),
  warn: (msg) => log("warn", msg),
  info: (msg) => log("info", msg),
  debug: (msg) => log("debug", msg),
  // Kept for API compatibility with the call sites in server.js. This used to
  // route through libs/sysnotify.min.js, which has been removed — see the
  // "Security" note in README → Changes.
  sysinfo: (msg) => log("info", msg),
};
