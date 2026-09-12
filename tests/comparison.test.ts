import { describe, expect, it } from "vitest";
import { compareHostRules, gradientComparison } from "../src/lib/comparisons";

describe("conditional host comparison",()=>{
  it("exhausts all 18 equally likely prize/choice/random-door outcomes",()=>{
    const values:number[]=[];
    for(let prize=0;prize<3;prize++) for(let choice=0;choice<3;choice++) for(let coin=0;coin<2;coin++)
      values.push((prize+0.1)/3,(choice+0.1)/3,(coin+0.1)/2);
    const result=compareHostRules(18,()=>values.shift()!);
    expect(result.informed).toEqual({eligible:18,stayWins:6,switchWins:12});
    expect(result.random).toEqual({eligible:12,stayWins:6,switchWins:6,prizeReveals:6});
  });
  it("records zero eligible samples without pretending there is a win rate",()=>{
    const values=[0.5,0.01,0.01];let index=0;
    expect(compareHostRules(5,()=>values[index++%3]).random).toEqual({eligible:0,stayWins:0,switchWins:0,prizeReveals:5});
  });
  it("rejects invalid simulation bounds and random values",()=>{
    expect(()=>compareHostRules(1001)).toThrow();
    expect(()=>compareHostRules(0)).toThrow();
    expect(()=>compareHostRules(1,()=>1)).toThrow();
  });
});
describe("same-start gradient comparison",()=>{
  it("compares exact convergence, one-step zero, oscillation and divergence",()=>{
    const paths=gradientComparison(25);
    expect(paths.every(p=>p.values[0]===8 && p.values.length===26)).toBe(true);
    expect(paths.find(p=>p.rate===0.2)!.values[2]).toBeCloseTo(2.88);
    expect(paths.find(p=>p.rate===0.5)!.values.slice(1).every(x=>x===0)).toBe(true);
    expect(paths.find(p=>p.rate===1)!.values.slice(0,4)).toEqual([8,-8,8,-8]);
    expect(paths.find(p=>p.rate===1.2)!.values[1]).toBeCloseTo(-11.2);
  });
});
