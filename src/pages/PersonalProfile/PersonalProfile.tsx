import { PressedButton } from '../../components/shared/PressedButton';
import { OriginalComment } from '../../components/shared/OriginalComment';
import { EditableText } from '../../components/shared/EditableText';
import { usePersonalProfile, readProfileText } from '../../hooks/usePersonalProfile';
import { ProfileText } from './ProfileText';
export function PersonalProfile() {
  const profile = usePersonalProfile();
  return <div id={"personalProfilePage"} style={{
    "zIndex": "2050"
  }} className={`settings-page${profile.open ? " active" : ""}`}>
{"\n        "}
<div className={"pp2-content"}>
{"\n        "}
<header className={"pp2-page-header"}>
{"\n          "}
<div className={"pp2-page-header-left"}>
{"\n            "}
<PressedButton className={"pp2-page-back"} id={"profileBackBtn"} type={"button"} aria-label={"返回设置"} data-title={"返回设置"} onClick={event => {
            event.stopPropagation();
            profile.close();
          }}>
{"\n              "}
<svg viewBox={"0 0 24 24"} fill={"none"} xmlns={"http://www.w3.org/2000/svg"}>
{"\n                "}
<polyline points={"15 18 9 12 15 6"} stroke={"currentColor"} strokeWidth={"2.2"} strokeLinecap={"round"} strokeLinejoin={"round"} />
{"\n              "}
</svg>
{"\n            "}
</PressedButton>
{"\n            "}
<h2 className={"pp2-page-header-title"}>{"个人信息"}</h2>
{"\n          "}
</div>
{"\n        "}
</header>
<div className={"retro-address-bar mh-address"} aria-hidden={"true"}>
<span className={"retro-address-label"}>{"地址"}</span>
<span className={"retro-address-field"}>
<span className={"retro-address-icon"} />
{"C:\\青团\\个人信息\\"}
</span>
</div>
{"\n\n        "}
<div className={"pp2-card mh-binder"}>
{"\n          "}
<div className={"pp2-tabs"}>
{"\n            "}
<div className={"pp2-tab pp2-tab-1"} />
{"\n            "}
<div className={"pp2-tab pp2-tab-2"} />
{"\n          "}
</div>
{"\n\n          "}
<OriginalComment text={" 拍立得便利贴 "} />
{"\n          "}
{"\n\n          "}
<OriginalComment text={" 胶带便签 "} />
{"\n          "}
<div className={"pp2-memo-wrap"}>
{"\n            "}
<div className={"pp2-memo-tape"} />
{"\n            "}
<div className={"pp2-memo-body"}>
{"\n              "}
<div className={"pp2-memo-line"} />
{"\n              "}
<ProfileText role={"textbox"} aria-label={"编辑便利贴第一行"} spellCheck={"false"} className={"pp2-memo-text"} singleLinePaste storageKey={"personal_profile_memo_1"} fallback={"Don't worry,"} as="div" />
{"\n              "}
<div className={"pp2-memo-line"} />
{"\n              "}
<ProfileText role={"textbox"} aria-label={"编辑便利贴第二行"} spellCheck={"false"} className={"pp2-memo-text"} singleLinePaste storageKey={"personal_profile_memo_2"} fallback={"you got this."} as="div" />
{"\n              "}
<div className={"pp2-memo-line"} />
{"\n            "}
</div>
{"\n          "}
</div>
{"\n\n          "}
{"\n          "}
<div className={"pp2-title-divider"} />
{"\n\n          "}
{"\n          "}
{"\n          "}
{"\n          "}
{"\n          "}
{"\n          "}
{"\n          "}
<div className={"pp2-row pp2-spacer pp2-no-line"} />
{"\n\n          "}
<div className={"pp2-perfs"}>
{"\n            "}
<div className={"pp2-perf pp2-dark"} />
{"\n            "}
<div className={"pp2-perf pp2-light"} />
{"\n            "}
<div className={"pp2-perf pp2-dark"} />
{"\n            "}
<div className={"pp2-perf pp2-light"} />
{"\n            "}
<div className={"pp2-perf pp2-dark"} />
{"\n            "}
<div className={"pp2-perf pp2-light"} />
{"\n            "}
<div className={"pp2-perf pp2-dark"} />
{"\n          "}
</div>
{"\n\n          "}
<div className={"pp2-divider"} />
{"\n\n          "}
{"\n          "}
{"\n          "}
{"\n          "}
{"\n          "}
{"\n\n          "}
{"\n          "}
{"\n          "}
{"\n          "}
{"\n\n          "}
{"\n        "}
<div className={"mh-counter"} aria-hidden={"true"}>
{"TODAY "}
<b className={"mh-today"}>{profile.counter.today}</b>
{" "}
<i>{"|"}</i>
{" TOTAL "}
<b className={"mh-total"}>{profile.counter.total}</b>
</div>
<div className={"mh-grid"}>
<div className={"mh-side"}>
<div className={"pp2-polaroid-wrap"}>
{"\n            "}
<OriginalComment text={" 回形针 SVG "} />
{"\n            "}
<svg className={"pp2-paperclip"} width={"13"} height={"24"} viewBox={"0 0 13 24"} fill={"none"} xmlns={"http://www.w3.org/2000/svg"}>
{"\n              "}
<path d={"M7 1.5C4.2 1.5 2.2 3.6 2.2 6.5V18.2C2.2 21 4 22.7 6.3 22.7C8.7 22.7 10.5 20.9 10.5 18.4V7.2C10.5 5.5 9.3 4.2 7.7 4.2C6.1 4.2 4.9 5.5 4.9 7.2V17.8C4.9 19 5.6 19.7 6.6 19.7C7.6 19.7 8.3 19 8.3 17.8V8"} stroke={"#aeb6c5"} strokeWidth={"1.05"} strokeLinecap={"round"} strokeLinejoin={"round"} fill={"none"} />
{"\n            "}
</svg>
{"\n            "}
<OriginalComment text={" 垫底纸张（红色图层）：逆时针 -5.5deg "} />
{"\n            "}
<div className={"pp2-polaroid-back"} />
{"\n            "}
<OriginalComment text={" 前面拍立得（蓝色图层）：顺时针 1deg "} />
{"\n            "}
<div className={"pp2-polaroid-front"}>
{"\n              "}
<div role={"button"} tabIndex={0} aria-label={"点击添加或更换照片"} data-title={"点击添加或更换照片"} className={`pp2-polaroid-photo${profile.photo ? " has-photo" : ""}`} style={profile.photo ? {
                  backgroundImage: `url("${profile.photo}")`
                } : undefined} onClick={profile.choosePhoto} onKeyDown={event => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    profile.choosePhoto();
                  }
                }} />
{"\n              "}
<input className={"pp2-polaroid-file"} type={"file"} accept={"image/*"} aria-hidden={"true"} ref={profile.fileRef} onChange={event => profile.changePhoto(event.currentTarget.files?.[0])} />
{"\n              "}
<div className={"pp2-polaroid-bottom"}>
{"\n                "}
<input className={"pp2-polaroid-caption"} type={"text"} aria-label={"编辑拍立得文字"} spellCheck={"false"} defaultValue={readProfileText("personal_profile_polaroid_caption", "memories")} onChange={event => {
                    try {
                      localStorage.setItem("personal_profile_polaroid_caption", event.currentTarget.value);
                    } catch {}
                  }} onKeyDown={event => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      event.currentTarget.blur();
                    }
                  }} />
{"\n              "}
</div>
{"\n            "}
</div>
{"\n          "}
</div>
<div className={"mh-mood"}>
<span className={"mh-mood-label"}>{"TODAY IS… ♪"}</span>
<EditableText className={"mh-mood-text"} role={"textbox"} aria-label={"编辑今日心情"} spellCheck={"false"} data-placeholder={"想去吹晚风看日落"} value={profile.mood.trim()} onChange={profile.changeMood} />
</div>
</div>
<div className={"mh-win mh-about"}>
<div className={"mh-win-head"}><div className={"pp2-title"}>{"⊹ ˚₊‧ About me ‧₊˚ ✶"}</div></div>
<div className={"mh-win-body"}>
<div className={"pp2-row"}>
{"\n            "}
<span className={"pp2-info-key"}>{"name"}</span>
{"\n            "}
<ProfileText data-placeholder={"月亮 / 小木"} className={"pp2-editable-text"} emptyClass="pp2-is-empty" storageKey={"personal_profile_name"} fallback={""} />
{"\n          "}
</div>
<div className={"pp2-row"}>
{"\n            "}
<span className={"pp2-info-key"}>{"birthday"}</span>
{"\n            "}
<ProfileText data-placeholder={"05 · 18"} className={"pp2-editable-text"} emptyClass="pp2-is-empty" storageKey={"personal_profile_birthday"} fallback={""} />
{"\n          "}
</div>
<div className={"pp2-row"}>
{"\n            "}
<span className={"pp2-info-key"}>{"mbti"}</span>
{"\n            "}
<ProfileText data-placeholder={"ENFP"} className={"pp2-editable-text"} emptyClass="pp2-is-empty" storageKey={"personal_profile_mbti"} fallback={""} />
{"\n          "}
</div>
<div className={"pp2-row"}>
{"\n            "}
<span className={"pp2-info-key"}>{"location"}</span>
{"\n            "}
<ProfileText data-placeholder={"海边小镇 / 城市"} className={"pp2-editable-text"} emptyClass="pp2-is-empty" storageKey={"personal_profile_location"} fallback={""} />
{"\n          "}
</div>
<div className={"pp2-row"}>
{"\n            "}
<span className={"pp2-info-key"}>{"mood"}</span>
{"\n            "}
<EditableText data-placeholder={"想去吹晚风看日落"} className={"pp2-editable-text"} emptyClass="pp2-is-empty" value={profile.mood} onChange={profile.changeMood} />
{"\n          "}
</div>
<div className={"pp2-row"}>
{"\n            "}
<span className={"pp2-info-key"}>{"special"}</span>
{"\n            "}
<ProfileText data-placeholder={"最重要的人"} className={"pp2-editable-text"} emptyClass="pp2-is-empty" storageKey={"personal_profile_special"} fallback={""} />
{"\n          "}
</div>
</div>
</div>
</div>
<div className={"mh-win mh-love"}>
<div className={"mh-win-head"}><div className={"pp2-section-label-love"}>{"✦ things i love"}</div></div>
<div className={"mh-win-body"}>
<div className={"pp2-row"}>
<div className={"pp2-like-dot"} />
<ProfileText data-placeholder={"热美式 · 胶片相机 · 晨光"} className={"pp2-editable-text"} emptyClass="pp2-is-empty" storageKey={"personal_profile_love_1"} fallback={""} />
</div>
<div className={"pp2-row"}>
<div className={"pp2-like-dot"} />
<ProfileText data-placeholder={"路边偶遇的小猫"} className={"pp2-editable-text"} emptyClass="pp2-is-empty" storageKey={"personal_profile_love_2"} fallback={""} />
</div>
<div className={"pp2-row"}>
<div className={"pp2-like-dot"} />
<ProfileText data-placeholder={"听雨声入睡的夜晚"} className={"pp2-editable-text"} emptyClass="pp2-is-empty" storageKey={"personal_profile_love_3"} fallback={""} />
</div>
<div className={"pp2-row"}>
<div className={"pp2-like-dot"} />
<ProfileText data-placeholder={"毫无目的地的散步"} className={"pp2-editable-text"} emptyClass="pp2-is-empty" storageKey={"personal_profile_love_4"} fallback={""} />
</div>
</div>
</div>
<div className={"mh-win mh-dislike"}>
<div className={"mh-win-head"}><div className={"pp2-section-label-dislike"}>{"✦ not my thing"}</div></div>
<div className={"mh-win-body"}>
<div className={"pp2-row"}>
<div className={"pp2-like-dot pp2-dislike"} />
<ProfileText data-placeholder={"拥挤吵闹的早高峰"} className={"pp2-editable-text"} emptyClass="pp2-is-empty" storageKey={"personal_profile_dislike_1"} fallback={""} />
</div>
<div className={"pp2-row"}>
<div className={"pp2-like-dot pp2-dislike"} />
<ProfileText data-placeholder={"没有意义的社交"} className={"pp2-editable-text"} emptyClass="pp2-is-empty" storageKey={"personal_profile_dislike_2"} fallback={""} />
</div>
<div className={"pp2-row"}>
<div className={"pp2-like-dot pp2-dislike"} />
<ProfileText data-placeholder={"下雨天湿漉漉的鞋子"} className={"pp2-editable-text"} emptyClass="pp2-is-empty" storageKey={"personal_profile_dislike_3"} fallback={""} />
</div>
</div>
</div>
<div className={"pp2-footer"}>
{"\n            "}
<span className={"pp2-footer-left"}>
{"\n              "}
<svg className={"pp2-sparkle-icon"} viewBox={"0 0 24 24"} fill={"var(--theme-color)"} xmlns={"http://www.w3.org/2000/svg"}>
{"\n                "}
<path d={"M12 2L14.2 8.8L21 11L14.2 13.2L12 20L9.8 13.2L3 11L9.8 8.8L12 2Z"} />
{"\n                "}
<path d={"M19 17L19.8 19.2L22 20L19.8 20.8L19 23L18.2 20.8L16 20L18.2 19.2L19 17Z"} />
{"\n              "}
</svg>
{"\n              personal info handbook\n            "}
</span>
{"\n            "}
<span className={"pp2-footer-tag"}>{"pg. 01"}</span>
{"\n          "}
</div>
<div className={"mh-index"} aria-hidden={"true"}>
<span>{"Home"}</span>
<span className={"is-active"}>{"Profile"}</span>
<span>{"Diary"}</span>
</div>
</div>
{"\n\n        "}
<div className={"pp2-torn-note-wrap mh-notepad"}>
<div className={"mh-notepad-head"} aria-hidden={"true"}>{"留言板.txt"}</div>
{"\n          "}
<svg className={"pp2-torn-svg"} viewBox={"0 0 350 96"} xmlns={"http://www.w3.org/2000/svg"}>
{"\n            "}
<defs>
{"\n              "}
<OriginalComment text={" 纸张揉皱纹理 "} />
{"\n              "}
<filter id={"pp2-paperWrinkle"} x={"-2%"} y={"-2%"} width={"104%"} height={"104%"}>
{"\n                "}
<feTurbulence type={"fractalNoise"} baseFrequency={"0.65 0.4"} numOctaves={"4"} seed={"8"} result={"noise"} />
{"\n                "}
<feDisplacementMap in={"SourceGraphic"} in2={"noise"} scale={"2.8"} xChannelSelector={"R"} yChannelSelector={"G"} result={"warped"} />
{"\n                "}
<feComposite in={"warped"} in2={"SourceGraphic"} operator={"in"} />
{"\n              "}
</filter>
{"\n              "}
<OriginalComment text={" 撕边模糊+扭曲 "} />
{"\n              "}
<filter id={"pp2-tornEdge"} x={"-4%"} y={"-8%"} width={"108%"} height={"116%"}>
{"\n                "}
<feTurbulence type={"turbulence"} baseFrequency={"0.035 0.06"} numOctaves={"5"} seed={"14"} result={"edgeNoise"} />
{"\n                "}
<feDisplacementMap in={"SourceGraphic"} in2={"edgeNoise"} scale={"5.5"} xChannelSelector={"R"} yChannelSelector={"G"} />
{"\n              "}
</filter>
{"\n              "}
<linearGradient id={"pp2-pg"} x1={"0"} y1={"0"} x2={"0.3"} y2={"1"}>
{"\n                "}
<stop offset={"0%"} stopColor={"#F4F5F7"} />
{"\n                "}
<stop offset={"40%"} stopColor={"#F4F5F7"} />
{"\n                "}
<stop offset={"100%"} stopColor={"#F4F5F7"} />
{"\n              "}
</linearGradient>
{"\n\n              "}
<OriginalComment text={" 多角度浅淡折痕光影：参考折痕代码，仅替换折痕效果 "} />
{"\n              "}
<linearGradient id={"pp2-diagShadow1"} x1={"0%"} y1={"0%"} x2={"100%"} y2={"80%"}>
{"\n                "}
<stop offset={"0%"} stopColor={"rgba(118,126,135,0.08)"} />
{"\n                "}
<stop offset={"60%"} stopColor={"rgba(132,140,148,0.03)"} />
{"\n                "}
<stop offset={"100%"} stopColor={"rgba(146,154,162,0)"} />
{"\n              "}
</linearGradient>
{"\n              "}
<linearGradient id={"pp2-diagShadow2"} x1={"100%"} y1={"0%"} x2={"0%"} y2={"100%"}>
{"\n                "}
<stop offset={"0%"} stopColor={"rgba(114,122,130,0.07)"} />
{"\n                "}
<stop offset={"50%"} stopColor={"rgba(128,136,144,0.02)"} />
{"\n                "}
<stop offset={"100%"} stopColor={"rgba(142,150,158,0)"} />
{"\n              "}
</linearGradient>
{"\n              "}
<linearGradient id={"pp2-horizShadow"} x1={"50%"} y1={"0%"} x2={"50%"} y2={"100%"}>
{"\n                "}
<stop offset={"0%"} stopColor={"rgba(114,122,130,0.06)"} />
{"\n                "}
<stop offset={"100%"} stopColor={"rgba(142,150,158,0)"} />
{"\n              "}
</linearGradient>
{"\n              "}
<radialGradient id={"pp2-pocketShadow1"} cx={"45%"} cy={"50%"} r={"55%"}>
{"\n                "}
<stop offset={"0%"} stopColor={"rgba(112,120,128,0.09)"} />
{"\n                "}
<stop offset={"65%"} stopColor={"rgba(124,132,140,0.02)"} />
{"\n                "}
<stop offset={"100%"} stopColor={"rgba(136,144,152,0)"} />
{"\n              "}
</radialGradient>
{"\n              "}
<radialGradient id={"pp2-pocketShadow2"} cx={"50%"} cy={"40%"} r={"60%"}>
{"\n                "}
<stop offset={"0%"} stopColor={"rgba(112,120,128,0.08)"} />
{"\n                "}
<stop offset={"70%"} stopColor={"rgba(124,132,140,0.02)"} />
{"\n                "}
<stop offset={"100%"} stopColor={"rgba(136,144,152,0)"} />
{"\n              "}
</radialGradient>
{"\n              "}
<linearGradient id={"pp2-diagLight1"} x1={"100%"} y1={"100%"} x2={"0%"} y2={"0%"}>
{"\n                "}
<stop offset={"0%"} stopColor={"rgba(255,255,255,0.24)"} />
{"\n                "}
<stop offset={"70%"} stopColor={"rgba(255,255,255,0.06)"} />
{"\n                "}
<stop offset={"100%"} stopColor={"rgba(255,255,255,0)"} />
{"\n              "}
</linearGradient>
{"\n              "}
<linearGradient id={"pp2-diagLight2"} x1={"0%"} y1={"100%"} x2={"100%"} y2={"0%"}>
{"\n                "}
<stop offset={"0%"} stopColor={"rgba(255,255,255,0.20)"} />
{"\n                "}
<stop offset={"65%"} stopColor={"rgba(255,255,255,0.05)"} />
{"\n                "}
<stop offset={"100%"} stopColor={"rgba(255,255,255,0)"} />
{"\n              "}
</linearGradient>
{"\n              "}
<linearGradient id={"pp2-topLight"} x1={"50%"} y1={"0%"} x2={"50%"} y2={"100%"}>
{"\n                "}
<stop offset={"0%"} stopColor={"rgba(255,255,255,0.18)"} />
{"\n                "}
<stop offset={"100%"} stopColor={"rgba(255,255,255,0)"} />
{"\n              "}
</linearGradient>
{"\n            "}
</defs>
{"\n\n            "}
<OriginalComment text={" 主纸张：边缘用不规则路径模拟撕纸，加 pp2-tornEdge filter 让边缘更乱 "} />
{"\n            "}
<g filter={"url(#pp2-tornEdge)"}>
{"\n              "}
<path d={"\n                M 8,14\n                C 15,8  22,16  31,10\n                C 40,4  47,13  57,7\n                C 67,1  74,11  84,6\n                C 94,1  101,12 111,7\n                C 119,3 126,9  135,5\n                C 144,1 151,10 161,5\n                C 171,0 178,11 188,6\n                C 198,2 205,10 215,5\n                C 225,0 232,9  242,5\n                C 252,1 258,10 268,5\n                C 278,0 285,9  295,5\n                C 305,1 312,10 322,6\n                C 332,2 338,9  343,7\n                L 344,14\n                C 347,22 343,30 346,40\n                C 349,50 344,58 347,68\n                C 350,78 345,84 343,90\n                C 335,94 327,87 318,91\n                C 309,95 301,88 292,92\n                C 283,96 275,89 266,93\n                C 257,97 249,90 240,94\n                C 231,98 223,91 214,95\n                C 205,99 197,92 188,96\n                C 179,100 171,93 162,96\n                C 153,99 145,92 136,95\n                C 127,98 119,91 110,94\n                C 101,97 93,90  84,93\n                C 75,96  67,89  58,92\n                C 49,95  41,88  32,91\n                C 23,94  15,88  7,90\n                C 5,82  8,74  5,65\n                C 2,56  6,47  3,38\n                C 0,29  4,21  8,14 Z\n              "} fill={"url(#pp2-pg)"} filter={"url(#pp2-paperWrinkle)"} />
{"\n            "}
</g>
{"\n\n            "}
<OriginalComment text={" 多方向浅淡折痕：细碎、交错，不改变原纸张和撕边 "} />
{"\n            "}
<g>
{"\n              "}
<OriginalComment text={" 面状明暗分面：保留折痕光影，只把阴影整体压淡 "} />
{"\n              "}
<polygon points={"14,18 76,13 58,36 12,38"} fill={"url(#pp2-diagLight1)"} opacity={"0.48"} />
{"\n              "}
<polygon points={"58,36 76,13 118,47"} fill={"url(#pp2-diagShadow1)"} opacity={"0.26"} />
{"\n              "}
<polygon points={"12,38 58,36 118,47 82,65 9,62"} fill={"url(#pp2-horizShadow)"} opacity={"0.22"} />
{"\n              "}
<polygon points={"9,62 82,65 94,88 9,85"} fill={"url(#pp2-diagLight2)"} opacity={"0.55"} />
{"\n              "}
<polygon points={"82,65 118,47 138,68 94,88"} fill={"url(#pp2-diagShadow2)"} opacity={"0.28"} />
{"\n\n              "}
<polygon points={"76,13 175,13 142,32 118,47"} fill={"url(#pp2-topLight)"} opacity={"0.55"} />
{"\n              "}
<polygon points={"175,13 248,11 212,38 142,32"} fill={"url(#pp2-diagShadow1)"} opacity={"0.32"} />
{"\n              "}
<polygon points={"118,47 142,32 212,38 178,58 138,68"} fill={"url(#pp2-pocketShadow1)"} opacity={"0.34"} />
{"\n              "}
<polygon points={"212,38 274,34 246,62 178,58"} fill={"url(#pp2-diagLight1)"} opacity={"0.65"} />
{"\n              "}
<polygon points={"138,68 178,58 246,62 218,88 148,88"} fill={"url(#pp2-diagShadow2)"} opacity={"0.30"} />
{"\n              "}
<polygon points={"94,88 138,68 148,88"} fill={"url(#pp2-diagLight2)"} opacity={"0.50"} />
{"\n\n              "}
<polygon points={"248,11 344,16 336,44 274,34 212,38"} fill={"url(#pp2-diagLight2)"} opacity={"0.60"} />
{"\n              "}
<polygon points={"274,34 336,44 343,61 286,66 246,62"} fill={"url(#pp2-horizShadow)"} opacity={"0.27"} />
{"\n              "}
<polygon points={"246,62 286,66 270,88 218,88"} fill={"url(#pp2-pocketShadow2)"} opacity={"0.30"} />
{"\n              "}
<polygon points={"286,66 343,61 344,83 312,88 270,88"} fill={"url(#pp2-diagLight1)"} opacity={"0.55"} />
{"\n              "}
<polygon points={"312,88 344,83 331,88"} fill={"url(#pp2-diagShadow1)"} opacity={"0.24"} />
{"\n            "}
</g>
{"\n\n            "}
<OriginalComment text={" 纤细折脊：仅将深色折线再压淡，避免折痕太突兀 "} />
{"\n            "}
<g>
{"\n              "}
<path d={"M 46,18 L 58,36 L 118,47 L 178,58 L 246,62 L 312,88"} fill={"none"} stroke={"rgba(112,120,128,0.050)"} strokeWidth={"0.52"} strokeLinecap={"round"} strokeLinejoin={"round"} />
{"\n              "}
<path d={"M 265,12 L 212,38 L 178,58 L 138,68 L 94,88"} fill={"none"} stroke={"rgba(112,120,128,0.046)"} strokeWidth={"0.52"} strokeLinecap={"round"} strokeLinejoin={"round"} />
{"\n              "}
<path d={"M 10,38 L 54,38 L 118,47 L 142,32 L 212,38 L 274,34 L 336,44"} fill={"none"} stroke={"rgba(116,124,132,0.044)"} strokeWidth={"0.48"} strokeLinecap={"round"} strokeLinejoin={"round"} />
{"\n              "}
<path d={"M 12,63 L 82,65 L 138,68 L 178,58 L 246,62 L 286,66 L 342,61"} fill={"none"} stroke={"rgba(116,124,132,0.040)"} strokeWidth={"0.46"} strokeLinecap={"round"} strokeLinejoin={"round"} />
{"\n              "}
<path d={"M 76,13 L 54,38 L 82,65 L 94,88"} fill={"none"} stroke={"rgba(112,120,128,0.040)"} strokeWidth={"0.46"} strokeLinecap={"round"} strokeLinejoin={"round"} />
{"\n              "}
<path d={"M 248,11 L 212,38 L 246,62 L 218,88"} fill={"none"} stroke={"rgba(112,120,128,0.040)"} strokeWidth={"0.46"} strokeLinecap={"round"} strokeLinejoin={"round"} />
{"\n              "}
<path d={"M 142,32 L 175,13 M 118,47 L 138,68 M 274,34 L 286,66 M 246,62 L 270,88"} fill={"none"} stroke={"rgba(116,124,132,0.034)"} strokeWidth={"0.42"} strokeLinecap={"round"} />
{"\n\n              "}
<path d={"M 47,17 L 59,35 L 119,46 L 179,57 L 247,61 L 313,87"} fill={"none"} stroke={"rgba(255,255,255,0.34)"} strokeWidth={"0.60"} strokeLinecap={"round"} strokeLinejoin={"round"} />
{"\n              "}
<path d={"M 264,11 L 211,37 L 177,57 L 137,67 L 93,87"} fill={"none"} stroke={"rgba(255,255,255,0.31)"} strokeWidth={"0.60"} strokeLinecap={"round"} strokeLinejoin={"round"} />
{"\n              "}
<path d={"M 10,37 L 54,37 L 118,46 L 142,31 L 212,37 L 274,33 L 336,43"} fill={"none"} stroke={"rgba(255,255,255,0.29)"} strokeWidth={"0.55"} strokeLinecap={"round"} strokeLinejoin={"round"} />
{"\n              "}
<path d={"M 77,12 L 55,37 L 83,64 L 95,87"} fill={"none"} stroke={"rgba(255,255,255,0.27)"} strokeWidth={"0.55"} strokeLinecap={"round"} strokeLinejoin={"round"} />
{"\n              "}
<path d={"M 249,10 L 213,37 L 247,61 L 219,87"} fill={"none"} stroke={"rgba(255,255,255,0.27)"} strokeWidth={"0.55"} strokeLinecap={"round"} strokeLinejoin={"round"} />
{"\n            "}
</g>
{"\n\n            "}
<OriginalComment text={" 去除横向底纹线，保留普通纸张的折痕光影 "} />
{"\n          "}
</svg>
{"\n\n          "}
<div className={"pp2-paper-tape pp2-top-right"} />
{"\n          "}
<div className={"pp2-paper-tape pp2-bottom-left"} />
{"\n          "}
<input className={"pp2-torn-note-text"} type={"text"} aria-label={"编辑纸条文字"} placeholder={"点击这里写点什么……"} spellCheck={"false"} defaultValue={readProfileText("personal_profile_torn_note", "")} onChange={event => {
          try {
            localStorage.setItem("personal_profile_torn_note", event.currentTarget.value);
          } catch {}
        }} onKeyDown={event => {
          if (event.key === "Enter") {
            event.preventDefault();
            event.currentTarget.blur();
            profile.nextLine(0);
          }
        }} ref={node => {
          profile.lines.current[0] = node;
        }} />
{"\n          "}
<input className={"pp2-torn-note-text mh-note-extra"} type={"text"} aria-label={"编辑留言板第二行"} spellCheck={"false"} defaultValue={readProfileText("personal_profile_torn_note_2", "")} onChange={event => {
          try {
            localStorage.setItem("personal_profile_torn_note_2", event.currentTarget.value);
          } catch {}
        }} onKeyDown={event => {
          if (event.key === "Enter") {
            event.preventDefault();
            event.currentTarget.blur();
            profile.nextLine(1);
          }
        }} ref={node => {
          profile.lines.current[1] = node;
        }} />
{"\n          "}
<input className={"pp2-torn-note-text mh-note-extra"} type={"text"} aria-label={"编辑留言板第三行"} spellCheck={"false"} defaultValue={readProfileText("personal_profile_torn_note_3", "")} onChange={event => {
          try {
            localStorage.setItem("personal_profile_torn_note_3", event.currentTarget.value);
          } catch {}
        }} onKeyDown={event => {
          if (event.key === "Enter") {
            event.preventDefault();
            event.currentTarget.blur();
            profile.nextLine(2);
          }
        }} ref={node => {
          profile.lines.current[2] = node;
        }} />
{"\n        "}
</div>
{"\n        "}
</div>
{"\n    "}
</div>;
}
