export function gradientStep(x: number, rate: number) {
  return x - 2 * rate * x;
}
export function gradientStatus(x: number, steps: number) {
  if (!Number.isFinite(x) || Math.abs(x) >= 1e6) return "diverged";
  if (Math.abs(x) < 1e-8) return "converged";
  if (steps >= 100) return "limit";
  return "running";
}
function door(value: number) {
  if (!Number.isInteger(value) || value < 0 || value > 2)
    throw new Error("门编号必须为 0、1 或 2");
}
function randomIndex(length: number, random: () => number) {
  const value = random();
  if (!Number.isFinite(value) || value < 0 || value >= 1)
    throw new Error("随机数必须在 [0,1) 内");
  return Math.floor(value * length);
}
export function revealDoor(
  prize: number,
  choice: number,
  random = Math.random,
) {
  door(prize);
  door(choice);
  const candidates = [0, 1, 2].filter((d) => d !== prize && d !== choice);
  return candidates[randomIndex(candidates.length, random)];
}
export function switchDoor(choice: number, host: number) {
  door(choice);
  door(host);
  if (choice === host) throw new Error("主持人不能打开初选门");
  return 3 - choice - host;
}
export function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
export function simulateMonty(trials: number, random = Math.random) {
  if (!Number.isInteger(trials) || trials < 1 || trials > 1000)
    throw new Error("模拟次数应为 1–1000");
  let stayWins = 0,
    switchWins = 0;
  for (let i = 0; i < trials; i++) {
    const prize = randomIndex(3, random),
      choice = randomIndex(3, random);
    const host = revealDoor(prize, choice, random);
    if (choice === prize) stayWins++;
    if (switchDoor(choice, host) === prize) switchWins++;
  }
  return { trials, stayWins, switchWins };
}
