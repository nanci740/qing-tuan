import type { StyleFragment } from '../types/styles';

const marker = /\/\* @qingtuan-order:(\d+) \*\/\n/g;

export function assembleOriginalCss(sources: readonly string[], firstOrder = 0, lastOrder = Number.POSITIVE_INFINITY): string {
  const fragments: StyleFragment[] = [];
  for (const source of sources) {
    const matches = [...source.matchAll(marker)];
    if (!matches.length) continue;
    for (let i = 0; i < matches.length; i += 1) {
      const current = matches[i];
      if (current.index === undefined) continue;
      const start = current.index + current[0].length;
      const end = matches[i + 1]?.index ?? source.length;
      fragments.push({ order: Number(current[1]), css: source.slice(start, end) });
    }
  }
  fragments.sort((a, b) => a.order - b.order);
  if (new Set(fragments.map(item => item.order)).size !== fragments.length) {
    throw new Error('Duplicate CSS order markers');
  }
  return fragments.filter(item => item.order >= firstOrder && item.order < lastOrder).map(item => item.css).join('\n');
}

export function installOriginalStyles(tokens: string, sources: readonly string[], preFontFragmentCount = 0): void {
  if (preFontFragmentCount > 0) {
    const initial = document.createElement('style');
    initial.dataset.qingtuanStyles = 'pre-font';
    initial.textContent = assembleOriginalCss(sources, 0, preFontFragmentCount);
    const remoteFont = document.head.querySelector('link[rel="stylesheet"]');
    document.head.insertBefore(initial, remoteFont);
  }
  const variables = document.createElement('style');
  variables.dataset.qingtuanStyles = 'tokens';
  variables.textContent = tokens;
  const rules = document.createElement('style');
  rules.dataset.qingtuanStyles = 'rules';
  rules.textContent = assembleOriginalCss(sources, preFontFragmentCount);
  document.head.append(variables, rules);
}
