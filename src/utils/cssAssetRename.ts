import { renameCssAsset, renameInCss } from './cssAssets';
import { chatCssStore } from './chatCss';
import { homeCssStore } from './homeCss';

export const ASSET_RENAMED_EVENT = 'qingtuan:css-asset-renamed';
/** 素材改名：素材库改好以后，聊天美化、主画面美化里写的 url(asset:旧名字) 都跟着换成新名字（已套用的、草稿、模板）。 */
export async function renameAssetEverywhere(from: string, to: string) {
  const name = await renameCssAsset(from, to);
  if (name !== from) {
    for (const store of [chatCssStore, homeCssStore]) store.rewriteAll(css => renameInCss(css, from, name));
    window.dispatchEvent(new CustomEvent(ASSET_RENAMED_EVENT, { detail: { from, to: name } }));
  }
  return name;
}
