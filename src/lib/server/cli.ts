import { execFile as execFileCallback } from "node:child_process";
import { stat } from "node:fs/promises";
import { isAbsolute, normalize } from "node:path";
import { promisify } from "node:util";

export type ExecFile = (
  file: string,
  args: readonly string[],
  options: {
    shell: false;
    timeout: number;
    maxBuffer: number;
    windowsHide: true;
  },
) => Promise<{ stdout: string }>;

const promisedExecFile = promisify(execFileCallback);

export const defaultExecFile: ExecFile = async (file, args, options) => {
  const result = await promisedExecFile(file, [...args], {
    ...options,
    encoding: "utf8",
  });
  return { stdout: String(result.stdout) };
};

function quoteWindowsArgument(value: string): string {
  if (value && !/[\s"]/.test(value)) return value;
  let quoted = '"';
  let backslashes = 0;
  for (const character of value) {
    if (character === "\\") {
      backslashes += 1;
    } else if (character === '"') {
      quoted += "\\".repeat(backslashes * 2 + 1) + '"';
      backslashes = 0;
    } else {
      quoted += "\\".repeat(backslashes) + character;
      backslashes = 0;
    }
  }
  return quoted + "\\".repeat(backslashes * 2) + '"';
}

export function windowsCommandLineLength(
  file: string,
  args: readonly string[],
): number {
  return [file, ...args].map(quoteWindowsArgument).join(" ").length + 1;
}

export async function isVerifiedZhihuCli(
  candidate: string | undefined,
  checks: {
    isAbsolute(path: string): boolean;
    isFile(path: string): Promise<boolean>;
  } = {
    isAbsolute,
    isFile: async (path) => (await stat(path)).isFile(),
  },
): Promise<boolean> {
  if (!candidate || !checks.isAbsolute(candidate)) return false;
  const expected = normalize(
    "C:\\Users\\Weichen Li\\AppData\\Local\\ZhihuCLI\\current\\zhihu-cli.exe",
  ).toLowerCase();
  if (normalize(candidate).toLowerCase() !== expected) return false;
  try {
    return await checks.isFile(candidate);
  } catch {
    return false;
  }
}
