import { PressedButton } from './PressedButton';
import { useWorld } from '../../providers/WorldProvider';
/** 保留原页面结构，选项与开关状态由 React 管理。 */
export function WorldPickerModal() {
  const world = useWorld();
  return <div id="worldPickerModal" className={'api-model-modal' + (world.picker.open ? ' open' : '')} aria-hidden={!world.picker.open} onClick={event => {
    if (event.target === event.currentTarget) world.closePicker();
  }}>
      {"\n        "}
      <div className="api-model-sheet api-provider-sheet" role="dialog" aria-modal="true" aria-label="选择选项">
        {"\n            "}
        <div className="api-model-sheet-head">
          {"\n                "}
          <div className="api-model-sheet-title" id="worldPickerTitle">{world.picker.title}</div>
          {"\n                "}
          <PressedButton className="api-model-close" id="worldPickerClose" type="button" aria-label="关闭选项选择" onClick={() => world.closePicker()}>
            {"×"}
          </PressedButton>
          {"\n            "}
        </div>
        {"\n            "}
        <div className="api-model-list api-provider-list" id="worldPickerList">{world.picker.options.map(([value, label], index) => <PressedButton type='button' data-value={value} className={'api-model-item' + (world.picker.selected === value ? ' selected' : '')} key={`${world.pickerRevision}:${index}`} onClick={()=>world.selectPicker(value)}><span className='api-model-check' aria-hidden='true'/><span className='api-model-name'>{label}</span></PressedButton>)}</div>
        {"\n            "}
        <div className="api-model-actions">
          {"\n                "}
          <PressedButton className="api-model-action" id="worldPickerCancel" type="button" onClick={() => world.closePicker()}>
            {"取消"}
          </PressedButton>
          {"\n                "}
          <PressedButton className="api-model-action primary ui-cyan-btn" id="worldPickerConfirm" type="button" onClick={world.confirmPicker} disabled={world.pickerRevision>0?!world.picker.selected:undefined}>
            {"确定"}
          </PressedButton>
          {"\n            "}
        </div>
        {"\n        "}
      </div>
      {"\n    "}
    </div>;
}
