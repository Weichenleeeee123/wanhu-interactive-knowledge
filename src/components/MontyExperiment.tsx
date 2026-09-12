"use client";
import { useEffect, useState } from "react";
import { revealDoor, simulateMonty, switchDoor } from "@/lib/experiments";
export function MontyExperiment({ trials = 1000 }: { trials: 100 | 1000 }) {
  const [round, setRound] = useState<{
    prize: number;
    choice: number;
    host: number;
    final: number | null;
  } | null>(null);
  const [tally, setTally] = useState({ played: 0, won: 0 });
  const [batch, setBatch] = useState<ReturnType<typeof simulateMonty> | null>(
      null,
    ),
    [count, setCount] = useState(trials);
  const [answer, setAnswer] = useState("");
  useEffect(() => {
    setCount(trials);
    setBatch(null);
  }, [trials]);
  function choose(choice: number) {
    if (round) return;
    const prize = Math.floor(Math.random() * 3);
    setRound({ prize, choice, host: revealDoor(prize, choice), final: null });
  }
  function finish(change: boolean) {
    if (!round || round.final !== null) return;
    const final = change ? switchDoor(round.choice, round.host) : round.choice;
    setRound({ ...round, final });
    setTally((t) => ({
      played: t.played + 1,
      won: t.won + Number(final === round.prize),
    }));
  }
  const done = round?.final !== null && round !== null;
  return (
    <section
      className="experiment monty-experiment"
      aria-label="三门问题互动实验"
    >
      <div className="experiment-top">
        <span className="eyebrow">EXPERIMENT 02</span>
        <span className="formula">直觉 vs. 概率</span>
      </div>
      <div className="experiment-body">
        <p className="host-rule">
          主持人知道奖品位置，始终打开一扇未选中的空门，并始终给你换门机会。
        </p>
        <div className="doors">
          {[0, 1, 2].map((d) => {
            const open = done || round?.host === d;
            return (
              <button
                key={d}
                className={`door ${round?.choice === d ? "chosen" : ""} ${open ? "open" : ""} ${done && round?.final === d ? "final" : ""}`}
                disabled={round !== null}
                aria-label={`选择 ${d + 1} 号门`}
                onClick={() => choose(d)}
              >
                <span className="door-number">0{d + 1}</span>
                <span className="door-symbol" aria-hidden="true">
                  {open ? (round?.prize === d ? "★" : "○") : "?"}
                </span>
                <span className="door-caption">
                  {open
                    ? round?.prize === d
                      ? "奖品在这里"
                      : "这扇门是空的"
                    : round?.choice === d
                      ? "你的初选"
                      : "选择这扇门"}
                </span>
              </button>
            );
          })}
        </div>
        {!round && (
          <p className="experiment-status">
            第一步：选一扇门。跟着你的直觉来。
          </p>
        )}
        {round && !done && (
          <>
            <p className="experiment-status">
              主持人打开了 {round.host + 1} 号空门。现在，你的决定是？
            </p>
            <div className="controls">
              <button className="button primary" onClick={() => finish(true)}>
                换一扇门
              </button>
              <button className="button" onClick={() => finish(false)}>
                坚持原来的门
              </button>
            </div>
          </>
        )}
        {done && (
          <div
            data-testid="monty-result"
            className="round-result"
            role="status"
          >
            <strong>
              {round.final === round.prize
                ? "这次你赢了！"
                : "这次与奖品擦肩而过。"}
            </strong>
            <p>单次结果不能说明策略的胜率，再看一组批量实验。</p>
            <button className="button" onClick={() => setRound(null)}>
              再玩一轮 ↺
            </button>
          </div>
        )}
        <p className="small muted">
          亲手体验：{tally.played} 轮 / 赢了 {tally.won}{" "}
          轮。与下面的批量实验分开计数。
        </p>
        <div className="batch-block">
          <div className="section-line">
            <h3>让实验重复发生</h3>
            <select
              aria-label="批量实验次数"
              value={count}
              onChange={(e) => {
                setCount(Number(e.target.value) as 100 | 1000);
                setBatch(null);
              }}
            >
              <option value="100">100 次</option>
              <option value="1000">1000 次</option>
            </select>
          </div>
          <p className="small muted">
            同一批初选与奖品位置，同时比较两种策略。
          </p>
          <button
            className="button primary"
            onClick={() => setBatch(simulateMonty(count))}
          >
            运行 {count} 次
          </button>
          {batch && (
            <div
              data-testid="batch-result"
              className="batch-result"
              aria-live="polite"
            >
              <p>本次共模拟 {batch.trials} 轮</p>
              {[
                { name: "坚持", wins: batch.stayWins, theory: "1/3" },
                { name: "换门", wins: batch.switchWins, theory: "2/3" },
              ].map((s, i) => (
                <div className="bar-row" key={s.name}>
                  <span>{s.name}</span>
                  <div className="bar-track">
                    <div
                      style={{
                        width: `${(s.wins / batch.trials) * 100}%`,
                        background: i ? "var(--teal)" : "var(--orange)",
                      }}
                    />
                  </div>
                  <strong>{((s.wins / batch.trials) * 100).toFixed(1)}%</strong>
                  <small>
                    {s.wins} 次获胜 · 理论 {s.theory}
                  </small>
                </div>
              ))}
              <p className="small muted">
                显示的是本次模拟频率，不会每次恰好等于理论概率。
              </p>
            </div>
          )}
        </div>
        <div className="challenge">
          <span className="eyebrow">CHECK YOUR UNDERSTANDING</span>
          <h3>标准规则下，换门的理论胜率是？</h3>
          <div className="controls">
            {["1/3", "1/2", "2/3"].map((a) => (
              <button
                className={`button ${answer === a ? "selected" : ""}`}
                key={a}
                onClick={() => setAnswer(a)}
              >
                {a}
              </button>
            ))}
          </div>
          <p className="feedback" role="status">
            {answer
              ? answer === "2/3"
                ? "回答正确！初选错误时换门一定赢，而初选错误的概率是 2/3。"
                : "再想想：初选选错的概率是多少？主持人会帮你排除哪一扇门？"
              : ""}
          </p>
        </div>
      </div>
    </section>
  );
}
