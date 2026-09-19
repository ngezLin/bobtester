const { spawn } = require("child_process");
const path = require("path");

const command = process.platform === "win32" ? "cmd.exe" : "npm";
const args = process.platform === "win32" ? ["/d", "/s", "/c", "npm run dev"] : ["run", "dev"];
const processes = [
  spawn(command, args, {
    cwd: path.join(__dirname, "gui", "server"),
    stdio: "inherit",
  }),
  spawn(command, args, {
    cwd: path.join(__dirname, "gui", "app"),
    stdio: "inherit",
  }),
];

function stopProcesses() {
  for (const child of processes) {
    if (!child.killed) child.kill();
  }
}

process.on("SIGINT", () => {
  stopProcesses();
  process.exit(0);
});
process.on("SIGTERM", () => {
  stopProcesses();
  process.exit(0);
});

for (const child of processes) {
  child.on("exit", (code) => {
    if (code && code !== 0) {
      stopProcesses();
      process.exit(code);
    }
  });
}
