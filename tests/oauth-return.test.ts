import {describe,it,expect} from 'vitest';
import {oauthReturnTo} from '../src/lib/server/oauth';
describe('OAuth returns to the current task without leaving the site',()=>{
  it('preserves work identity, reader mode and share fragments',()=>{
    expect(oauthReturnTo('/create?work=abc&mode=learn#v1.snapshot')).toBe('/create?work=abc&mode=learn#v1.snapshot');
  });
  it.each(['https://example.com','//example.com','/\\example.com','/api/auth/zhihu/start','/create\n','/view#'+'a'.repeat(16000)])('rejects unsafe or recursive destination %#',value=>{
    expect(oauthReturnTo(value)).toBe('/create');
  });
});
