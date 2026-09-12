"use client";
import { useId, useState } from "react";
import { gradientComparison } from "@/lib/comparisons";

const paths = gradientComparison(25);
const colors = ["#26756c", "#a8692a", "#6478a4", "#a84e56"];
const dashes = ["", "3 3", "8 4", "12 3 3 3"];
const names = ["逐渐靠近", "一步到达", "来回震荡", "越走越远"];
const display = (value: number) => Math.abs(value) > 9999 || (value !== 0 && Math.abs(value) < 0.001) ? value.toExponential(2) : Number(value.toFixed(4)).toString();
const max = Math.log1p(paths[3].values[25] ** 2);
const px = (step: number) => 48 + step / 25 * 560;
const py = (loss: number) => 234 - Math.log1p(loss) / max * 200;

export function GradientCompare({ onActivity }: { onActivity?: (value: string) => void }) {
  const id = useId();
  const [step, setStep] = useState(0);
  function change(next: number) {
    setStep(next);
    onActivity?.(`同起点比较四种学习率，查看第 ${next} 步：${paths.map(p => `η=${p.rate} 时损失 ${display(p.values[next]**2)}`).join("；")}`);
  }
  return (
    <details className="comparison-lab gradient-compare">
      <summary><span className="lab-tag">放在一起看</span><strong>同一起点，四种学习率会走向哪里？</strong><span aria-hidden="true">＋</span></summary>
      <div className="lab-body">
        <p className="lab-intro">都从 x = 8 出发，走同样的步数。把四条轨迹放在一张图里，看清“更大”什么时候变成了“更远”。</p>
        <div className="comparison-legend">{paths.map((path,index) => <span key={path.rate}><i style={{background:colors[index]}} />η = {path.rate} · {names[index]}</span>)}</div>
        <svg className="loss-comparison-chart" viewBox="0 0 650 280" role="img" aria-label={`四种学习率在第 ${step} 步的损失轨迹，纵轴使用 log(1+损失) 刻度`}>
          {[0,100,10000,1000000,1000000000].map(loss => <g key={loss}><line x1="48" x2="608" y1={py(loss)} y2={py(loss)} stroke="#dfe5db" /><text x="40" y={py(loss)+4} textAnchor="end">{loss===0?"0":loss===100?"100":`10${loss===10000?'⁴':loss===1000000?'⁶':'⁹'}`}</text></g>)}
          {[0,5,10,15,20,25].map(value => <text x={px(value)} y="254" textAnchor="middle" key={value}>{value}</text>)}
          <text x="608" y="275" textAnchor="end">步数</text>
          <text x="48" y="18">损失 f(x) · 对数刻度 log(1 + 损失)</text>
          <line x1={px(step)} x2={px(step)} y1="28" y2="234" stroke="#b6c7bd" strokeDasharray="3 4" />
          {paths.map((path,index) => <g key={path.rate}><path d={path.values.slice(0,step+1).map((x,i)=>`${i?'L':'M'}${px(i)},${py(x*x)}`).join(' ')} stroke={colors[index]} strokeWidth="3" strokeDasharray={dashes[index]} fill="none" /><circle cx={px(step)} cy={py(path.values[step]**2)} r={index===1?4:5} fill={colors[index]} stroke="#fffef9" strokeWidth="1.5" /></g>)}
        </svg>
        <div className="compare-step-control">
          <label htmlFor={id}>同步查看第 <strong>{step}</strong> 步</label>
          <input id={id} aria-label="对照实验步数" type="range" min="0" max="25" step="1" value={step} onChange={event=>change(Number(event.target.value))} />
          <button type="button" className="button" onClick={()=>change(10)}>一起走 10 步</button>
        </div>
        <table className="gradient-comparison-table"><thead><tr><th>学习率</th><th>当前位置 x</th><th>实际损失 f(x)</th></tr></thead><tbody>
          {paths.map((path,index) => <tr key={path.rate}><th><span style={{color:colors[index]}}>η = {path.rate}</span></th><td>{display(path.values[step])}</td><td>{display(path.values[step]**2)}</td></tr>)}
        </tbody></table>
        <p className="lab-takeaway">{step === 0 ? "先往前走几步，观察哪条线降低、哪条保持不变、哪条升高。" : <>更大的学习率不保证更快接近谷底。η = 0.5 一步到达；η = 1 的位置左右跳动，损失却不下降。<strong>判断学习是否进步，要看目标值怎样变化。</strong></>}</p>
        <p className="small muted">知玩扩展实验 · 固定 f(x) = x² 与共同初值 x = 8。对数刻度用于容纳数量级差异，表格保留实际数值；结果不推广到所有损失函数。</p>
      </div>
    </details>
  );
}
