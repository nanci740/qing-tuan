import {ImportPreviewModal} from '../../../components/shared/ImportPreviewModal';
import { useCharacterArchive } from '../../../hooks/useCharacterArchive';
import { CharacterDialogControls } from './CharacterDialogControls';
import { CharacterRecordMenu } from './CharacterRecordMenu';
import { CharacterBanner } from './CharacterBanner';
import { CharacterEditor } from './CharacterEditor';
import { CharacterPngTools } from './CharacterPngTools';
/** 档案外层也由 React 渲染，全部子组件属于同一事件树，没有旧 HTML 宿主。 */
export function CharacterArchive() {
  const {
    importPreview,
    services,
    visible,
    overlay,
    titlebar,
    banner,
    body,
    footer,
    captureClick
  } = useCharacterArchive();
  return services ? (<><ImportPreviewModal state={importPreview.state} choose={importPreview.choose} /><div className="cc-overlay" id="characterCard" hidden={!visible} aria-hidden={!visible} ref={overlay} onClickCapture={captureClick}>
    {'\n        '}<div className="cc-win" role="dialog" aria-modal="true" aria-label="查看资料">
      {'\n            '}<div className="cc-titlebar" ref={titlebar} />
      {'\n            '}<div className="cc-banner" ref={banner} />
      {'\n            '}<div className="cc-body" ref={body} />
      {'\n            '}<div className="cc-footer" ref={footer} />
      {'\n        '}</div>
    <CharacterPngTools /><CharacterEditor /><CharacterBanner /><CharacterRecordMenu /><CharacterDialogControls />
  </div></>) : null;
}
