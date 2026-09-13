"use client";
import dynamic from "next/dynamic";

const GradientExperiment = dynamic(
  () => import("./GradientExperiment").then((module) => module.GradientExperiment),
  { ssr: false, loading: () => <div className="experiment experiment-loading" aria-label="互动实验加载中"><div className="experiment-loading-bar" /><p>互动实验马上就绪…</p></div> },
);

export function HomeExperiment() {
  return <GradientExperiment compact />;
}
