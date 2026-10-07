export function roundedBubblePath(width: number, height: number, radius: number) {
    return `M${radius} .5H${width - radius}Q${width - .5} .5 ${width - .5} ${radius}`
        + `V${height - radius}Q${width - .5} ${height - .5} ${width - radius} ${height - .5}`
        + `H${radius}Q.5 ${height - .5} .5 ${height - radius}V${radius}Q.5 .5 ${radius} .5Z`;
}
export function tailedBubblePath(width: number, height: number, radius: number, tailWidth: number) {
    const bodyLeft = tailWidth;
    const totalWidth = width + tailWidth;
    const shoulder = Math.min(bodyLeft + radius, totalWidth - radius);
    const curveTop = Math.max(radius + 1, height - 14);
    return `M${shoulder} .5H${totalWidth - radius}Q${totalWidth - .5} .5 ${totalWidth - .5} ${radius}`
        + `V${height - radius}Q${totalWidth - .5} ${height - .5} ${totalWidth - radius} ${height - .5}`
        + `H${bodyLeft + 9}C${bodyLeft + 5.5} ${height - .5} ${bodyLeft + 3.2} ${height - 1.5} ${bodyLeft + 2} ${height - 3.6}`
        + `C${bodyLeft - .3} ${height - 1.3} ${bodyLeft - 3.5} ${height - .1} .5 ${height - .5}`
        + `C4.5 ${height - 3.2} 6.8 ${height - 7.2} ${bodyLeft - .5} ${curveTop}`
        + `V${radius}Q${bodyLeft - .5} .5 ${shoulder} .5Z`;
}

export function measureChatBubbleShape(row: HTMLElement, bubble: HTMLElement) {
  const width = Math.max(1, bubble.offsetWidth);
  const height = Math.max(1, bubble.offsetHeight);
  const tailWidth = row.classList.contains('is-tail') ? 8 : 0;
  const totalWidth = width + tailWidth;
  const radius = Math.min(12, Math.max(5, height / 2));
  return {
    viewBox: `0 0 ${totalWidth} ${height}`,
    width: `${totalWidth}px`, height: `${height}px`,
    left: row.classList.contains('is-user') ? 'auto' : `${-tailWidth}px`,
    right: row.classList.contains('is-user') ? `${-tailWidth}px` : 'auto',
    path: tailWidth ? tailedBubblePath(width, height, radius, tailWidth) : roundedBubblePath(width, height, radius)
  };
}
