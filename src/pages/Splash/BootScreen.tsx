import { QingtuanLogo } from '../../components/shared/QingtuanLogo';
const rows = ['.p.p.','ppcpp','.p.p.','..s..','.ss..','..s..'];
const classes: Record<string,string> = {p:'c-base',c:'c-hi',s:'c-edge'};
function Flower() {
  return <svg viewBox="0 0 5 6" className="qt-pixel-logo">{rows.flatMap((row,y)=>[...row].map((ch,x)=>classes[ch]?<rect key={`${y}:${x}`} x={x} y={y} width={1} height={1} className={classes[ch]} />:null))}</svg>;
}
export function BootScreen() {
  return <div className="boot-screen" aria-hidden="true">{'\n                '}<i className="boot-cloud boot-cloud-1" />{'\n                '}<i className="boot-cloud boot-cloud-2" />{'\n                '}<i className="boot-spark boot-spark-1" />{'\n                '}<i className="boot-spark boot-spark-2" />{'\n                '}<i className="boot-spark boot-spark-3" />{'\n                '}<div className="boot-logo"><QingtuanLogo extraClass="" /></div>{'\n                '}<div className="boot-word">青团机</div>{'\n                '}<div className="boot-sub">Amor fati</div>{'\n                '}<div className="boot-bar"><i /></div>{'\n                '}<div className="boot-status"><span className="boot-loading">正在启动青团机…</span><span className="boot-tip">▶ 点击任意处开始</span></div>{'\n                '}<i className="boot-hill boot-hill-back" /><i className="boot-hill boot-hill-mid" /><div className="boot-ground">{[1,2,3].map(i=><span key={i} className={`boot-flower boot-flower-${i}`}><Flower /></span>)}</div></div>;
}
