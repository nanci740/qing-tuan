import { deflateSync } from 'node:zlib';
/** 2:1 等距投影：x 往右下、y 往左下，每格 16×8 像素，z 直接是像素高度。 */
export const UNIT={x:16,y:8};
const ORIGIN={x:560,y:330};
export const C = {
 ink:'#584b43', deep:'#726356', wood:'#b98c65', woodLight:'#dab28a', woodHi:'#efd0a8', woodShade:'#967252',
 cream:'#ece0c7', white:'#fff5dc', creamShade:'#cabcaa', wall:'#e6d7bf', wallShade:'#d0c0aa',
 teal:'#7eada2', tealLight:'#a8c8b7', tealHi:'#c7dcd0', tealDark:'#587f77', tealShade:'#67948a',
 green:'#77985d', greenHi:'#a6bb78', greenDark:'#506c49', blue:'#7baec4', blueLight:'#abd2d7',
 sky:'#cce5de', sun:'#f4d48e', yellow:'#e4b973', gray:'#a1aaa0', grayDark:'#697871',
 screen:'#527e83', pink:'#cfaaa0', paper:'#eadcc0', black:'#3f4e4a', shadow:'#65736a50',
 floorA:'#d39c63', floorB:'#c98f58', floorC:'#dcaa71', floorSeam:'#a8744a', floorHi:'#e8bd86', slab:'#9a6b45', slabDark:'#7d5538', floorShade:'#b07d4f',
 wallL:'#e9dcc4', wallLStripe:'#dfd0b6', wallLShade:'#d8c8ad', wallR:'#f2e8d4', wallRStripe:'#e8dcc4', wallRShade:'#e0d2b9', trim:'#a9794f', trimHi:'#c99a6c', wallEdge:'#8d6544',
 skyTop:'#7fc0e6', skyHi:'#b9def2', cloud:'#ffffff', city:'#9fb9c9', cityHi:'#c3d6e0', tree:'#78a85c', treeDark:'#557f48', treeHi:'#9cc472',
 sunlight:'#fff0c27a', sunlightHi:'#fff8e04a', glow:'#ffe7a855', lampLight:'#fff3cf', fabric:'#f6efe2', fabricShade:'#e3d8c6', plaidMid:'#bcd8cc', plaidDark:'#8fbcae', plaidLine:'#6f9e94',
 leaf:'#6f9a54', leafHi:'#98bd6c', leafDark:'#4c7140', pot:'#f0e6d6', potShade:'#d4c6b2', brownDark:'#6b4a33', door:'#a87652', doorHi:'#c08c63', doorShade:'#8a5f41'
};
const rgba = value => { const hex=(C[value]||value).slice(1);return [0,2,4,6].map((i)=>i===6&&hex.length===6?255:parseInt(hex.slice(i,i+2),16)); };
export class Pixels {
 constructor(w=1200,h=820){this.w=w;this.h=h;this.data=new Uint8Array(w*h*4);this.mask=null;}
 /** 之后画的点只落在这个多边形里（画窗外风景、屏幕画面用）；传 null 取消。 */
 clip(points){this.mask=points?points.map(p=>p.map(Math.round)):null;}
 inside(x,y){const m=this.mask;let hit=false;for(let i=0,j=m.length-1;i<m.length;j=i++){const [xi,yi]=m[i],[xj,yj]=m[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)hit=!hit;}return hit;}
 dot(x,y,c){x=Math.round(x);y=Math.round(y);if(x<0||y<0||x>=this.w||y>=this.h)return;if(this.mask&&!this.inside(x+.5,y+.5))return;this.data.set(rgba(c),(y*this.w+x)*4);}
 rect(x,y,w,h,c){for(let j=Math.round(y);j<Math.round(y+h);j++)for(let i=Math.round(x);i<Math.round(x+w);i++)this.dot(i,j,c);}
 line(a,b,c){let [x,y]=a.map(Math.round),[tx,ty]=b.map(Math.round);const dx=Math.abs(tx-x),dy=-Math.abs(ty-y),sx=x<tx?1:-1,sy=y<ty?1:-1;let err=dx+dy;for(;;){this.dot(x,y,c);if(x===tx&&y===ty)break;const e=2*err;if(e>=dy){err+=dy;x+=sx;}if(e<=dx){err+=dx;y+=sy;}}}
 poly(points,c,edge){const pts=points.map(p=>p.map(Math.round));const min=Math.min(...pts.map(p=>p[1])),max=Math.max(...pts.map(p=>p[1]));for(let y=min;y<=max;y++){const xs=[];for(let i=0;i<pts.length;i++){const [x1,y1]=pts[i],[x2,y2]=pts[(i+1)%pts.length];if((y1<=y&&y2>y)||(y2<=y&&y1>y))xs.push(x1+(y-y1)*(x2-x1)/(y2-y1));}xs.sort((a,b)=>a-b);if(c)for(let i=0;i+1<xs.length;i+=2)for(let x=Math.ceil(xs[i]);x<=Math.floor(xs[i+1]);x++)this.dot(x,y,c);}if(edge)for(let i=0;i<pts.length;i++)this.line(pts[i],pts[(i+1)%pts.length],edge);}
 ellipse(cx,cy,rx,ry,c,edge){for(let y=-ry;y<=ry;y++)for(let x=-rx;x<=rx;x++){const r=x*x/(rx*rx)+y*y/(ry*ry);if(r<=1)this.dot(cx+x,cy+y,edge&&((x+Math.sign(x||1))**2/(rx*rx)+y*y/(ry*ry)>1||x*x/(rx*rx)+(y+Math.sign(y||1))**2/(ry*ry)>1)?edge:c);}}
 crop(anchor=[ORIGIN.x,ORIGIN.y]){let x1=this.w,y1=this.h,x2=0,y2=0;for(let y=0;y<this.h;y++)for(let x=0;x<this.w;x++)if(this.data[(y*this.w+x)*4+3]){x1=Math.min(x1,x);y1=Math.min(y1,y);x2=Math.max(x2,x);y2=Math.max(y2,y);}const result=new Pixels(x2-x1+1,y2-y1+1);for(let y=y1;y<=y2;y++)for(let x=x1;x<=x2;x++)result.data.set(this.data.slice((y*this.w+x)*4,(y*this.w+x)*4+4),((y-y1)*result.w+x-x1)*4);return {pixels:result,anchor:{x:anchor[0]-x1,y:anchor[1]-y1}};}
 png(){return png(this.w,this.h,this.data);}
}
function crc(bytes){let c=0xffffffff;for(const byte of bytes){c^=byte;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;}
function chunk(name,data){const tag=Buffer.from(name),len=Buffer.alloc(4),sum=Buffer.alloc(4);len.writeUInt32BE(data.length);sum.writeUInt32BE(crc(Buffer.concat([tag,data])));return Buffer.concat([len,tag,data,sum]);}
function png(w,h,data){const header=Buffer.alloc(13);header.writeUInt32BE(w);header.writeUInt32BE(h,4);header[8]=8;header[9]=6;const rows=Buffer.alloc((w*4+1)*h);for(let y=0;y<h;y++)Buffer.from(data.slice(y*w*4,(y+1)*w*4)).copy(rows,y*(w*4+1)+1);return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(rows)),chunk('IEND',Buffer.alloc(0))]);}
export function studio(){const p=new Pixels();const P=(x,y,z=0)=>[ORIGIN.x+UNIT.x*(x-y),ORIGIN.y+UNIT.y*(x+y)-z];
 const top=(x,y,w,d,z,c,edge='ink')=>p.poly([P(x,y,z),P(x+w,y,z),P(x+w,y+d,z),P(x,y+d,z)],c,edge);
 const faceX=(x,y,d,z,h,c,edge='ink')=>p.poly([P(x,y,z),P(x,y+d,z),P(x,y+d,z+h),P(x,y,z+h)],c,edge);
 const faceY=(x,y,w,z,h,c,edge='ink')=>p.poly([P(x,y,z),P(x+w,y,z),P(x+w,y,z+h),P(x,y,z+h)],c,edge);
 const box=(x,y,w,d,z,h,colors=['woodLight','wood','woodShade'])=>{faceX(x+w,y,d,z,h,colors[2]);faceY(x,y+d,w,z,h,colors[1]);top(x,y,w,d,z+h,colors[0]);};
 const line=(a,b,c='ink')=>p.line(P(...a),P(...b),c);
 const shadow=(w,d,x=0,y=0)=>top(x+.1,y+.15,w+.2,d+.2,0,'shadow',null);
 const leg=(x,y,z=0,h=20,s=.22,colors=['woodLight','wood','woodShade'])=>box(x,y,s,s,z,h,colors);
 const quad=(points,c,edge='ink')=>p.poly(points.map(q=>P(...q)),c,edge);
 // 圆柱：r 是格数，2:1 投影下横半径约 22.6r，竖半径约 11.3r。
 const cyl=(x,y,r,z,h,topC,sideC,edge='ink')=>{const [cx,cy]=P(x,y,z),rx=Math.round(22.6*r),ry=Math.round(11.3*r);p.ellipse(cx,cy,rx,ry,sideC,edge);p.rect(cx-rx,cy-h,rx*2+1,h,sideC);p.line([cx-rx,cy-h],[cx-rx,cy],edge);p.line([cx+rx,cy-h],[cx+rx,cy],edge);p.ellipse(cx,cy-h,rx,ry,topC,edge);};
 // 格纹：两个方向的色带交叠，交叉处更深。
 const plaid=(x,y,w,d,z,cell=.5,colors=['fabric','plaidMid','plaidDark'],lineC='plaidLine')=>{top(x,y,w,d,z,colors[0]);for(let i=0;i*cell<w-.01;i++)for(let j=0;j*cell<d-.01;j++){const k=(i%2)+(j%2);if(k)top(x+i*cell,y+j*cell,Math.min(cell,w-i*cell),Math.min(cell,d-j*cell),z,colors[k],null);}for(let i=1;i*cell<w;i+=2)line([x+i*cell+cell/2,y,z],[x+i*cell+cell/2,y+d,z],lineC);for(let j=1;j*cell<d;j+=2)line([x,y+j*cell+cell/2,z],[x+w,y+j*cell+cell/2,z],lineC);top(x,y,w,d,z,null,'ink');};
 const plaidY=(x,y,w,z,h,cell=.5,band=8,colors=['fabric','plaidMid','plaidDark'])=>{faceY(x,y,w,z,h,colors[0]);for(let i=0;i*cell<w-.01;i++)for(let k=0;k*band<h;k++){const v=(i%2)+(k%2);if(v)faceY(x+i*cell,y,Math.min(cell,w-i*cell),z+k*band,Math.min(band,h-k*band),colors[v],null);}faceY(x,y,w,z,h,null,'ink');};
 const plaidX=(x,y,d,z,h,cell=.5,band=8,colors=['fabric','plaidMid','plaidDark'])=>{faceX(x,y,d,z,h,colors[0]);for(let i=0;i*cell<d-.01;i++)for(let k=0;k*band<h;k++){const v=(i%2)+(k%2);if(v)faceX(x,y+i*cell,Math.min(cell,d-i*cell),z+k*band,Math.min(band,h-k*band),colors[v],null);}faceX(x,y,d,z,h,null,'ink');};
 // 叶子：从 (x,y) 朝 angle 方向长出去的尖叶，屏幕坐标。
 const leaf=(x,y,angle,len,width,c='leaf',edge='leafDark',vein='leafHi')=>{const ux=Math.cos(angle),uy=Math.sin(angle),vx=-uy,vy=ux;const pt=(t,s)=>[x+ux*len*t+vx*width*s,y+uy*len*t+vy*width*s];p.poly([pt(0,0),pt(.3,.9),pt(.65,.75),pt(1,0),pt(.65,-.75),pt(.3,-.9)],c,edge);if(vein)p.line(pt(.15,0),pt(.8,0),vein);};
 // 垂下来的藤蔓，屏幕坐标，length 是像素。
 const vine=(x,y,length,sway=3,seed=0)=>{let px=x;for(let i=0;i<length;i+=2){px=x+Math.round(Math.sin((i+seed*7)/9)*sway);p.dot(px,y+i,'leafDark');if(i%6===0){const side=((i/6+seed)%2)?1:-1;p.ellipse(px+side*3,y+i+1,2,2,(i/6+seed)%3?'leaf':'leafHi','leafDark');}}p.ellipse(px,y+length+1,2,2,'leaf','leafDark');};
 return {p,P,top,faceX,faceY,box,line,shadow,leg,quad,cyl,plaid,plaidX,plaidY,leaf,vine};}
