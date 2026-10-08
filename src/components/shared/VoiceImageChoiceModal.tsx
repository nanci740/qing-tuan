import { PressedButton } from './PressedButton';
import { useChoice } from '../../providers/ChoiceProvider';
/** 原页面的静态结构；所有页面保持挂载，由原脚本切换显示状态。 */
export function VoiceImageChoiceModal() {
 const choice = useChoice();
  return <div className={`vi-choice-modal${choice.open ? ' open' : ''}`} id="viChoiceModal" ref={choice.modalRef} aria-hidden={!choice.open} onClick={event=>{if(event.target===event.currentTarget)choice.close();}}>
      {"\n        "}
      <div className="vi-choice-sheet" role="dialog" aria-modal="true" aria-labelledby="viChoiceTitle">
        {"\n            "}
        <div className="vi-choice-head">
          {"\n                "}
          <div className="vi-choice-title" id="viChoiceTitle">{choice.title}
          </div>
          {"\n                "}
          <PressedButton className="vi-choice-close" id="viChoiceClose" onClick={choice.close} type="button" aria-label="关闭">
            {"×"}
          </PressedButton>
          {"\n            "}
        </div>
        {"\n            "}
        <div className="vi-choice-list" id="viChoiceList">{choice.options.map((option,index)=><PressedButton type="button" className={`vi-choice-item${option.value===choice.selected ? ' selected' : ''}`} key={`${choice.revision}-${index}`} onClick={()=>choice.select(option.value)}><span className="vi-choice-check">{option.value===choice.selected ? '✓' : ''}</span><span>{option.label}</span></PressedButton>)}</div>
        {"\n            "}
        <div className="vi-choice-actions">
          {"\n                "}
          <PressedButton className="vi-btn" id="viChoiceCancel" onClick={choice.close} type="button">
            {"取消"}
          </PressedButton>
          {"\n                "}
          <PressedButton className="vi-btn primary ui-cyan-btn" id="viChoiceConfirm" onClick={choice.confirm} type="button">
            {"确定"}
          </PressedButton>
          {"\n            "}
        </div>
        {"\n        "}
      </div>
      {"\n    "}
    </div>;
}
