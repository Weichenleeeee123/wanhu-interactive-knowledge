import { gradientStep } from "./experiments";

function index(size: number, random: () => number) {
  const value = random();
  if (!Number.isFinite(value) || value < 0 || value >= 1)
    throw new Error("随机数必须在 [0,1) 内");
  return Math.floor(value * size);
}

export function compareHostRules(trials: number, random = Math.random) {
  if (!Number.isInteger(trials) || trials < 1 || trials > 1000)
    throw new Error("模拟次数应为 1–1000");
  const informed = { eligible: trials, stayWins: 0, switchWins: 0 };
  const blind = { eligible: 0, stayWins: 0, switchWins: 0, prizeReveals: 0 };
  for (let i = 0; i < trials; i++) {
    const prize = index(3, random);
    const choice = index(3, random);
    const others = [0, 1, 2].filter(door => door !== choice);
    const opened = others[index(2, random)];
    // Both policies use the same prize and initial choice. An informed host can always reveal a goat.
    if (choice === prize) informed.stayWins++;
    else informed.switchWins++;
    if (opened === prize) {
      blind.prizeReveals++;
      continue;
    }
    blind.eligible++;
    if (choice === prize) blind.stayWins++;
    else blind.switchWins++;
  }
  return { trials, informed, random: blind };
}

export function gradientComparison(steps: number) {
  if (!Number.isInteger(steps) || steps < 0 || steps > 25)
    throw new Error("对照步数应为 0–25");
  return [0.2, 0.5, 1, 1.2].map(rate => {
    const values = [8];
    for (let i = 0; i < steps; i++) values.push(gradientStep(values[i], rate));
    return { rate, values };
  });
}
