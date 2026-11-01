import { createElement } from 'react';
import { CHARMS } from '../../utils/charmStorage';

const camel = (key: string) => key.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
/** 挂件的图（挂钩在 0,0），放进 <svg> 或 <g> 里用。 */
export function CharmArt({ kind }: { kind: string }) {
  return <>{(CHARMS[kind]?.shapes || []).map(([tag, attrs], index) => createElement(tag, { key: index, ...Object.fromEntries(Object.entries(attrs).map(([key, value]) => [camel(key), value])) }))}</>;
}
