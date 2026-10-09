/** 已确认的聊天像素图标；在 24 × 24 网格内按轮廓范围居中。 */
const icons = {
  "people": {
    "path": "M5 3h6v2H5z M3 5h2v6H3z M11 5h2v6h-2z M5 11h6v2H5z M3 13h2v2H3z M1 15h2v6H1z M11 13h2v2h-2z M13 15h2v6h-2z M15 3h4v2h-4z M19 5h2v6h-2z M15 11h4v2h-4z M19 13h2v2h-2z M21 15h2v6h-2z",
    "offset": "translate(0 0)"
  },
  "message": {
    "path": "M2 3h18v2h2v12h-2v2H10v2H8v2H4v-4H2v-2H0V5h2z M2 5v12h4v4h2v-4h12V5z",
    "offset": "translate(1 -1)"
  },
  "document": {
    "path": "M6 2h10v2h2v2h2v14h-2v2H6v-2H4V4h2z M6 4v16h12V10h-4V4z M16 4v4h2V6h-2z M8 12h8v2H8z M8 16h6v2H8z",
    "offset": "translate(0 0)"
  },
  "image": {
    "path": "M4 3h16v2h2v14h-2v2H4v-2H2V5h2z M4 5v14h16V5z M6 7h4v4H6z M4 17h2v-2h2v-2h2v-2h2v2h2v2h2v-2h2v2h2v2h-2v-2h-2v2h-2v-2h-2v-2h-2v2H8v2H6v2H4z",
    "offset": "translate(0 0)"
  },
  "sound": {
    "path": "M8 2h4v20H8v-2H6v-2H4v-2H0V8h4V6h2V4h2z M8 4v2H6v2H4v2H2v4h2v2h2v2h2v2h2V4z M16 4h2v2h-2z M18 6h2v2h-2z M20 8h2v8h-2z M18 16h2v2h-2z M16 18h2v2h-2z M14 8h2v2h-2z M16 10h2v4h-2z M14 14h2v2h-2z",
    "offset": "translate(1 0)"
  },
  "eye": {
    "path": "M8 4h8v2h2v2h2v2h2v4h-2v2h-2v2h-2v2H8v-2H6v-2H4v-2H2v-4h2V8h2V6h2z M8 6v2H6v2H4v4h2v2h2v2h8v-2h2v-2h2v-4h-2V8h-2V6z M10 8h4v2h2v4h-2v2h-4v-2H8v-4h2z M10 10v4h4v-4z",
    "offset": "translate(0 0)"
  },
  "trash": {
    "path": "M9 2h6v2H9z M5 4h14v2H5z M5 8h14v12h-2v2H7v-2H5z M7 10v10h10V10z M9 12h2v6H9z M13 12h2v6h-2z",
    "offset": "translate(0 0)"
  },
  "sparkle": {
    "path": "M8 2h2v4h2v2h2v2h4v2h-4v2h-2v2h-2v4H8v-4H6v-2H4v-2H0v-2h4V8h2V6h2z M8 8v2H6v2h2v2h2v-2h2v-2h-2V8z M19 14h2v3h3v2h-3v3h-2v-3h-3v-2h3z",
    "offset": "translate(0 0)"
  },
  "location": {
    "path": "M8 2h8v2h4v2h2v10h-2v4h-2v2h-4v2h-4v-2H6v-2H4v-4H2V6h2V4h4z M8 4v2H4v10h2v4h4v2h4v-2h4v-4h2V6h-4V4z M10 7h4v2h2v4h-2v2h-4v-2H8V9h2z M10 9v4h4V9z",
    "offset": "translate(0 -1)"
  },
  "book": {
    "path": "M2 3h8v2h4V3h8v18h-8v2h-4v-2H2z M4 5v14h6v2h1V7h-1V5z M14 5v2h-1v14h1v-2h6V5z",
    "offset": "translate(0 -1)"
  },
  "mic": {
    "path": "M10 2h4v2h2v10h-2v2h-4v-2H8V4h2z M10 4v10h4V4z M4 10h2v6h2v2h8v-2h2v-6h2v6h-2v2h-2v2h-3v2h4v2H7v-2h4v-2H8v-2H6v-2H4z",
    "offset": "translate(0 -1)"
  },
  "camera": {
    "path": "M8 3h8v2h4v2h2v14H2V7h2V5h4z M8 5v2H4v12h16V7h-4V5z M10 9h4v2h2v4h-2v2h-4v-2H8v-4h2z M10 11v4h4v-4z M17 8h2v2h-2z",
    "offset": "translate(0 0)"
  }
} as const;
// 按轮廓宽高及视觉重量调整留白，避免窄长图标显得过小。
const iconCanvas = {people:26, message:26, document:22, image:24, sound:26, eye:22, trash:22, sparkle:28, location:26, book:24, mic:26, camera:24} as const;
export type ChatPixelIconName = keyof typeof icons;
export function ChatPixelIcon({name}:{name:ChatPixelIconName}) {
  const icon = icons[name];
  const canvas = iconCanvas[name];
  const edge = (24 - canvas) / 2;
  return <svg className="chat-pixel-icon" viewBox={`${edge} ${edge} ${canvas} ${canvas}`} aria-hidden="true" focusable="false" shapeRendering="crispEdges" style={{display:'block',flexShrink:0}}>
    <path d={icon.path} transform={icon.offset} fill="currentColor" fillRule="evenodd" stroke="none" />
  </svg>;
}
