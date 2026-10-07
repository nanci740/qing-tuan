import { createPortal } from 'react-dom';
import { PressedButton } from '../../../components/shared/PressedButton';
import { useCharacterPng } from '../../../hooks/useCharacterPng';

/** 保留工具栏原有节点、次序、空白和属性；文件按钮使用 React 事件及 ref。 */
export function CharacterPngTools() {
  const { editor, input, download, downloadLink, exportPng, importPng } = useCharacterPng();
  return <>{editor?.container && createPortal(<>
    {'\n                    '}<PressedButton className="cc-tool" type="button" data-cc-import="" data-title="从 PNG 导入" onClick={() => input.current?.click()}>导入</PressedButton>
    {'\n                    '}<PressedButton className="cc-tool" type="button" data-cc-export="" data-title="导出成 PNG 角色卡" onClick={() => void exportPng()}>导出</PressedButton>
    {'\n                    '}<input className="cc-import-input" type="file" accept="image/png,.png" hidden ref={input} onChange={event => { void importPng(event.currentTarget.files?.[0]); event.currentTarget.value = ''; }} />
    {'\n                '}
  </>, editor.container)}{download && createPortal(<a ref={downloadLink} href={download.url} download={download.name} />, document.body)}</>;
}
