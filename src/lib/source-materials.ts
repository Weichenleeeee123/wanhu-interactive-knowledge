import type { Source } from "./lesson";
export type SourceMaterial = { sourceId: string; text: string };

// Imported originals remain available in the backup. Only paragraphs still present
// in the visible material may be submitted as evidence for this generation.
export function selectSourcesForMaterial(
  material: string,
  sources: Source[],
  originals?: SourceMaterial[],
) {
  if (!originals) return { sources };
  const normalize = (value: string) => value.replace(/\s+/g, " ").trim();
  const current = normalize(material);
  const sourceMaterials = originals
    .filter((item) => sources.some((source) => source.id === item.sourceId))
    .map((item) => ({
      sourceId: item.sourceId,
      text: item.text
        .split(/\n+/)
        .filter(
          (paragraph) =>
            paragraph.trim() && current.includes(normalize(paragraph)),
        )
        .join("\n\n"),
    }));
  return {
    sourceMaterials,
    sources: sources.map((source) => {
      const active = sourceMaterials.find(
        (item) => item.sourceId === source.id,
      );
      return active
        ? { ...source, excerpt: active.text.slice(0, 1200) }
        : source;
    }),
  };
}
