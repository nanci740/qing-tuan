import {ChatWorldBooks} from './ChatWorldBooks';
import {ChatIdentityField,ChatDetailButton} from '../../../components/shared/ChatIdentityField';
import { ChatDataButton, ChatDataInput } from './ChatDataControls';
import { ChatAppearanceText, ChatAppearanceRangeRow, ChatAppearanceRange, ChatAppearanceAction, ChatAppearanceFile, ChatAppearanceDraft } from './ChatAppearanceControls';
import { ChatOpeningInput, ChatRestartButton } from './ChatOpeningControls';
import { ChatReplySelect, ChatReplyRangeRow, ChatReplyRangeValue, ChatReplyRange, ChatReplyModel } from './ChatReplyControls';
import { ChatSettingCheckbox } from './ChatSettingCheckbox';
import { ChatSettingTimeDisplay } from './ChatSettingTimeDisplay';
import { ChatSettingsAccordion, ChatSettingsEntry, ChatSettingsEntryButton } from './ChatSettingsAccordion';
import { ChatNavigationSurface } from '../../../components/shared/ChatNavigationSurface';
import { useChatNavigation } from '../../../providers/ChatNavigationProvider';
import { DEFAULT_AVATAR } from '../../../utils/defaultAvatar';
import { OriginalElement } from "../../../components/shared/OriginalElement";
import { SettingsHeader } from "../../../components/shared/SettingsHeader";
/** 原页面的静态结构；所有页面保持挂载，由原脚本切换显示状态。 */
export function ChatSettings() {
  const navigation = useChatNavigation();
  return (
    <ChatSettingsAccordion><ChatNavigationSurface surface="settings" tag="div" id="chatSettingsPage" className="settings-page" hidden={true}>
      {"\n        "}
      <SettingsHeader attributes={[{"name":"class","value":"settings-header"}]}>
        {"\n            "}
        <OriginalElement tag="div" attributes={[{"name":"style","value":"display:flex;align-items:center;gap:8px;"}]}>
          {"\n                "}
          <OriginalElement tag="button" attributes={[{"name":"class","value":"back-btn"},{"name":"id","value":"chatSettingsBack"},{"name":"type","value":"button"},{"name":"aria-label","value":"返回聊天"},{"name":"data-title","value":"返回聊天"}]} onClick={() => navigation.closeSettings()}>
            {"\n                    "}
            <OriginalElement tag="svg" attributes={[{"name":"viewBox","value":"0 0 24 24"},{"name":"width","value":"20"},{"name":"height","value":"20"},{"name":"fill","value":"none"},{"name":"stroke","value":"currentColor"},{"name":"stroke-width","value":"2.2"},{"name":"stroke-linecap","value":"round"},{"name":"stroke-linejoin","value":"round"}]}>
              <OriginalElement tag="polyline" attributes={[{"name":"points","value":"15 18 9 12 15 6"}]} />
            </OriginalElement>
            {"\n                "}
          </OriginalElement>
          {"\n                "}
          <OriginalElement tag="h2" attributes={[]}>
            {"聊天设置"}
          </OriginalElement>
          {"\n            "}
        </OriginalElement>
        {"\n        "}
      </SettingsHeader>
      {"\n        "}
      <OriginalElement tag="div" attributes={[{"name":"class","value":"theme-settings-content chat-settings-shell"}]}>
        {"\n            "}
        <OriginalElement tag="section" attributes={[{"name":"class","value":"chat-settings-profile idw"},{"name":"aria-label","value":"当前角色身份卡"}]}>
          {"\n                "}
          <OriginalElement tag="div" attributes={[{"name":"class","value":"idw-bar"}]}>
            <OriginalElement tag="span" attributes={[{"name":"class","value":"idw-ico"},{"name":"aria-hidden","value":"true"}]} />
            <OriginalElement tag="b" attributes={[]}>
              {"identity_card.exe"}
            </OriginalElement>
            {"\n                    "}
            <OriginalElement tag="span" attributes={[{"name":"class","value":"idw-btns"},{"name":"aria-hidden","value":"true"}]}>
              {"\n                        "}
              <OriginalElement tag="i" attributes={[]}>
                <OriginalElement tag="svg" attributes={[{"name":"viewBox","value":"0 0 10 10"}]}>
                  <OriginalElement tag="path" attributes={[{"name":"d","value":"M2 8.5h5.5"},{"name":"stroke-width","value":"1.8"}]} />
                </OriginalElement>
              </OriginalElement>
              {"\n                        "}
              <OriginalElement tag="i" attributes={[]}>
                <OriginalElement tag="svg" attributes={[{"name":"viewBox","value":"0 0 10 10"}]}>
                  <OriginalElement tag="rect" attributes={[{"name":"x","value":"1.5"},{"name":"y","value":"1.5"},{"name":"width","value":"7"},{"name":"height","value":"7"},{"name":"stroke-width","value":"1.1"}]} />
                  <OriginalElement tag="path" attributes={[{"name":"d","value":"M1.5 2.2h7"},{"name":"stroke-width","value":"1.5"}]} />
                </OriginalElement>
              </OriginalElement>
              {"\n                        "}
              <OriginalElement tag="i" attributes={[{"name":"class","value":"idw-cls"}]}>
                <OriginalElement tag="svg" attributes={[{"name":"viewBox","value":"0 0 10 10"}]}>
                  <OriginalElement tag="path" attributes={[{"name":"d","value":"M2 2l6 6M8 2l-6 6"},{"name":"stroke-width","value":"1.5"}]} />
                </OriginalElement>
              </OriginalElement>
              {"\n                    "}
            </OriginalElement>
            {"\n                "}
          </OriginalElement>
          {"\n                "}
          <OriginalElement tag="div" attributes={[{"name":"class","value":"idw-menu"},{"name":"aria-hidden","value":"true"}]}>
            <OriginalElement tag="span" attributes={[]}>
              <OriginalElement tag="u" attributes={[]}>
                {"F"}
              </OriginalElement>
              {"ile"}
            </OriginalElement>
            <OriginalElement tag="span" attributes={[]}>
              <OriginalElement tag="u" attributes={[]}>
                {"E"}
              </OriginalElement>
              {"dit"}
            </OriginalElement>
            <OriginalElement tag="span" attributes={[]}>
              <OriginalElement tag="u" attributes={[]}>
                {"V"}
              </OriginalElement>
              {"iew"}
            </OriginalElement>
            <OriginalElement tag="span" attributes={[]}>
              <OriginalElement tag="u" attributes={[]}>
                {"H"}
              </OriginalElement>
              {"elp"}
            </OriginalElement>
          </OriginalElement>
          {"\n                "}
          <OriginalElement tag="div" attributes={[{"name":"class","value":"idw-page"}]}>
            {"\n                    "}
            <OriginalElement tag="div" attributes={[{"name":"class","value":"idw-left"}]}>
              {"\n                        "}
              <OriginalElement tag="div" attributes={[{"name":"class","value":"idw-photo"}]}>
                <ChatIdentityField tag="img" attributes={[{"name":"class","value":"chat-settings-profile-avatar"},{"name":"id","value":"chatSettingsAvatar"},{"name":"alt","value":"角色头像"},{"name":"src","value":DEFAULT_AVATAR}]} />
                <OriginalElement tag="span" attributes={[{"name":"class","value":"idw-corner c1"}]} />
                <OriginalElement tag="span" attributes={[{"name":"class","value":"idw-corner c2"}]} />
                <OriginalElement tag="span" attributes={[{"name":"class","value":"idw-corner c3"}]} />
                <OriginalElement tag="span" attributes={[{"name":"class","value":"idw-corner c4"}]} />
              </OriginalElement>
              
              {"\n                        "}
              <ChatIdentityField tag="div" attributes={[{"name":"class","value":"idw-barcode"},{"name":"id","value":"chatSettingsBarcode"},{"name":"aria-hidden","value":"true"}]} />
              {"\n                        "}
              <ChatIdentityField tag="div" attributes={[{"name":"class","value":"idw-code"},{"name":"id","value":"chatSettingsBarcodeCode"}]}>
                {"--------"}
              </ChatIdentityField>
              {"\n                    "}
            </OriginalElement>
            {"\n                    "}
            <OriginalElement tag="div" attributes={[{"name":"class","value":"idw-props"}]}>
              {"\n                        "}
              <OriginalElement tag="div" attributes={[{"name":"class","value":"idw-row idw-name"}]}>
                <OriginalElement tag="label" attributes={[]}>
                  {"Name"}
                </OriginalElement>
                <ChatIdentityField tag="strong" attributes={[{"name":"class","value":"chat-settings-profile-name"},{"name":"id","value":"chatSettingsName"}]}>
                  {"角色"}
                </ChatIdentityField>
              </OriginalElement>
              {"\n                        "}
              <OriginalElement tag="div" attributes={[{"name":"class","value":"idw-row"}]}>
                <OriginalElement tag="label" attributes={[]}>
                  {"Relation"}
                </OriginalElement>
                <ChatIdentityField tag="strong" attributes={[{"name":"id","value":"chatSettingsCardRelation"}]}>
                  {"—"}
                </ChatIdentityField>
              </OriginalElement>
              {"\n                        "}
              <OriginalElement tag="div" attributes={[{"name":"class","value":"idw-row"}]}>
                <OriginalElement tag="label" attributes={[]}>
                  {"Birthday"}
                </OriginalElement>
                <ChatIdentityField tag="strong" attributes={[{"name":"id","value":"chatSettingsCardRole"}]}>
                  {"—"}
                </ChatIdentityField>
              </OriginalElement>
              {"\n                        "}
              <OriginalElement tag="div" attributes={[{"name":"class","value":"idw-row"}]}>
                <OriginalElement tag="label" attributes={[]}>
                  {"MBTI"}
                </OriginalElement>
                <ChatIdentityField tag="strong" attributes={[{"name":"id","value":"chatSettingsCardMBTI"}]}>
                  {"—"}
                </ChatIdentityField>
              </OriginalElement>
              {"\n                        "}
              <OriginalElement tag="div" attributes={[{"name":"class","value":"idw-row idw-memo"}]}>
                <OriginalElement tag="label" attributes={[]}>
                  {"Signature"}
                </OriginalElement>
                <ChatIdentityField tag="strong" attributes={[{"name":"id","value":"chatSettingsCardSecretMemo"}]}>
                  {"—"}
                </ChatIdentityField>
              </OriginalElement>
              {"\n                        "}
              <OriginalElement tag="div" attributes={[{"name":"class","value":"idw-actions"}]}>
                <ChatDetailButton tag="button" attributes={[{"name":"class","value":"idw-detail"},{"name":"id","value":"chatSettingsDetailBtn"},{"name":"type","value":"button"}]}>
                  {"详细资料"}
                </ChatDetailButton>
              </OriginalElement>
              {"\n                    "}
            </OriginalElement>
            {"\n                "}
          </OriginalElement>
          {"\n                "}
          <OriginalElement tag="div" attributes={[{"name":"class","value":"idw-status"}]}>
            <OriginalElement tag="span" attributes={[{"name":"class","value":"idw-grow"}]}>
              <OriginalElement tag="i" attributes={[{"name":"class","value":"idw-dot"}]} />
              <ChatIdentityField tag="span" attributes={[{"name":"id","value":"chatSettingsArchiveTime"}]}>
                {"ID: --"}
              </ChatIdentityField>
            </OriginalElement>
            <OriginalElement tag="span" attributes={[]}>
              {"EXP: Always"}
            </OriginalElement>
            <OriginalElement tag="span" attributes={[{"name":"class","value":"idw-grip"},{"name":"aria-hidden","value":"true"}]} />
          </OriginalElement>
          {"\n            "}
        </OriginalElement>
        {"\n            "}
        <OriginalElement tag="div" attributes={[{"name":"class","value":"chat-settings-menu-label"}]}>
          {"CHAT CONFIGURATION · 07"}
        </OriginalElement>
        {"\n            "}
        <OriginalElement tag="section" attributes={[{"name":"class","value":"chat-settings-menu"}]}>
          {"\n                "}
          <ChatSettingsEntry section="role">
            {"\n                    "}
            <ChatSettingsEntryButton>
              {"\n                        "}
              <OriginalElement tag="span" attributes={[{"name":"class","value":"chat-settings-entry-icon"},{"name":"data-qt-token","value":"inline-020"}]}>
                <OriginalElement tag="svg" attributes={[{"name":"viewBox","value":"0 0 24 24"}]}>
                  <OriginalElement tag="path" attributes={[{"name":"d","value":"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"}]} />
                  <OriginalElement tag="circle" attributes={[{"name":"cx","value":"9"},{"name":"cy","value":"7"},{"name":"r","value":"4"}]} />
                  <OriginalElement tag="path" attributes={[{"name":"d","value":"M22 21v-2a4 4 0 0 0-3-3.87"}]} />
                  <OriginalElement tag="path" attributes={[{"name":"d","value":"M16 3.13a4 4 0 0 1 0 7.75"}]} />
                </OriginalElement>
              </OriginalElement>
              {"\n                        "}
              <OriginalElement tag="span" attributes={[{"name":"class","value":"chat-settings-entry-copy"}]}>
                <OriginalElement tag="strong" attributes={[]}>
                  {"角色与关系"}
                </OriginalElement>
                <OriginalElement tag="span" attributes={[]}>
                  {"当前角色、关系与聊天身份"}
                </OriginalElement>
              </OriginalElement>
              {"\n                        "}
              <OriginalElement tag="svg" attributes={[{"name":"class","value":"chat-settings-entry-chevron"},{"name":"viewBox","value":"0 0 24 24"}]}>
                <OriginalElement tag="polyline" attributes={[{"name":"points","value":"9 18 15 12 9 6"}]} />
              </OriginalElement>
              {"\n                    "}
            </ChatSettingsEntryButton>
            {"\n                    "}
            <OriginalElement tag="div" attributes={[{"name":"class","value":"chat-settings-entry-panel"}]}>
              {"\n                        "}
              <OriginalElement tag="div" attributes={[{"name":"class","value":"chat-setting-subhead"}]}>
                {"关联世界书"}
              </OriginalElement>
              {"\n                        "}
              <OriginalElement tag="div" attributes={[{"name":"class","value":"chat-worldbook-list"},{"name":"id","value":"chatWorldBookList"}]}><ChatWorldBooks /></OriginalElement>
              {"\n                        "}
              <OriginalElement tag="div" attributes={[{"name":"class","value":"chat-setting-hint"}]}>
                {"勾选后，只会把对应世界书的启用条目提供给当前角色。"}
              </OriginalElement>
              {"\n                    "}
            </OriginalElement>
            {"\n                "}
          </ChatSettingsEntry>
          {"\n                "}
          <ChatSettingsEntry section="reply">
            {"\n                    "}
            <ChatSettingsEntryButton>
              {"\n                        "}
              <OriginalElement tag="span" attributes={[{"name":"class","value":"chat-settings-entry-icon"},{"name":"data-qt-token","value":"inline-021"}]}>
                <OriginalElement tag="svg" attributes={[{"name":"viewBox","value":"0 0 24 24"}]}>
                  <OriginalElement tag="path" attributes={[{"name":"d","value":"M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"}]} />
                </OriginalElement>
              </OriginalElement>
              {"\n                        "}
              <OriginalElement tag="span" attributes={[{"name":"class","value":"chat-settings-entry-copy"}]}>
                <OriginalElement tag="strong" attributes={[]}>
                  {"模型与回复"}
                </OriginalElement>
                <OriginalElement tag="span" attributes={[]}>
                  {"模型、上下文、回复方式与节奏"}
                </OriginalElement>
              </OriginalElement>
              {"\n                        "}
              <OriginalElement tag="svg" attributes={[{"name":"class","value":"chat-settings-entry-chevron"},{"name":"viewBox","value":"0 0 24 24"}]}>
                <OriginalElement tag="polyline" attributes={[{"name":"points","value":"9 18 15 12 9 6"}]} />
              </OriginalElement>
              {"\n                    "}
            </ChatSettingsEntryButton>
            {"\n                    "}
            <OriginalElement tag="div" attributes={[{"name":"class","value":"chat-settings-entry-panel"}]}>
              {"\n                        "}
              <OriginalElement tag="div" attributes={[{"name":"class","value":"chat-setting-field-row"}]}>
                <OriginalElement tag="span" attributes={[{"name":"class","value":"chat-setting-field-label"}]}>
                  <OriginalElement tag="strong" attributes={[]}>
                    {"聊天模型"}
                  </OriginalElement>
                  <OriginalElement tag="span" attributes={[]}>
                    {"留空时跟随 API 设置里的 Chat 模型。"}
                  </OriginalElement>
                </OriginalElement>
                <ChatReplyModel />
              </OriginalElement>
              {"\n                        "}
              <ChatReplyRangeRow>
                <OriginalElement tag="div" attributes={[{"name":"class","value":"chat-setting-range-head"}]}>
                  <OriginalElement tag="span" attributes={[]}>
                    {"上下文条数"}
                  </OriginalElement>
                  <ChatReplyRangeValue setting="contextMessages" />
                </OriginalElement>
                <ChatReplyRange setting="contextMessages" />
              </ChatReplyRangeRow>
              {"\n                        "}
              <OriginalElement tag="div" attributes={[{"name":"class","value":"chat-setting-field-row"}]}>
                <OriginalElement tag="span" attributes={[{"name":"class","value":"chat-setting-field-label"}]}>
                  <OriginalElement tag="strong" attributes={[]}>
                    {"回复长度"}
                  </OriginalElement>
                  <OriginalElement tag="span" attributes={[]}>
                    {"控制每次回复的详细程度。"}
                  </OriginalElement>
                </OriginalElement>
                <ChatReplySelect id="chatSettingReplyLength" setting="replyLength">
                  <OriginalElement tag="option" attributes={[{"name":"value","value":"short"}]}>
                    {"简短"}
                  </OriginalElement>
                  <OriginalElement tag="option" attributes={[{"name":"value","value":"natural"},{"name":"selected","value":""}]}>
                    {"自然"}
                  </OriginalElement>
                  <OriginalElement tag="option" attributes={[{"name":"value","value":"detailed"}]}>
                    {"详细"}
                  </OriginalElement>
                </ChatReplySelect>
              </OriginalElement>
              {"\n                        "}
              <OriginalElement tag="div" attributes={[{"name":"class","value":"chat-setting-field-row"}]}>
                <OriginalElement tag="span" attributes={[{"name":"class","value":"chat-setting-field-label"}]}>
                  <OriginalElement tag="strong" attributes={[]}>
                    {"引用规则"}
                  </OriginalElement>
                  <OriginalElement tag="span" attributes={[]}>
                    {"决定家机是否主动引用较早的消息。"}
                  </OriginalElement>
                </OriginalElement>
                <ChatReplySelect id="chatSettingQuotePolicy" setting="quotePolicy">
                  <OriginalElement tag="option" attributes={[{"name":"value","value":"never"}]}>
                    {"不主动引用"}
                  </OriginalElement>
                  <OriginalElement tag="option" attributes={[{"name":"value","value":"necessary"},{"name":"selected","value":""}]}>
                    {"仅必要时"}
                  </OriginalElement>
                  <OriginalElement tag="option" attributes={[{"name":"value","value":"free"}]}>
                    {"自然判断"}
                  </OriginalElement>
                </ChatReplySelect>
              </OriginalElement>
              {"\n                        "}
              <OriginalElement tag="label" attributes={[{"name":"class","value":"chat-setting-row"}]}>
                <OriginalElement tag="span" attributes={[{"name":"class","value":"chat-setting-copy"}]}>
                  <OriginalElement tag="strong" attributes={[]}>
                    {"分段回复"}
                  </OriginalElement>
                  <OriginalElement tag="span" attributes={[]}>
                    {"让对方依内容自然拆成多条消息。"}
                  </OriginalElement>
                </OriginalElement>
                <ChatSettingCheckbox id="chatSettingSegmented" setting="segmented" initiallyChecked={true} />
              </OriginalElement>
              {"\n                        "}
              <ChatReplyRangeRow delayed={true}>
                <OriginalElement tag="div" attributes={[{"name":"class","value":"chat-setting-range-head"}]}>
                  <OriginalElement tag="span" attributes={[]}>
                    {"分段发送间隔"}
                  </OriginalElement>
                  <ChatReplyRangeValue setting="segmentDelay" />
                </OriginalElement>
                <ChatReplyRange setting="segmentDelay" />
              </ChatReplyRangeRow>
              {"\n                        "}
              <OriginalElement tag="label" attributes={[{"name":"class","value":"chat-setting-row"}]}>
                <OriginalElement tag="span" attributes={[{"name":"class","value":"chat-setting-copy"}]}>
                  <OriginalElement tag="strong" attributes={[]}>
                    {"时间感知"}
                  </OriginalElement>
                  <OriginalElement tag="span" attributes={[]}>
                    {"把当前日期与时间提供给家机。"}
                  </OriginalElement>
                </OriginalElement>
                <ChatSettingCheckbox id="chatSettingTimeAware" setting="timeAware" initiallyChecked={true} />
              </OriginalElement>
              {"\n                        "}
              <OriginalElement tag="label" attributes={[{"name":"class","value":"chat-setting-row"}]}>
                <OriginalElement tag="span" attributes={[{"name":"class","value":"chat-setting-copy"}]}>
                  <OriginalElement tag="strong" attributes={[]}>
                    {"语音转文字"}
                  </OriginalElement>
                  <OriginalElement tag="span" attributes={[]}>
                    {"回复前先把你的语音转成文字给家机读（用「语音与生图设置」的语音 API）。"}
                  </OriginalElement>
                </OriginalElement>
                <ChatSettingCheckbox id="chatSettingVoiceTranscribe" setting="voiceTranscribe" initiallyChecked={true} />
              </OriginalElement>
              {"\n                        "}
              <OriginalElement tag="label" attributes={[{"name":"class","value":"chat-setting-row"}]}>
                <OriginalElement tag="span" attributes={[{"name":"class","value":"chat-setting-copy"}]}>
                  <OriginalElement tag="strong" attributes={[]}>
                    {"直接听语音"}
                  </OriginalElement>
                  <OriginalElement tag="span" attributes={[]}>
                    {"把录音直接交给模型听，听得出语气；模型要支持音频（如 Gemini、GPT-4o audio），不支持时自动改用文字。"}
                  </OriginalElement>
                </OriginalElement>
                <ChatSettingCheckbox id="chatSettingVoiceDirect" setting="voiceDirect" />
              </OriginalElement>
              {"\n                        "}
              <OriginalElement tag="label" attributes={[{"name":"class","value":"chat-setting-row"}]}>
                <OriginalElement tag="span" attributes={[{"name":"class","value":"chat-setting-copy"}]}>
                  <OriginalElement tag="strong" attributes={[]}>
                    {"家机发语音"}
                  </OriginalElement>
                  <OriginalElement tag="span" attributes={[]}>
                    {"开启后家机会自己决定哪几条用语音发（用「语音与生图设置」的语音服务和音色）；关闭时只发文字。"}
                  </OriginalElement>
                </OriginalElement>
                <ChatSettingCheckbox id="chatSettingAiVoice" setting="aiVoice" />
              </OriginalElement>
              {"\n                        "}
              <OriginalElement tag="label" attributes={[{"name":"class","value":"chat-setting-row"}]}>
                <OriginalElement tag="span" attributes={[{"name":"class","value":"chat-setting-copy"}]}>
                  <OriginalElement tag="strong" attributes={[]}>
                    {"语音自动转文字"}
                  </OriginalElement>
                  <OriginalElement tag="span" attributes={[]}>
                    {"语音消息下面自动显示文字；关闭时长按语音选「转文字」。"}
                  </OriginalElement>
                </OriginalElement>
                <ChatSettingCheckbox id="chatSettingVoiceAutoText" setting="voiceAutoText" />
              </OriginalElement>
              {"\n                        "}
              <OriginalElement tag="label" attributes={[{"name":"class","value":"chat-setting-row"}]}>
                <OriginalElement tag="span" attributes={[{"name":"class","value":"chat-setting-copy"}]}>
                  <OriginalElement tag="strong" attributes={[]}>
                    {"语音自动翻译"}
                  </OriginalElement>
                  <OriginalElement tag="span" attributes={[]}>
                    {"家机的语音消息自动翻译成中文；关闭时长按选「翻译」。"}
                  </OriginalElement>
                </OriginalElement>
                <ChatSettingCheckbox id="chatSettingVoiceAutoTranslate" setting="voiceAutoTranslate" />
              </OriginalElement>
              {"\n                    "}
            </OriginalElement>
            {"\n                "}
          </ChatSettingsEntry>
          {"\n                "}
          <ChatSettingsEntry section="opening">
            {"\n                    "}
            <ChatSettingsEntryButton>
              {"\n                        "}
              <OriginalElement tag="span" attributes={[{"name":"class","value":"chat-settings-entry-icon"},{"name":"data-qt-token","value":"inline-022"}]}>
                <OriginalElement tag="svg" attributes={[{"name":"viewBox","value":"0 0 24 24"}]}>
                  <OriginalElement tag="path" attributes={[{"name":"d","value":"M4 4h16v16H4z"}]} />
                  <OriginalElement tag="path" attributes={[{"name":"d","value":"M8 9h8M8 13h6"}]} />
                </OriginalElement>
              </OriginalElement>
              {"\n                        "}
              <OriginalElement tag="span" attributes={[{"name":"class","value":"chat-settings-entry-copy"}]}>
                <OriginalElement tag="strong" attributes={[]}>
                  {"对话与开场"}
                </OriginalElement>
                <OriginalElement tag="span" attributes={[]}>
                  {"对话起点与重新开场"}
                </OriginalElement>
              </OriginalElement>
              {"\n                        "}
              <OriginalElement tag="svg" attributes={[{"name":"class","value":"chat-settings-entry-chevron"},{"name":"viewBox","value":"0 0 24 24"}]}>
                <OriginalElement tag="polyline" attributes={[{"name":"points","value":"9 18 15 12 9 6"}]} />
              </OriginalElement>
              {"\n                    "}
            </ChatSettingsEntryButton>
            {"\n                    "}
            <OriginalElement tag="div" attributes={[{"name":"class","value":"chat-settings-entry-panel"}]}>
              {"\n                        "}
              <OriginalElement tag="label" attributes={[{"name":"class","value":"chat-setting-block no-divider"}]}>
                <OriginalElement tag="span" attributes={[{"name":"class","value":"chat-setting-block-title"}]}>
                  {"对话起点"}
                </OriginalElement>
                <OriginalElement tag="span" attributes={[{"name":"class","value":"chat-setting-hint"}]}>
                  {"没有聊天记录或重新开场时显示。"}
                </OriginalElement>
                <ChatOpeningInput />
              </OriginalElement>
              {"\n                        "}
              <ChatRestartButton />
              {"\n                    "}
            </OriginalElement>
            {"\n                "}
          </ChatSettingsEntry>
          {"\n                "}
          <ChatSettingsEntry section="appearance">
            {"\n                    "}
            <ChatSettingsEntryButton>
              {"\n                        "}
              <OriginalElement tag="span" attributes={[{"name":"class","value":"chat-settings-entry-icon"},{"name":"data-qt-token","value":"inline-023"}]}>
                <OriginalElement tag="svg" attributes={[{"name":"viewBox","value":"0 0 24 24"}]}>
                  <OriginalElement tag="circle" attributes={[{"name":"cx","value":"13.5"},{"name":"cy","value":"6.5"},{"name":"r","value":"2.5"}]} />
                  <OriginalElement tag="path" attributes={[{"name":"d","value":"M19 8.5V19H5V5h6"}]} />
                  <OriginalElement tag="path" attributes={[{"name":"d","value":"m5 16 4.5-4.5 3 3 2-2L19 17"}]} />
                </OriginalElement>
              </OriginalElement>
              {"\n                        "}
              <OriginalElement tag="span" attributes={[{"name":"class","value":"chat-settings-entry-copy"}]}>
                <OriginalElement tag="strong" attributes={[]}>
                  {"聊天个性化"}
                </OriginalElement>
                <OriginalElement tag="span" attributes={[]}>
                  {"壁纸、字号、字体与专属气泡"}
                </OriginalElement>
              </OriginalElement>
              {"\n                        "}
              <OriginalElement tag="svg" attributes={[{"name":"class","value":"chat-settings-entry-chevron"},{"name":"viewBox","value":"0 0 24 24"}]}>
                <OriginalElement tag="polyline" attributes={[{"name":"points","value":"9 18 15 12 9 6"}]} />
              </OriginalElement>
              {"\n                    "}
            </ChatSettingsEntryButton>
            {"\n                    "}
            <OriginalElement tag="div" attributes={[{"name":"class","value":"chat-settings-entry-panel"}]}>
              {"\n                        "}
              <OriginalElement tag="div" attributes={[{"name":"class","value":"chat-setting-field-row"}]}>
                <OriginalElement tag="span" attributes={[{"name":"class","value":"chat-setting-field-label"}]}>
                  <OriginalElement tag="strong" attributes={[]}>
                    {"独立聊天壁纸"}
                  </OriginalElement>
                  <ChatAppearanceText id="chatWallpaperState" tag="span" />
                </OriginalElement>
                <OriginalElement tag="span" attributes={[{"name":"class","value":"chat-setting-inline-actions"}]}>
                  <ChatAppearanceAction id="chatWallpaperChoose" className="chat-setting-action">
                    {"选择图片"}
                  </ChatAppearanceAction>
                  <ChatAppearanceAction id="chatWallpaperRemove" className="chat-setting-action">
                    {"移除"}
                  </ChatAppearanceAction>
                </OriginalElement>
                <ChatAppearanceFile />
              </OriginalElement>
              {"\n                        "}
              <ChatAppearanceRangeRow id="chatWallpaperFadeRow">
                <OriginalElement tag="div" attributes={[{"name":"class","value":"chat-setting-range-head"}]}>
                  <OriginalElement tag="span" attributes={[]}>
                    {"壁纸淡化"}
                  </OriginalElement>
                  <ChatAppearanceText id="chatWallpaperFadeValue" tag="span" className="chat-setting-range-value" />
                </OriginalElement>
                <ChatAppearanceRange setting="wallpaperFade" />
              </ChatAppearanceRangeRow>
              {"\n                        "}
              <ChatAppearanceRangeRow id="chatWallpaperBlurRow">
                <OriginalElement tag="div" attributes={[{"name":"class","value":"chat-setting-range-head"}]}>
                  <OriginalElement tag="span" attributes={[]}>
                    {"壁纸模糊"}
                  </OriginalElement>
                  <ChatAppearanceText id="chatWallpaperBlurValue" tag="span" className="chat-setting-range-value" />
                </OriginalElement>
                <ChatAppearanceRange setting="wallpaperBlur" />
              </ChatAppearanceRangeRow>
              {"\n                        "}
              <OriginalElement tag="div" attributes={[{"name":"class","value":"chat-setting-range-row"}]}>
                <OriginalElement tag="div" attributes={[{"name":"class","value":"chat-setting-range-head"}]}>
                  <OriginalElement tag="span" attributes={[]}>
                    {"对话字号"}
                  </OriginalElement>
                  <ChatAppearanceText id="chatFontSizeValue" tag="span" className="chat-setting-range-value" />
                </OriginalElement>
                <ChatAppearanceRange setting="fontSize" />
              </OriginalElement>
              {"\n                        "}
              <OriginalElement tag="div" attributes={[{"name":"class","value":"chat-font-card"}]}>
                {"\n                            "}
                <OriginalElement tag="div" attributes={[{"name":"class","value":"theme-font-current"}]}>
                  <OriginalElement tag="div" attributes={[{"name":"class","value":"theme-font-current-copy"}]}>
                    <ChatAppearanceText id="chatFontName" tag="strong" />
                    <ChatAppearanceText id="chatFontSource" tag="span" />
                  </OriginalElement>
                  <ChatAppearanceText id="chatFontBadge" tag="span" className="theme-font-badge" />
                </OriginalElement>
                {"\n                            "}
                <OriginalElement tag="div" attributes={[{"name":"class","value":"theme-font-actions"}]}>
                  <ChatAppearanceAction id="chatFontChoose" className="theme-font-btn ui-cyan-btn">
                    {"导入字体文件"}
                  </ChatAppearanceAction>
                  <ChatAppearanceAction id="chatFontReset" className="theme-font-btn secondary">
                    {"恢复全站字体"}
                  </ChatAppearanceAction>
                </OriginalElement>
                {"\n                            "}
                <OriginalElement tag="div" attributes={[{"name":"class","value":"theme-font-url-row"}]}>
                  <ChatAppearanceDraft />
                  <ChatAppearanceAction id="chatFontUrlApply" className="theme-font-url-btn ui-cyan-btn">
                    {"载入"}
                  </ChatAppearanceAction>
                </OriginalElement>
                {"\n                            "}
                <OriginalElement tag="span" attributes={[{"name":"class","value":"theme-font-hint"}]}>
                  {"支持 TTF、OTF、WOFF、WOFF2，仅套用当前聊天室。"}
                </OriginalElement>
                <ChatAppearanceText id="chatFontImportStatus" tag="div" />
                <ChatAppearanceFile font />
                {"\n                        "}
              </OriginalElement>
              {"\n                        "}
              <OriginalElement tag="label" attributes={[{"name":"class","value":"chat-setting-block"}]}>
                <OriginalElement tag="span" attributes={[{"name":"class","value":"chat-setting-block-title"}]}>
                  {"专属气泡 CSS"}
                </OriginalElement>
                <OriginalElement tag="span" attributes={[{"name":"class","value":"chat-setting-hint"}]}>
                  {"可修改 .chat-bubble 与气泡 SVG；只套用当前聊天室。"}
                </OriginalElement>
                <ChatAppearanceDraft bubble />
              </OriginalElement>
              {"\n                        "}
              <OriginalElement tag="div" attributes={[{"name":"class","value":"chat-setting-inline-actions end"}]}>
                <ChatAppearanceAction id="chatBubbleReset" className="chat-setting-action">
                  {"恢复默认"}
                </ChatAppearanceAction>
                <ChatAppearanceAction id="chatBubbleApply" className="chat-setting-action primary">
                  {"应用样式"}
                </ChatAppearanceAction>
              </OriginalElement>
              {"\n                    "}
            </OriginalElement>
            {"\n                "}
          </ChatSettingsEntry>
          {"\n                "}
          <ChatSettingsEntry section="feedback">
            {"\n                    "}
            <ChatSettingsEntryButton>
              {"\n                        "}
              <OriginalElement tag="span" attributes={[{"name":"class","value":"chat-settings-entry-icon"},{"name":"data-qt-token","value":"inline-024"}]}>
                <OriginalElement tag="svg" attributes={[{"name":"viewBox","value":"0 0 24 24"}]}>
                  <OriginalElement tag="path" attributes={[{"name":"d","value":"M11 5 6 9H3v6h3l5 4z"}]} />
                  <OriginalElement tag="path" attributes={[{"name":"d","value":"M15.5 8.5a5 5 0 0 1 0 7M18 6a8 8 0 0 1 0 12"}]} />
                </OriginalElement>
              </OriginalElement>
              {"\n                        "}
              <OriginalElement tag="span" attributes={[{"name":"class","value":"chat-settings-entry-copy"}]}>
                <OriginalElement tag="strong" attributes={[]}>
                  {"音效与触感"}
                </OriginalElement>
                <OriginalElement tag="span" attributes={[]}>
                  {"发送、回复音效与震动回馈"}
                </OriginalElement>
              </OriginalElement>
              {"\n                        "}
              <OriginalElement tag="svg" attributes={[{"name":"class","value":"chat-settings-entry-chevron"},{"name":"viewBox","value":"0 0 24 24"}]}>
                <OriginalElement tag="polyline" attributes={[{"name":"points","value":"9 18 15 12 9 6"}]} />
              </OriginalElement>
              {"\n                    "}
            </ChatSettingsEntryButton>
            {"\n                    "}
            <OriginalElement tag="div" attributes={[{"name":"class","value":"chat-settings-entry-panel"}]}>
              {"\n                        "}
              <OriginalElement tag="label" attributes={[{"name":"class","value":"chat-setting-row"}]}>
                <OriginalElement tag="span" attributes={[{"name":"class","value":"chat-setting-copy"}]}>
                  <OriginalElement tag="strong" attributes={[]}>
                    {"消息音效"}
                  </OriginalElement>
                  <OriginalElement tag="span" attributes={[]}>
                    {"发送及收到回复时播放轻提示音。"}
                  </OriginalElement>
                </OriginalElement>
                <ChatSettingCheckbox id="chatSettingSound" setting="soundFeedback" />
              </OriginalElement>
              {"\n                        "}
              <OriginalElement tag="label" attributes={[{"name":"class","value":"chat-setting-row"}]}>
                <OriginalElement tag="span" attributes={[{"name":"class","value":"chat-setting-copy"}]}>
                  <OriginalElement tag="strong" attributes={[]}>
                    {"震动回馈"}
                  </OriginalElement>
                  <OriginalElement tag="span" attributes={[]}>
                    {"支持的装置会在发送与收到回复时轻震。"}
                  </OriginalElement>
                </OriginalElement>
                <ChatSettingCheckbox id="chatSettingVibration" setting="vibrationFeedback" />
              </OriginalElement>
              {"\n                    "}
            </OriginalElement>
            {"\n                "}
          </ChatSettingsEntry>
          {"\n                "}
          <ChatSettingsEntry section="display">
            {"\n                    "}
            <ChatSettingsEntryButton>
              {"\n                        "}
              <OriginalElement tag="span" attributes={[{"name":"class","value":"chat-settings-entry-icon"},{"name":"data-qt-token","value":"inline-025"}]}>
                <OriginalElement tag="svg" attributes={[{"name":"viewBox","value":"0 0 24 24"}]}>
                  <OriginalElement tag="path" attributes={[{"name":"d","value":"M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"}]} />
                  <OriginalElement tag="circle" attributes={[{"name":"cx","value":"12"},{"name":"cy","value":"12"},{"name":"r","value":"3"}]} />
                </OriginalElement>
              </OriginalElement>
              {"\n                        "}
              <OriginalElement tag="span" attributes={[{"name":"class","value":"chat-settings-entry-copy"}]}>
                <OriginalElement tag="strong" attributes={[]}>
                  {"消息与显示"}
                </OriginalElement>
                <OriginalElement tag="span" attributes={[]}>
                  {"已读状态与聊天画面显示"}
                </OriginalElement>
              </OriginalElement>
              {"\n                        "}
              <OriginalElement tag="svg" attributes={[{"name":"class","value":"chat-settings-entry-chevron"},{"name":"viewBox","value":"0 0 24 24"}]}>
                <OriginalElement tag="polyline" attributes={[{"name":"points","value":"9 18 15 12 9 6"}]} />
              </OriginalElement>
              {"\n                    "}
            </ChatSettingsEntryButton>
            {"\n                    "}
            <OriginalElement tag="div" attributes={[{"name":"class","value":"chat-settings-entry-panel"}]}>
              {"\n                        "}
              <OriginalElement tag="div" attributes={[{"name":"class","value":"chat-setting-field-row"}]}>
                <OriginalElement tag="span" attributes={[{"name":"class","value":"chat-setting-field-label"}]}>
                  <OriginalElement tag="strong" attributes={[]}>
                    {"消息时间"}
                  </OriginalElement>
                  <OriginalElement tag="span" attributes={[]}>
                    {"控制气泡下方时间的显示方式。"}
                  </OriginalElement>
                </OriginalElement>
                <ChatSettingTimeDisplay>
                  <OriginalElement tag="option" attributes={[{"name":"value","value":"all"}]}>
                    {"每条显示"}
                  </OriginalElement>
                  <OriginalElement tag="option" attributes={[{"name":"value","value":"group"},{"name":"selected","value":""}]}>
                    {"每组最后一条"}
                  </OriginalElement>
                  <OriginalElement tag="option" attributes={[{"name":"value","value":"hidden"}]}>
                    {"隐藏时间"}
                  </OriginalElement>
                </ChatSettingTimeDisplay>
              </OriginalElement>
              {"\n                        "}
              <OriginalElement tag="label" attributes={[{"name":"class","value":"chat-setting-row"}]}>
                <OriginalElement tag="span" attributes={[{"name":"class","value":"chat-setting-copy"}]}>
                  <OriginalElement tag="strong" attributes={[]}>
                    {"显示已读标记"}
                  </OriginalElement>
                  <OriginalElement tag="span" attributes={[]}>
                    {"在已读消息的时间右侧显示双勾。"}
                  </OriginalElement>
                </OriginalElement>
                <ChatSettingCheckbox id="chatSettingReadReceipt" setting="readReceipt" initiallyChecked={true} />
              </OriginalElement>
              {"\n                        "}
              <OriginalElement tag="label" attributes={[{"name":"class","value":"chat-setting-row"}]}>
                <OriginalElement tag="span" attributes={[{"name":"class","value":"chat-setting-copy"}]}>
                  <OriginalElement tag="strong" attributes={[]}>
                    {"正在输入提示"}
                  </OriginalElement>
                  <OriginalElement tag="span" attributes={[]}>
                    {"生成回复时在顶部状态栏显示提示。"}
                  </OriginalElement>
                </OriginalElement>
                <ChatSettingCheckbox id="chatSettingTypingIndicator" setting="typingIndicator" initiallyChecked={true} />
              </OriginalElement>
              {"\n                    "}
            </OriginalElement>
            {"\n                "}
          </ChatSettingsEntry>
          {"\n                "}
          <ChatSettingsEntry section="data">
            {"\n                    "}
            <ChatSettingsEntryButton>
              {"\n                        "}
              <OriginalElement tag="span" attributes={[{"name":"class","value":"chat-settings-entry-icon"},{"name":"data-qt-token","value":"inline-026"}]}>
                <OriginalElement tag="svg" attributes={[{"name":"viewBox","value":"0 0 24 24"}]}>
                  <OriginalElement tag="path" attributes={[{"name":"d","value":"M4 7h16M6 7v12h12V7M9 11h6"}]} />
                  <OriginalElement tag="path" attributes={[{"name":"d","value":"M8 4h8l1 3H7z"}]} />
                </OriginalElement>
              </OriginalElement>
              {"\n                        "}
              <OriginalElement tag="span" attributes={[{"name":"class","value":"chat-settings-entry-copy"}]}>
                <OriginalElement tag="strong" attributes={[]}>
                  {"数据与管理"}
                </OriginalElement>
                <OriginalElement tag="span" attributes={[]}>
                  {"导入、导出、清空与恢复设置"}
                </OriginalElement>
              </OriginalElement>
              {"\n                        "}
              <OriginalElement tag="svg" attributes={[{"name":"class","value":"chat-settings-entry-chevron"},{"name":"viewBox","value":"0 0 24 24"}]}>
                <OriginalElement tag="polyline" attributes={[{"name":"points","value":"9 18 15 12 9 6"}]} />
              </OriginalElement>
              {"\n                    "}
            </ChatSettingsEntryButton>
            {"\n                    "}
            <OriginalElement tag="div" attributes={[{"name":"class","value":"chat-settings-entry-panel"}]}>
              {"\n                        "}
              <OriginalElement tag="div" attributes={[{"name":"class","value":"chat-setting-action-grid"}]}>
                <ChatDataButton id="chatExportCurrent" className="chat-setting-action">
                  {"导出聊天"}
                </ChatDataButton>
                <ChatDataButton id="chatImportCurrent" className="chat-setting-action">
                  {"导入聊天"}
                </ChatDataButton>
                <ChatDataButton id="chatResetPreferences" className="chat-setting-action">
                  {"恢复设置"}
                </ChatDataButton>
                <ChatDataButton id="chatClearCurrent" className="chat-setting-action danger">
                  {"清空聊天"}
                </ChatDataButton>
              </OriginalElement>
              {"\n                        "}
              <ChatDataInput />
              {"\n                        "}
              <OriginalElement tag="div" attributes={[{"name":"class","value":"chat-setting-hint"}]}>
                {"导入及清空只影响当前角色，不会修改其他聊天。"}
              </OriginalElement>
              {"\n                    "}
            </OriginalElement>
            {"\n                "}
          </ChatSettingsEntry>
          {"\n            "}
        </OriginalElement>
        {"\n        "}
      </OriginalElement>
      {"\n    "}
    </ChatNavigationSurface></ChatSettingsAccordion>
  );
}
