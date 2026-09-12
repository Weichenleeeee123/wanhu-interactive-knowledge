import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
const env = { ...process.env, NEXT_TELEMETRY_DISABLED: "1" };
env.NEXT_DIST_DIR ||= ".next-dev";
if (!env.ZHIHU_CLI_PATH && process.platform === "win32" && env.LOCALAPPDATA) {
  const candidate = join(
    env.LOCALAPPDATA,
    "ZhihuCLI",
    "current",
    "zhihu-cli.exe",
  );
  if (existsSync(candidate)) env.ZHIHU_CLI_PATH = candidate;
}
// Local development can reuse the official CLI's system credential store.
if (env.ZHIHU_CLI_PATH || env.ZHIHU_ACCESS_SECRET) env.ZHIHU_GENERATION ??= "1";
const child = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "dev",
    "--webpack",
    ...process.argv.slice(2),
  ],
  { stdio: "inherit", env, windowsHide: true },
);
child.on("exit", (code) => process.exit(code ?? 1));
