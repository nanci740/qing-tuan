import { PressedButton } from './PressedButton';
import { useChoice } from '../../providers/ChoiceProvider';
/** 原页面的静态结构；所有页面保持挂载，由原脚本切换显示状态。 */
export function VoiceImageChoiceModal() {
 const choice = useChoice();
 const settings = choice.style === 'settings';
 const cls = (legacy:string, setting:string) => settings ? setting : legacy;
  return <div className={`${cls('vi-choice-modal','api-model-modal settings-choice')}${choice.open ? ' open' : ''}`} id="viChoiceModal" ref={choice.modalRef} aria-hidden={!choice.open} onClick={event=>{if(event.target===event.currentTarget)choice.close();}}>
      {"\n        "}
      <div className={cls('vi-choice-sheet','api-model-sheet api-provider-sheet')} role="dialog" aria-modal="true" aria-labelledby="viChoiceTitle">
        {"\n            "}
        <div className={cls('vi-choice-head','api-model-sheet-head')}>
          {"\n                "}
          <div className={cls('vi-choice-title','api-model-sheet-title')} id="viChoiceTitle">{choice.title}
          </div>
          {"\n                "}
          <PressedButton className={cls('vi-choice-close','api-model-close')} id="viChoiceClose" onClick={choice.close} type="button" aria-label="关闭">
            {"×"}
          </PressedButton>
          {"\n            "}
        </div>
        {"\n            "}
        <div className={cls('vi-choice-list','api-model-list api-provider-list')} id="viChoiceList">{choice.options.map((option,index)=><PressedButton type="button" className={`${cls('vi-choice-item','api-model-item')}${option.value===choice.selected ? ' selected' : ''}`} key={`${choice.revision}-${index}`} onClick={()=>choice.select(option.value)}><span className={cls('vi-choice-check','api-model-check')}>{!settings && option.value===choice.selected ? '✓' : ''}</span><span className={settings ? 'api-model-name' : undefined}>{option.label}</span></PressedButton>)}</div>
        {"\n            "}
        <div className={cls('vi-choice-actions','api-model-actions')}>
          {"\n                "}
          <PressedButton className={cls('vi-btn','api-model-action')} id="viChoiceCancel" onClick={choice.close} type="button">
            {"取消"}
          </PressedButton>
          {"\n                "}
          <PressedButton className={cls('vi-btn primary ui-cyan-btn','api-model-action primary ui-cyan-btn')} id="viChoiceConfirm" onClick={choice.confirm} type="button">
            {"确定"}
          </PressedButton>
          {"\n            "}
        </div>
        {"\n        "}
      </div>
      {"\n    "}
    </div>;
}
