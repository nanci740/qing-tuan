import { useRef, useSyncExternalStore } from 'react';
import { readChatCharacters } from '../../../utils/chatCharacterStorage';
import { showToast } from '../../../utils/toast';
import { confirmChat } from '../../../utils/chatConfirm';
import { PROACTIVE_AFTER, PROACTIVE_PER_DAY, WALLET_REMIND, readMeSettings, subscribeMeSettings, updateMeSettings } from '../../../utils/meSettingsStorage';
import { exportMeData, importMeData } from '../../../utils/meBackup';
import { clearBills } from '../../../utils/walletStorage';

/** 开关：凹下去的小槽，开的时候滑块到右边、槽变主题色。 */
function Toggle({ on, label, onChange }: { on: boolean; label: string; onChange: (on: boolean) => void }) {
  return <button type="button" role="switch" aria-checked={on} aria-label={label} className={'chat-me-set-toggle' + (on ? ' is-on' : '')} onClick={() => onChange(!on)} />;
}
/** 几个选项排一排，选中的凹进去。 */
function Choices<T extends string | number>({ value, options, onChange }: { value: T; options: readonly (readonly [T, string])[]; onChange: (value: T) => void }) {
  return <span className="chat-me-set-choices" role="radiogroup">
    {options.map(([option, label]) => <button type="button" role="radio" key={String(option)} aria-checked={option === value} className={option === value ? 'is-active' : ''} onClick={() => onChange(option)}>{label}</button>)}
  </span>;
}
/** 勾角色：一排小方块标签，勾了的变主题色。 */
function Who({ picked, onChange }: { picked: string[]; onChange: (next: string[]) => void }) {
  const characters = readChatCharacters();
  if (!characters.length) return <div className="chat-me-set-who"><small>还没有角色。</small></div>;
  return <div className="chat-me-set-who">
    {characters.map(item => { const on = picked.includes(item.archiveId); return <button type="button" key={item.archiveId} aria-pressed={on} className={on ? 'is-active' : ''}
      onClick={() => onChange(on ? picked.filter(key => key !== item.archiveId) : [...picked, item.archiveId])}>{on ? '✓ ' : ''}{item.name || '未命名'}</button>; })}
  </div>;
}

/** 「我」→ 设置：跟你本人有关、所有角色共用的设定（每个聊天自己的设定在聊天设置里）。 */
export function MeSettings() {
  const settings = useSyncExternalStore(subscribeMeSettings, readMeSettings), file = useRef<HTMLInputElement>(null);
  const { proactive, notify, wallet, privacy } = settings;
  async function download() {
    try {
      const url = URL.createObjectURL(await exportMeData()), link = document.createElement('a');
      const date = new Date(), stamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
      link.href = url; link.download = `qingtuan-me-${stamp}.json`; document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (error) { showToast('导出失败：' + String((error as Error)?.message || error).slice(0, 60)); }
  }
  async function restore(input: HTMLInputElement) {
    const picked = input.files?.[0]; input.value = '';
    if (!picked) return;
    if (!await confirmChat({ title: '还原「我」的资料？', message: '现在的人设、头像、表情和钱包会换成备份里的。', confirmText: '还原', danger: true })) return;
    try { await importMeData(picked); showToast('还原好了'); } catch (error) { showToast(String((error as Error)?.message || error).slice(0, 60)); }
  }
  async function wipeBills() {
    if (!await confirmChat({ title: '清空账单？', message: '账单纪录会清掉，余额和卡不动；还没收的转账、红包会留着。', confirmText: '清空', danger: true })) return;
    clearBills(); showToast('账单清空了');
  }

  return <div className="chat-me-set">
    <div className="chat-me-group-head">家机主动找你</div>
    <div className="chat-me-set-box">
      <div className="chat-me-set-row"><span>主动找你<small>你一阵子没说话，他会自己先发消息</small></span><Toggle on={proactive.enabled} label="主动找你" onChange={enabled => updateMeSettings('proactive', { enabled })} /></div>
      {proactive.enabled ? <>
        <div className="chat-me-set-row is-sub is-nowrap"><span>多久没聊</span><Choices value={proactive.after} options={PROACTIVE_AFTER.map(value => [value, value < 60 ? `${value}分` : value === 720 ? '半天' : `${value / 60}小时`] as const)} onChange={after => updateMeSettings('proactive', { after })} /></div>
        <div className="chat-me-set-row is-sub"><span>谁会找你<small>没勾的角色不会主动发</small></span></div>
        <Who picked={proactive.who} onChange={who => updateMeSettings('proactive', { who })} />
        <div className="chat-me-set-row is-sub"><span>一天最多几次</span><Choices value={proactive.perDay} options={PROACTIVE_PER_DAY.map(value => [value, value ? String(value) : '不限'] as const)} onChange={perDay => updateMeSettings('proactive', { perDay })} /></div>
      </> : null}
    </div>
    <p className="chat-me-set-note">小手机开着（或开了后台活动）的时候才发得出去。你一直没回的话，他连着找两次就先停，等你回了再算。勿扰时间里他不会找你。</p>

    <div className="chat-me-group-head">通知</div>
    <div className="chat-me-set-box">
      <div className="chat-me-set-row"><span>通知显示内容<small>关掉的话只写「发来一条新消息」</small></span><Toggle on={notify.preview} label="通知显示内容" onChange={preview => updateMeSettings('notify', { preview })} /></div>
      <div className="chat-me-set-row"><span>勿扰时间<small>这段时间不弹通知、不响，他也不会主动找你</small></span><Toggle on={notify.quiet} label="勿扰时间" onChange={quiet => updateMeSettings('notify', { quiet })} /></div>
      {notify.quiet ? <div className="chat-me-set-row is-sub"><span>从</span><span className="chat-me-set-time">
        <input type="time" aria-label="勿扰开始" value={notify.from} onChange={event => event.currentTarget.value && updateMeSettings('notify', { from: event.currentTarget.value })} />到
        <input type="time" aria-label="勿扰结束" value={notify.to} onChange={event => event.currentTarget.value && updateMeSettings('notify', { to: event.currentTarget.value })} />
      </span></div> : null}
    </div>
    <p className="chat-me-set-note">通知开关、声音、震动在手机的「设置 → 后台活动」。</p>

    <div className="chat-me-group-head">钱包</div>
    <div className="chat-me-set-box">
      <div className="chat-me-set-row"><span>隐藏余额<small>钱包里的钱显示成 ****，点小眼睛才看得到</small></span><Toggle on={wallet.hide} label="隐藏余额" onChange={hide => updateMeSettings('wallet', { hide })} /></div>
      <div className="chat-me-set-row is-stack"><span>信用卡还款提醒<small>快到期和逾期时每天弹一次，钱包亮小红点</small></span><Choices value={wallet.remind} options={WALLET_REMIND.map(value => [value, value ? `提前${value}天` : '关'] as const)} onChange={remind => updateMeSettings('wallet', { remind })} /></div>
    </div>

    <div className="chat-me-group-head">隐私</div>
    <div className="chat-me-set-box">
      <div className="chat-me-set-row"><span>让他看到我的在线状态<small>关掉的话他不知道你在不在</small></span><Toggle on={privacy.presence} label="让他看到我的在线状态" onChange={presence => updateMeSettings('privacy', { presence })} /></div>
      <div className="chat-me-set-row"><span>我的人设送给谁</span><Choices value={privacy.personaFor} options={[['all', '所有角色'], ['some', '指定角色']] as const} onChange={personaFor => updateMeSettings('privacy', { personaFor })} /></div>
      {privacy.personaFor === 'some' ? <Who picked={privacy.personaWho} onChange={personaWho => updateMeSettings('privacy', { personaWho })} /> : null}
    </div>

    <div className="chat-me-group-head">资料</div>
    <div className="chat-me-set-box">
      <div className="chat-me-set-row"><span>备份「我」的资料<small>人设、头像、表情、钱包存成一个文件</small></span><button type="button" className="chat-me-st-btn" onClick={download}>导出</button></div>
      <div className="chat-me-set-row"><span>还原<small>选之前导出的文件</small></span><button type="button" className="chat-me-st-btn" onClick={() => file.current?.click()}>选文件</button></div>
      <div className="chat-me-set-row"><span>清空账单<small>余额和卡不动，只清掉账单纪录</small></span><button type="button" className="chat-me-st-btn is-danger" onClick={wipeBills}>清空</button></div>
    </div>
    <input ref={file} type="file" accept="application/json,.json" hidden onChange={event => void restore(event.currentTarget)} />
  </div>;
}
