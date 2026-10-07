import { createPortal } from 'react-dom';
import { PressedButton } from '../../../components/shared/PressedButton';
import { CHARACTER_PANELS, useCharacterEditor } from '../../../hooks/useCharacterEditor';
import { CharacterField } from './CharacterField';
import { CharacterTags, CharacterQuickRelations, CharacterRelations } from './CharacterRelations';

/** 保留原节点、文字、属性和空白；表单的事件及编辑状态归 React 管理。 */
export function CharacterEditor() {
  const editor = useCharacterEditor();
  const {
    bridge,
    record,
    panel,
    formVersion,
    pane,
    tagInput,
    setTagInput,
    tagAdd,
    patch,
    addTag,
    addRelation,
    selectPanel
  } = editor;
  return bridge ? createPortal(<>
    {"\n                "}
    <nav className="cc-nav">
      {CHARACTER_PANELS.map(([key, label]) => <PressedButton key={key} type="button" className={`cc-nav-btn${panel === key ? ' active' : ''}`} data-cc-panel={key} onClick={() => selectPanel(key)}>
        {label}
      </PressedButton>)}
    </nav>
    {"\n                "}
    <div className="cc-pane" ref={pane} onScroll={() => bridge?.closeMenu()}>
      {"\n                    "}
      <section className="cc-panel" data-panel="profile" hidden={panel === null ? undefined : panel !== "profile"}>
        {"\n                        "}
        <label className="cc-row">
          <span>
            {"名字"}
          </span>
          <CharacterField data-field="name" placeholder="角色名字" as="input" value={record["name"]} version={formVersion} onValue={value => patch({
            ["name"]: value
          })} />
        </label>
        {"\n                        "}
        <label className="cc-row">
          <span>
            {"昵称"}
          </span>
          <CharacterField data-field="nickname" placeholder="昵称 / 别名" as="input" value={record["nickname"]} version={formVersion} onValue={value => patch({
            ["nickname"]: value
          })} />
        </label>
        {"\n                        "}
        <div className="cc-row">
          <span>
            {"生日"}
          </span>
          <div className="cc-split">
            <CharacterField data-field="birthday" placeholder="如 09.21" as="input" value={record["birthday"]} version={formVersion} onValue={value => patch({
              ["birthday"]: value
            })} />
            <CharacterField data-field="constellation" placeholder="星座" as="input" value={record["constellation"]} version={formVersion} onValue={value => patch({
              ["constellation"]: value
            })} />
          </div>
        </div>
        {"\n                        "}
        <label className="cc-row">
          <span>
            {"关系"}
          </span>
          <CharacterField data-field="relationship" placeholder="如 挚友 / 旅伴" as="input" value={record["relationship"]} version={formVersion} onValue={value => patch({
            ["relationship"]: value
          })} />
        </label>
        {"\n                        "}
        <label className="cc-row">
          <span>
            {"MBTI"}
          </span>
          <CharacterField data-field="mbti" placeholder="如 INFJ" as="input" value={record["mbti"]} version={formVersion} onValue={value => patch({
            ["mbti"]: value
          })} />
        </label>
        {"\n                        "}
        <label className="cc-row">
          <span>
            {"签名"}
          </span>
          <CharacterField data-field="quote" placeholder="个性签名" as="input" value={record["quote"]} version={formVersion} onValue={value => patch({
            ["quote"]: value
          })} />
        </label>
        {"\n                    "}
      </section>
      {"\n                    "}
      <section className="cc-panel" data-panel="appearance" hidden={panel === null ? undefined : panel !== "appearance"}>
        {"\n                        "}
        <div className="cc-panel-tip">
          {"外貌、服饰风格、随身物件"}
        </div>
        {"\n                        "}
        <CharacterField data-field="appearanceText" rows={8} placeholder="TA 是一个怎样的人？发型发色、瞳色、穿着风格……" as="textarea" value={record["appearanceText"]} version={formVersion} onValue={value => patch({
          ["appearanceText"]: value
        })} />
        {"\n                    "}
      </section>
      {"\n                    "}
      <section className="cc-panel" data-panel="personality" hidden={panel === null ? undefined : panel !== "personality"}>
        {"\n                        "}
        <div className="cc-panel-tip">
          {"点一下选择 / 取消；自定义标签旁的 × 可以删除"}
        </div>
        {"\n                        "}
        <div className="cc-tags">
          <CharacterTags editor={editor} />
        </div>
        {"\n                        "}
        <div className="cc-tag-add">
          <CharacterField className="cc-tag-input" placeholder="自定义标签" as="input" value={tagInput} onValue={setTagInput} onKeyDown={event => {
            if (event.key === 'Enter') {
              event.preventDefault();
              tagAdd.current?.click();
            }
          }} />
          <PressedButton type="button" className="cc-btn cc-tag-add-btn" ref={tagAdd} onClick={addTag}>
            {"添加"}
          </PressedButton>
        </div>
        {"\n                    "}
      </section>
      {"\n                    "}
      <section className="cc-panel" data-panel="speech" hidden={panel === null ? undefined : panel !== "speech"}>
        {"\n                        "}
        <div className="cc-panel-tip">
          {"口头禅、称呼方式、语气风格"}
        </div>
        {"\n                        "}
        <CharacterField data-field="speechHabitsText" rows={8} placeholder="TA 说话是什么样子？" as="textarea" value={record["speechHabitsText"]} version={formVersion} onValue={value => patch({
          ["speechHabitsText"]: value
        })} />
        {"\n                    "}
      </section>
      {"\n                    "}
      <section className="cc-panel" data-panel="styles" hidden={panel === null ? undefined : panel !== "styles"}>
        {"\n                        "}
        <div className="cc-panel-tip">
          {"线上：打字习惯 / 回复风格"}
        </div>
        {"\n                        "}
        <CharacterField data-field="onlineStyle" rows={4} placeholder="线上聊天时的样子" as="textarea" value={record["onlineStyle"]} version={formVersion} onValue={value => patch({
          ["onlineStyle"]: value
        })} />
        {"\n                        "}
        <div className="cc-panel-tip">
          {"线下：眼神气场 / 肢体 / 反差"}
        </div>
        {"\n                        "}
        <CharacterField data-field="offlineStyle" rows={4} placeholder="见面时的样子" as="textarea" value={record["offlineStyle"]} version={formVersion} onValue={value => patch({
          ["offlineStyle"]: value
        })} />
        {"\n                    "}
      </section>
      {"\n                    "}
      <section className="cc-panel" data-panel="network" hidden={panel === null ? undefined : panel !== "network"}>
        {"\n                        "}
        <div className="cc-panel-tip">
          {"TA 身边的人"}
        </div>
        {"\n                        "}
        <div className="cc-quick">
          <CharacterQuickRelations editor={editor} />
        </div>
        {"\n                        "}
        <div className="cc-rels">
          <CharacterRelations editor={editor} />
        </div>
        {"\n                        "}
        <PressedButton type="button" className="cc-btn cc-rel-add" onClick={() => addRelation()}>
          {"＋ 添加人物"}
        </PressedButton>
        {"\n                    "}
      </section>
      {"\n                    "}
      <section className="cc-panel" data-panel="favorites" hidden={panel === null ? undefined : panel !== "favorites"}>
        {"\n                        "}
        <div className="cc-panel-tip">
          {"喜欢：爱吃的食物 / 饮品"}
        </div>
        {"\n                        "}
        <CharacterField data-field="favoriteThings" rows={3} placeholder="草莓牛奶、刚出炉的面包…" as="textarea" value={record["favoriteThings"]} version={formVersion} onValue={value => patch({
          ["favoriteThings"]: value
        })} />
        {"\n                        "}
        <div className="cc-panel-tip">
          {"信物：随身信物 / 象征物件"}
        </div>
        {"\n                        "}
        <CharacterField data-field="tokenItem" rows={3} placeholder="一直戴着的旧手表…" as="textarea" value={record["tokenItem"]} version={formVersion} onValue={value => patch({
          ["tokenItem"]: value
        })} />
        {"\n                        "}
        <div className="cc-panel-tip">
          {"讨厌：害怕 / 避讳的事物"}
        </div>
        {"\n                        "}
        <CharacterField data-field="dislikes" rows={3} placeholder="打雷、被人敷衍…" as="textarea" value={record["dislikes"]} version={formVersion} onValue={value => patch({
          ["dislikes"]: value
        })} />
        {"\n                    "}
      </section>
      {"\n                    "}
      <section className="cc-panel" data-panel="memories" hidden={panel === null ? undefined : panel !== "memories"}>
        {"\n                        "}
        <div className="cc-panel-tip">
          {"初遇场景、难忘节点、重要约定"}
        </div>
        {"\n                        "}
        <CharacterField data-field="memoriesText" rows={8} placeholder="你们之间发生过什么？" as="textarea" value={record["memoriesText"]} version={formVersion} onValue={value => patch({
          ["memoriesText"]: value
        })} />
        {"\n                    "}
      </section>
      {"\n                    "}
      <section className="cc-panel" data-panel="other" hidden={panel === null ? undefined : panel !== "other"}>
        {"\n                        "}
        <div className="cc-panel-tip">
          {"世界观、关系细节与补充设定"}
        </div>
        {"\n                        "}
        <CharacterField data-field="otherSettingsText" rows={8} placeholder="其他想让 TA 记住的事" as="textarea" value={record["otherSettingsText"]} version={formVersion} onValue={value => patch({
          ["otherSettingsText"]: value
        })} />
        {"\n                    "}
      </section>
      {"\n                    "}
      <section className="cc-panel" data-panel="secret" hidden={panel === null ? undefined : panel !== "secret"}>
        {"\n                        "}
        <div className="cc-panel-tip cc-lock-tip">
          {"只有你知道的小秘密"}
        </div>
        {"\n                        "}
        <CharacterField data-field="secretMemo" rows={6} placeholder="写下一条关于 TA 的专属小秘密…" as="textarea" value={record["secretMemo"]} version={formVersion} onValue={value => patch({
          ["secretMemo"]: value
        })} />
        {"\n                    "}
      </section>
      {"\n                "}
    </div>
    {"\n            "}
  </>, bridge.container) : null;
}
