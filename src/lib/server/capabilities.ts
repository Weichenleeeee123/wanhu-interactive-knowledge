import { isAbsolute } from "node:path";
import { stat } from "node:fs/promises";
import { isVerifiedZhihuCli } from "./cli";
import { getAiChatConfig } from "./provider-config";

export async function getCapabilities(
  env: Record<string, string | undefined> = process.env,
  checks: {
    isFile(path: string): Promise<boolean>;
    isAbsolute(path: string): boolean;
  } = {
    isAbsolute,
    isFile: async (path) => (await stat(path)).isFile(),
  },
): Promise<{ search: boolean; generation: boolean; provider: string }> {
  const cli = await isVerifiedZhihuCli(env.ZHIHU_CLI_PATH, checks);
  const search = Boolean(env.ZHIHU_ACCESS_SECRET) || cli;
  const ai = getAiChatConfig(env) !== null;
  const zhihu =
    env.ZHIHU_GENERATION === "1" && (Boolean(env.ZHIHU_ACCESS_SECRET) || cli);
  return {
    search,
    generation: ai || zhihu,
    provider: ai ? "openai-compatible" : zhihu ? "zhihu" : "unconfigured",
  };
}
