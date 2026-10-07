interface PixelArtProps {
  rows: readonly string[];
  classes: Readonly<Record<string, string>>;
  className: string;
}
/** 同一行的连续同色像素仍合为一条，保持原 SVG 图案与节点顺序。 */
export function PixelArt({ rows, classes, className }: PixelArtProps) {
  const pixels = rows.flatMap((row, y) => {
    const result = [];
    let x = 0;
    while (x < row.length) {
      const name = classes[row[x]];
      if (!name) { x++; continue; }
      let end = x;
      while (end < row.length && classes[row[end]] === name) end++;
      result.push(<rect key={`${y}:${x}`} x={x} y={y} width={end - x} height={1} className={name} />);
      x = end;
    }
    return result;
  });
  return <svg viewBox={`0 0 ${rows[0].length} ${rows.length}`} className={className} aria-hidden="true">{pixels}</svg>;
}
