import { expect, it } from "vitest";
import { parseZhihuLink, resolveZhihuLink } from "../src/lib/zhihu-materials";
import { showcase } from "../src/lib/showcase";

// Regression: review materials use Zhihu's public Tardis permalinks.
it("accepts every judging source and matches equivalent search URLs", async () => {
  for (const item of showcase) {
    const target = parseZhihuLink(item.source.url);
    const result = await resolveZhihuLink(item.source.url, async () => [{
      ...item.source, url: target.url,
    }]);
    expect(result.coverage).toBe("search-excerpt");
    expect(result.source.author).toBe(item.source.author);
  }
});

it("accepts known Tardis channels but rejects unrelated paths and hostnames", () => {
  for (const channel of ["bd", "zm", "jm"]) {
    expect(parseZhihuLink(`https://www.zhihu.com/tardis/${channel}/ans/123`)).toMatchObject({type:"answer",id:"123"});
  }
  for (const url of ["https://www.zhihu.com.evil.test/tardis/bd/art/123", "https://www.zhihu.com/tardis/bd/art/123/edit", "https://www.zhihu.com/tardis/unknown/art/123"]) {
    expect(() => parseZhihuLink(url)).toThrow();
  }
});
