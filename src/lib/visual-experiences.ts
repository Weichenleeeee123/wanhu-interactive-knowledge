import { z } from "zod";
const text = (max: number) => z.string().trim().min(1).max(max);
const id = z.string().regex(/^[a-z][a-z0-9_-]{0,23}$/);
const context = {
  rationale: text(240),
  assumptions: text(600),
  evidence: z.object({ quote: text(160), sourceId: text(100) }).strict(),
};
export const PoseSchema = z
  .object({
    id,
    x: z.number().min(50).max(590),
    y: z.number().min(50).max(280),
    width: z.number().min(8).max(150),
    height: z.number().min(8).max(90),
    opacity: z.number().min(0).max(1),
    rotation: z.number().min(-360).max(360),
  })
  .strict();
export const SceneAnimationSchema = z
  .object({
    type: z.literal("scene-animation"),
    ...context,
    objects: z
      .array(
        z
          .object({
            id,
            shape: z.enum(["circle", "rect", "arrow"]),
            label: text(16),
            color: z.enum(["blue", "orange", "green", "purple", "gray"]),
            detail: text(300),
          })
          .strict(),
      )
      .min(1)
      .max(8),
    frames: z
      .array(
        z
          .object({
            title: text(40),
            caption: text(400),
            poses: z.array(PoseSchema).min(1).max(8),
          })
          .strict(),
      )
      .min(2)
      .max(8),
  })
  .strict()
  .superRefine((scene, ctx) => {
    const ids = new Set(scene.objects.map((o) => o.id));
    if (ids.size !== scene.objects.length)
      ctx.addIssue({ code: "custom", message: "图形标识不能重复" });
    for (const [i, frame] of scene.frames.entries()) {
      if (
        frame.poses.length !== ids.size ||
        new Set(frame.poses.map((p) => p.id)).size !== ids.size ||
        frame.poses.some((p) => !ids.has(p.id))
      )
        ctx.addIssue({
          code: "custom",
          path: ["frames", i, "poses"],
          message: "每个分镜必须恰好包含全部图形的位置，隐藏图形请设 opacity=0",
        });
    }
  });
export const BranchingPathSchema = z
  .object({
    type: z.literal("branching-path"),
    ...context,
    start: id,
    nodes: z
      .array(
        z
          .object({
            id,
            title: text(24),
            body: text(500),
            choices: z
              .array(z.object({ label: text(60), target: id }).strict())
              .max(3),
          })
          .strict(),
      )
      .min(3)
      .max(10),
  })
  .strict()
  .superRefine((graph, ctx) => {
    const ids = new Set(graph.nodes.map((n) => n.id));
    if (
      ids.size !== graph.nodes.length ||
      !ids.has(graph.start) ||
      graph.nodes.some((n) => n.choices.some((c) => !ids.has(c.target)))
    ) {
      ctx.addIssue({
        code: "custom",
        message: "流程节点标识重复或引用了不存在的节点",
      });
      return;
    }
    const reachable = new Set<string>();
    function visit(id: string) {
      if (reachable.has(id)) return;
      reachable.add(id);
      graph.nodes
        .find((n) => n.id === id)!
        .choices.forEach((c) => visit(c.target));
    }
    visit(graph.start);
    if (reachable.size !== ids.size)
      ctx.addIssue({ code: "custom", message: "所有节点必须可以从起点到达" });
    const terminating = new Set(
      graph.nodes.filter((n) => n.choices.length === 0).map((n) => n.id),
    );
    for (let i = 0; i < graph.nodes.length; i++)
      graph.nodes.forEach((n) => {
        if (n.choices.some((c) => terminating.has(c.target)))
          terminating.add(n.id);
      });
    if (terminating.size !== ids.size)
      ctx.addIssue({
        code: "custom",
        message: "每条流程必须有可到达的结束节点，不能陷入死循环",
      });
    if (!graph.nodes.some((n) => n.choices.length >= 2))
      ctx.addIssue({
        code: "custom",
        message: "分支演示至少需要两条可比较的路径",
      });
  });
export type SceneAnimationData = z.infer<typeof SceneAnimationSchema>;
export type BranchingPathData = z.infer<typeof BranchingPathSchema>;
export function branchLayout(graph: BranchingPathData) {
  const levels = new Map<string, number>([[graph.start, 0]]);
  const pending = [graph.start];
  for (let i = 0; i < pending.length; i++) {
    const node = graph.nodes.find((n) => n.id === pending[i])!;
    for (const choice of node.choices)
      if (!levels.has(choice.target)) {
        levels.set(choice.target, levels.get(node.id)! + 1);
        pending.push(choice.target);
      }
  }
  // For acyclic paths put joins below every parent, instead of drawing through unrelated nodes.
  const incoming = new Map(graph.nodes.map((n) => [n.id, 0]));
  graph.nodes.forEach((n) =>
    n.choices.forEach((c) =>
      incoming.set(c.target, incoming.get(c.target)! + 1),
    ),
  );
  const ready = graph.nodes.filter((n) => !incoming.get(n.id)).map((n) => n.id);
  const ordered: string[] = [],
    depth = new Map<string, number>();
  for (let i = 0; i < ready.length; i++) {
    const id = ready[i];
    ordered.push(id);
    graph.nodes
      .find((n) => n.id === id)!
      .choices.forEach((c) => {
        depth.set(
          c.target,
          Math.max(depth.get(c.target) ?? 0, (depth.get(id) ?? 0) + 1),
        );
        incoming.set(c.target, incoming.get(c.target)! - 1);
        if (!incoming.get(c.target)) ready.push(c.target);
      });
  }
  if (ordered.length === graph.nodes.length)
    graph.nodes.forEach((n) => levels.set(n.id, depth.get(n.id) ?? 0));
  const rows = Array.from(
    { length: Math.max(...levels.values()) + 1 },
    (_, level) => graph.nodes.filter((n) => levels.get(n.id) === level),
  );
  return {
    height: rows.length * 100 + 10,
    nodes: new Map(
      rows.flatMap((row, level) =>
        row.map(
          (node, i) =>
            [
              node.id,
              {
                x: ((i + 0.5) * 620) / row.length + 10,
                y: level * 100 + 45,
                width: Math.min(260, 620 / row.length - 16),
              },
            ] as const,
        ),
      ),
    ),
  };
}
export function scenePoses(scene: SceneAnimationData, progress: number) {
  const bounded = Math.max(0, Math.min(scene.frames.length - 1, progress));
  const first = Math.floor(bounded),
    blend = bounded - first;
  return scene.frames[first].poses.map((p) => {
    const next = scene.frames[
      Math.min(first + 1, scene.frames.length - 1)
    ].poses.find((n) => n.id === p.id)!;
    const lerp = (
      key: "x" | "y" | "width" | "height" | "opacity" | "rotation",
    ) => p[key] + (next[key] - p[key]) * blend;
    return {
      id: p.id,
      x: lerp("x"),
      y: lerp("y"),
      width: lerp("width"),
      height: lerp("height"),
      opacity: lerp("opacity"),
      rotation: lerp("rotation"),
    };
  });
}
