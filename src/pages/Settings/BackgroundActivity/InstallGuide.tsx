import { useEffect, useState } from 'react';
import { PressedButton } from '../../../components/shared/PressedButton';
import { canPromptInstall, isInstalled, isIos, promptInstall, subscribeInstall } from '../../../utils/installApp';
import { showToast } from '../../../utils/toast';

/** 加到主画面的教学：认得出 iPhone 还是安卓，只给对应的步骤；已经从主画面打开就收起来。 */
export function InstallGuide() {
  const [installed, setInstalled] = useState(isInstalled), [added, setAdded] = useState(false), [canPrompt, setCanPrompt] = useState(canPromptInstall), ios = isIos();
  useEffect(() => subscribeInstall(() => { setCanPrompt(canPromptInstall()); setInstalled(isInstalled()); }), []);
  const done = installed || added;
  async function install() {
    if (await promptInstall()) { showToast('装好了，之后从主画面的青团机打开'); setAdded(true); }
  }
  return <div className="background-activity-group background-install" id="backgroundInstallGroup">
    <div className="background-activity-label">{"加到主画面"}</div>
    <div className="background-activity-card">
      <div className="background-activity-row">
        <span className="background-activity-copy">
          <strong>{"青团机像 App 一样用"}</strong>
          <span>{installed ? '已经是从主画面打开的了' : added ? '装好了，之后从主画面的青团机打开' : ios ? 'iPhone 一定要加到主画面，才收得到通知' : '加到主画面后有自己的图示，通知比较稳、比较不会被关掉'}</span>
        </span>
        <span className={'background-alive' + (done ? ' is-on' : '')}><i aria-hidden="true" />{installed ? '在主画面了' : added ? '已装好' : '还在浏览器里'}</span>
      </div>
      {!done && <div className="background-activity-row background-install-steps">
        {ios ? <ol>
          <li><span>用 <b>Safari</b> 打开青团机</span></li>
          <li><span>点下面的分享键 <i className="background-install-key">⇧</i>，往下滑选<b>「加入主画面」</b></span></li>
          <li><span>从<b>主画面的青团机图示</b>打开，再来这里打开「回复通知」</span></li>
        </ol> : <ol>
          <li><span>{canPrompt ? '按下面「安装到主画面」，或' : ''}点 Chrome 右上角 <i className="background-install-key">⋮</i>，选<b>「加到主画面」</b>／<b>「安装应用」</b></span></li>
          <li><span>之后都从<b>主画面的青团机图示</b>打开</span></li>
        </ol>}
        {!ios && canPrompt && <PressedButton type="button" id="backgroundInstallBtn" className="background-install-btn" onClick={() => void install()}>安装到主画面</PressedButton>}
        <p className="background-install-note">{ios ? '从主画面打开的青团机，资料是另外一份。要搬过去的话，先在这里用「整机备份」存一份，再到主画面那边还原。' : '你的资料存在浏览器里，装好之后打开的还是同一份，不会不见。'}</p>
      </div>}
    </div>
  </div>;
}
