import { expect, it } from "vitest";
import { articleSharePayload } from "../src/extension/protocol";

it("recognizes direct and Zhihu-wrapped published share links", () => {
  const share="https://wanhu.asia/view#v1.abc_DEF-123";
  expect(articleSharePayload(share,"https://wanhu.asia")).toBe("v1.abc_DEF-123");
  expect(articleSharePayload(`https://link.zhihu.com/?target=${encodeURIComponent(share)}`,"https://wanhu.asia")).toBe("v1.abc_DEF-123");
});
it("rejects credential-bearing, foreign and malformed redirect targets", () => {
  for(const url of ["https://other.test/view#v1.abc", "https://user@wanhu.asia/view#v1.abc", "https://link.zhihu.com.evil.test/?target=https%3A%2F%2Fwanhu.asia%2Fview%23v1.abc", "https://link.zhihu.com/?target=javascript:alert(1)", "https://wanhu.asia/view#bad", "https://link.zhihu.com/?target=https%3A%2F%2Fuser%40wanhu.asia%2Fview%23v1.abc"]) {
    expect(articleSharePayload(url,"https://wanhu.asia")).toBeNull();
  }
});
