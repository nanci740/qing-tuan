import { PressedButton } from '../../../components/shared/PressedButton';
import { CHARACTER_TAGS } from '../../../hooks/useCharacterEditor';
import type { useCharacterEditor } from '../../../hooks/useCharacterEditor';
type EditorProps = {
  editor: ReturnType<typeof useCharacterEditor>;
};
export function CharacterTags({
  editor
}: EditorProps) {
  const {
    record,
    rendered,
    tagsVersion,
    toggleTag,
    deleteTag
  } = editor;
  if (!rendered) return null;
  const selected = record.selectedTags || [],
    custom = record.customTags || [];
  const all = [...CHARACTER_TAGS, ...custom.filter(tag => !CHARACTER_TAGS.includes(tag))];
  return <>{all.map((tag, index) => <PressedButton key={`${tagsVersion}:${index}`} type="button" className={`cc-tag${selected.includes(tag) ? ' on' : ''}`} data-tag={String(tag ?? '')} onClick={event => {
      if (event.target instanceof Element && event.target.closest('[data-tag-del]')) deleteTag(String(tag ?? ''));else toggleTag(String(tag ?? ''));
    }}>{String(tag ?? '')}{custom.includes(tag) && !CHARACTER_TAGS.includes(tag) ? <i data-tag-del={String(tag ?? '')} aria-label="删除标签">×</i> : null}</PressedButton>)}</>;
}
export function CharacterQuickRelations({
  editor
}: EditorProps) {
  const {
    record,
    records,
    index: currentIndex,
    rendered,
    relationsVersion,
    addRelation
  } = editor;
  const others = records.filter((item, index) => index !== currentIndex && (item.name || item.nickname));
  if (!rendered || !others.length) return null;
  return <><span>快速关联：</span>{others.map((item, index) => <PressedButton key={`${relationsVersion}:${index}`} type="button" className="cc-chip" data-rel-quick={String(item.id)} onClick={() => addRelation(records.find(r => String(r.id) === String(item.id)))}>{'＋' + String(item.name || item.nickname)}</PressedButton>)}</>;
}
export function CharacterRelations({
  editor
}: EditorProps) {
  const {
    rendered,
    relationInputs,
    relationsVersion,
    changeRelation,
    deleteRelation
  } = editor;
  if (!rendered) return null;
  if (!relationInputs.length) return <div className="cc-empty">还没有添加人物</div>;
  return <>{relationInputs.map((rel, index) => <Relation key={`${relationsVersion}:${index}`} rel={rel} editor={editor} />)}</>;
}
function Relation({
  rel,
  editor
}: {
  rel: ReturnType<typeof useCharacterEditor>['relationInputs'][number];
  editor: ReturnType<typeof useCharacterEditor>;
}) {
  const {
      changeRelation,
      deleteRelation
    } = editor,
    id = String(rel.id ?? '');
  return <>{'\n            '}<div className="cc-rel" data-rel={id}>
    {'\n                '}<input data-rel-field="targetName" defaultValue={String(rel.targetName ?? '')} placeholder="人物" onInput={event => changeRelation(id, 'targetName', event.currentTarget.value)} />
    {'\n                '}<input data-rel-field="relationType" defaultValue={String(rel.relationType ?? '')} placeholder="关系" onInput={event => changeRelation(id, 'relationType', event.currentTarget.value)} />
    {'\n                '}<PressedButton type="button" className="cc-rel-del" aria-label="删除" onClick={() => deleteRelation(id)}>×</PressedButton>
    {'\n                '}<input className="cc-rel-note" data-rel-field="note" defaultValue={String(rel.note ?? '')} placeholder="备注（可不填）" onInput={event => changeRelation(id, 'note', event.currentTarget.value)} />
    {'\n            '}</div></>;
}
