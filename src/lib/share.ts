import { LessonSchema, type Lesson } from "./lesson";
const MAX_BYTES = 65536,
  MAX_ENCODED = 12000;
const encoder = new TextEncoder();
export function parseLessonFile(text: string): Lesson {
  if (encoder.encode(text).length > MAX_BYTES)
    throw new Error("作品文件过大，最多 64 KiB");
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error("无法读取作品，请选择有效的 JSON 文件");
  }
  const parsed = LessonSchema.safeParse(value);
  if (!parsed.success)
    throw new Error("作品版本或内容无效，请检查来源和实验参数");
  return parsed.data;
}
export function lessonJson(lesson: Lesson): string {
  return JSON.stringify(LessonSchema.parse(lesson), null, 2);
}
async function readLimited(
  stream: ReadableStream<Uint8Array>,
): Promise<Uint8Array> {
  const reader = stream.getReader(),
    chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > MAX_BYTES) {
        await reader.cancel();
        throw new Error("作品解压后过大，超过 64 KiB 上限");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const output = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }
  return output;
}
export async function encodeLesson(lesson: Lesson): Promise<string> {
  if (typeof CompressionStream === "undefined")
    throw new Error("此浏览器不支持链接压缩，请使用 JSON 导出");
  const input = encoder.encode(JSON.stringify(LessonSchema.parse(lesson)));
  if (input.length > MAX_BYTES)
    throw new Error("作品内容过大，请缩短讲解后重试");
  const bytes = await readLimited(
    new Blob([input]).stream().pipeThrough(new CompressionStream("gzip")),
  );
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const result =
    "v1." +
    btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  if (result.length > MAX_ENCODED)
    throw new Error("分享链接过长，请缩短讲解或导出 JSON");
  return result;
}
export async function decodeLesson(payload: string): Promise<Lesson> {
  if (!payload.startsWith("v1.")) throw new Error("此作品版本暂不支持");
  if (payload.length > MAX_ENCODED) throw new Error("分享内容过大");
  const encoded = payload.slice(3);
  if (!/^[A-Za-z0-9_-]+$/.test(encoded)) throw new Error("分享链接已损坏");
  if (typeof DecompressionStream === "undefined")
    throw new Error("此浏览器不支持链接解压，请导入 JSON 作品");
  let bytes: Uint8Array;
  try {
    bytes = Uint8Array.from(
      atob(encoded.replace(/-/g, "+").replace(/_/g, "/")),
      (c) => c.charCodeAt(0),
    );
  } catch {
    throw new Error("分享链接已损坏");
  }
  let output: Uint8Array;
  try {
    output = await readLimited(
      new Blob([bytes as BlobPart])
        .stream()
        .pipeThrough(new DecompressionStream("gzip")),
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes("过大")) throw error;
    throw new Error("分享链接已损坏，无法解压作品");
  }
  return parseLessonFile(
    new TextDecoder("utf-8", { fatal: true }).decode(output),
  );
}
