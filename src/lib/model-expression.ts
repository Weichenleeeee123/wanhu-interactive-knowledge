// A bounded arithmetic language, shared by the server and the MV3 extension.
// No JavaScript evaluation, properties, assignment, strings, or external calls.
type Node = { kind: 'number'; value: number } | { kind: 'variable'; name: string } |
  { kind: 'operation'; op: string; args: Node[] };
const arity: Record<string, number> = { min: 2, max: 2, abs: 1, sqrt: 1, exp: 1, log: 1 };
export const reservedModelIds = new Set(['t', ...Object.keys(arity), 'constructor', 'prototype', '__proto__']);

export function compileExpression(expression: string, allowed: Set<string>) {
  if (!expression.trim() || expression.length > 240) throw new Error('公式长度应为 1–240 字符');
  const tokens: string[] = [];
  let offset = 0;
  while (offset < expression.length) {
    const rest = expression.slice(offset);
    const match = rest.match(/^(?:\s+|(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?|[a-z][a-z0-9_]*|[+\-*/^(),])/);
    if (!match) throw new Error('公式包含不支持的字符');
    offset += match[0].length;
    if (match[0].trim()) tokens.push(match[0]);
    if (tokens.length > 120) throw new Error('公式过于复杂');
  }
  let index = 0;
  function parse(minBinding = 0, depth = 0): Node {
    if (depth > 16) throw new Error('公式嵌套过深');
    const token = tokens[index++];
    let node: Node;
    if (token === '-' || token === '+') {
      node = { kind: 'operation', op: token === '-' ? 'negate' : 'positive', args: [parse(25, depth + 1)] };
    } else if (token === '(') {
      node = parse(0, depth + 1);
      if (tokens[index++] !== ')') throw new Error('公式括号不匹配');
    } else if (token && /^(?:\d|\.)/.test(token)) {
      const value = Number(token);
      if (!Number.isFinite(value) || Math.abs(value) > 1e12) throw new Error('公式常数过大');
      node = { kind: 'number', value };
    } else if (token && Object.hasOwn(arity, token) && tokens[index] === '(') {
      index++;
      const args = [parse(0, depth + 1)];
      while (tokens[index] === ',') { index++; args.push(parse(0, depth + 1)); }
      if (tokens[index++] !== ')' || args.length !== arity[token]) throw new Error(`${token} 的参数数量错误`);
      node = { kind: 'operation', op: token, args };
    } else if (token && allowed.has(token)) {
      node = { kind: 'variable', name: token };
    } else throw new Error(`公式引用了未知变量或函数：${token ?? '空值'}`);
    while (index < tokens.length) {
      const op = tokens[index];
      const binding = op === '+' || op === '-' ? 10 : op === '*' || op === '/' ? 20 : op === '^' ? 30 : -1;
      if (binding < minBinding) break;
      index++;
      node = { kind: 'operation', op, args: [node, parse(op === '^' ? binding : binding + 1, depth + 1)] };
    }
    return node;
  }
  const root = parse();
  if (index !== tokens.length) throw new Error('公式包含多余内容');
  function evaluate(node: Node, values: Record<string, number>): number {
    if (node.kind === 'number') return node.value;
    if (node.kind === 'variable') {
      if (!Object.hasOwn(values, node.name) || !Number.isFinite(values[node.name])) throw new Error('变量数值无效');
      return values[node.name];
    }
    const [a, b] = node.args.map(arg => evaluate(arg, values));
    let value: number;
    switch (node.op) {
      case '+': value = a + b; break;
      case '-': value = a - b; break;
      case '*': value = a * b; break;
      case '/': value = a / b; break;
      case '^': value = a ** b; break;
      case 'negate': value = -a; break;
      case 'positive': value = a; break;
      case 'min': value = Math.min(a, b); break;
      case 'max': value = Math.max(a, b); break;
      case 'abs': value = Math.abs(a); break;
      case 'sqrt': value = Math.sqrt(a); break;
      case 'exp': value = Math.exp(a); break;
      case 'log': value = Math.log(a); break;
      default: throw new Error('不支持的运算');
    }
    if (!Number.isFinite(value) || Math.abs(value) > 1e12) throw new Error('计算超出范围或公式无定义，请调整参数');
    return value;
  }
  return (values: Record<string, number>) => evaluate(root, values);
}
