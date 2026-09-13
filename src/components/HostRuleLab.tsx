"use client";
import { useState } from "react";
import { compareHostRules } from "@/lib/comparisons";

export function HostRuleLab({ onActivity }: { onActivity?: (value: string) => void }) {
  const [prediction, setPrediction] = useState<string | null>(null);
  const [result, setResult] = useState<ReturnType<typeof compareHostRules> | null>(null);
  function run() {
    if (prediction === null) return;
    const next = compareHostRules(1000);
    setResult(next);
    onActivity?.(`对照主持人规则 ${next.trials} 轮：知情主持人换门赢 ${next.informed.switchWins}/${next.informed.eligible}；随机开门后看到空门的 ${next.random.eligible} 轮中，换门赢 ${next.random.switchWins} 轮；另有 ${next.random.prizeReveals} 轮直接开到奖品。`);
  }
  return (
    <details className="comparison-lab host-rule-lab">
      <summary><span className="lab-tag">再追问一步</span><strong>如果主持人也不知道奖品在哪？</strong><span aria-hidden="true">＋</span></summary>
      <div className="lab-body">
        <p className="lab-intro">同样是打开一扇空门，结论会一样吗？只改变主持人的开门规则，其他条件保持一致。</p>
        <div className="rule-cards">
          <article><span className="eyebrow">A / 标准规则</span><h4>知道奖品在哪</h4><p>总能排除一扇未选中的空门，每轮都可以继续决定是否换门。</p></article>
          <article><span className="eyebrow">B / 改变前提</span><h4>不知道，随机开一扇</h4><p>从两扇未选门等概率开一扇。可能直接开到奖品；这里只研究<strong>恰好开到空门</strong>、仍可换门的轮次。</p></article>
        </div>
        <fieldset className="lab-prediction">
          <legend>先猜一猜：B 组开到空门后，换门还占优势吗？</legend>
          <div className="controls">
            {["仍然是 2/3", "变成 1/2", "不确定，先观察"].map(value => <button type="button" key={value} className={`button ${prediction === value ? "selected" : ""}`} disabled={prediction !== null} aria-pressed={prediction === value} onClick={() => setPrediction(value)}>{value}</button>)}
          </div>
          {prediction && <p className="small muted" role="status">这次预测：{prediction}。接下来检验。</p>}
        </fieldset>
        <button type="button" className="button primary" disabled={prediction === null} onClick={run}>对照两种主持人，运行 1000 轮</button>
        {prediction === null && <p className="small muted">先选一个判断；也可以选“不确定”，带着问题观察。</p>}
        {result && <div className="rule-comparison-result" aria-live="polite" data-testid="host-comparison">
          <div className="rule-results">
            {[{label:"A · 知情主持人", data:result.informed, theory:"2/3"}, {label:"B · 随机开门，且看到空门", data:result.random, theory:"1/2"}].map(group => <article key={group.label}>
              <h4>{group.label}</h4>
              <div className="rule-rate">{group.data.eligible ? `${(100 * group.data.switchWins / group.data.eligible).toFixed(1)}%` : "暂无样本"}<span>换门获胜频率</span></div>
              <div className="bar-track"><div style={{width:`${group.data.eligible ? 100*group.data.switchWins/group.data.eligible : 0}%`, background:"var(--teal)"}} /></div>
              <p>{group.data.switchWins} 次换门获胜 / <strong>{group.data.eligible} 次有效样本</strong></p>
              <p className="small muted">对应条件下的理论概率：{group.theory}</p>
            </article>)}
          </div>
          <p className="sample-note"><strong>分母为什么不一样？</strong> B 组另外有 {result.random.prizeReveals} 轮直接开到了奖品，已经不属于“看到空门后是否换门”的问题。它们被展示在这里，没有被算作换门失败。</p>
          <details className="lab-proof">
            <summary>不靠运气：展开六种等可能情况</summary>
            <p>假设初选 1 号门。奖品等概率出现在三扇门后，主持人等概率打开 2 或 3 号门，共六种等可能情况。</p>
            <table><thead><tr><th>奖品在</th><th>随机打开</th><th>是否继续</th><th>换门</th></tr></thead><tbody>
              {[1,2,3].flatMap(prize => [2,3].map(opened => <tr key={`${prize}-${opened}`} className={prize === opened ? "excluded-sample" : ""}>
                <td>{prize} 号门</td><td>{opened} 号门</td><td>{prize === opened ? "开到奖品 · 排除" : "看到空门 · 保留"}</td><td>{prize === opened ? "—" : prize === 1 ? "输" : "赢"}</td>
              </tr>))}
            </tbody></table>
            <p>保留的四种等可能情况中，两种换门赢、两种坚持赢。因此，“开到了空门”不自动意味着换门胜率为 2/3；要先看空门是怎样被选出来的。</p>
          </details>
          <p className="lab-takeaway">带走这个追问：<strong>结论相同的表象背后，产生信息的规则相同吗？</strong></p>
        </div>}
        <p className="small muted lab-footnote">玩乎扩展实验 · 与上方标准三门实验分开统计。模拟频率会波动，理论结果来自所列规则与等可能情况。</p>
      </div>
    </details>
  );
}
