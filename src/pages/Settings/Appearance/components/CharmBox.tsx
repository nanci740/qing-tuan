import { useSyncExternalStore } from 'react';
import { CharmArt } from '../../../../components/shared/CharmArt';
import { CHARM_MAX, charmName, readCharms, setCharmHung, subscribeCharms } from '../../../../utils/charmStorage';
import { readChatCharacters } from '../../../../utils/chatCharacterStorage';
import { showToast } from '../../../../utils/toast';

/** 挂件盒：他送过的挂件都在这里，挂着的凹下去；点一下挂上或摘下（最多挂三个）。 */
export function CharmBox() {
  const gifts = useSyncExternalStore(subscribeCharms, readCharms);
  const names = new Map(readChatCharacters().map(item => [item.archiveId, item.name]));
  const hung = gifts.filter(item => item.hung).length;
  function toggle(id: string, on: boolean) {
    if (!setCharmHung(id, on)) showToast(`最多挂 ${CHARM_MAX} 个，先摘下一个`);
  }
  return <div className="theme-charm-box">
    <div className="theme-option-title">
      <span>{"挂件盒"}</span>
      <span className="theme-option-value">{`挂着 ${hung}/${CHARM_MAX}`}</span>
    </div>
    {gifts.length ? <div className="theme-charm-grid" role="group" aria-label="挂件盒">
      {[...gifts].reverse().map(gift => <button type="button" key={gift.id} aria-pressed={gift.hung} className={'theme-charm-item' + (gift.hung ? ' active' : '')} onClick={() => toggle(gift.id, !gift.hung)}>
        <svg viewBox="-14 -3 28 31" aria-hidden="true"><CharmArt kind={gift.kind} /></svg>
        <b>{charmName(gift.kind)}</b>
        <small>{names.get(gift.from) || '他'} · {new Date(gift.at).getMonth() + 1}/{new Date(gift.at).getDate()}</small>
      </button>)}
    </div> : <span className="theme-setting-note">{"还没有挂件。他送你的会收在这里。"}</span>}
  </div>;
}
