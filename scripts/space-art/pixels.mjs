import { deflateSync } from 'node:zlib';
export const C = {
 ink:'#584b43', deep:'#726356', wood:'#b98c65', woodLight:'#dab28a', woodHi:'#efd0a8', woodShade:'#967252',
 cream:'#ece0c7', white:'#fff5dc', creamShade:'#cabcaa', wall:'#e6d7bf', wallShade:'#d0c0aa',
 teal:'#7eada2', tealLight:'#a8c8b7', tealHi:'#c7dcd0', tealDark:'#587f77', tealShade:'#67948a',
 green:'#77985d', greenHi:'#a6bb78', greenDark:'#506c49', blue:'#7baec4', blueLight:'#abd2d7',
 sky:'#cce5de', sun:'#f4d48e', yellow:'#e4b973', gray:'#a1aaa0', grayDark:'#697871',
 screen:'#527e83', pink:'#cfaaa0', paper:'#eadcc0', black:'#3f4e4a', shadow:'#65736a50'
};
const rgba = value => { const hex=(C[value]||value).slice(1);return [0,2,4,6].map((i)=>i===6&&hex.length===6?255:parseInt(hex.slice(i,i+2),16)); };
export class Pixels {
 constructor(w=640,h=512){this.w=w;this.h=h;this.data=new Uint8Array(w*h*4);}
 dot(x,y,c){x=Math.round(x);y=Math.round(y);if(x<0||y<0||x>=this.w||y>=this.h)return;this.data.set(rgba(c),(y*this.w+x)*4);}
 rect(x,y,w,h,c){for(let j=Math.round(y);j<Math.round(y+h);j++)for(let i=Math.round(x);i<Math.round(x+w);i++)this.dot(i,j,c);}
 line(a,b,c){let [x,y]=a.map(Math.round),[tx,ty]=b.map(Math.round);const dx=Math.abs(tx-x),dy=-Math.abs(ty-y),sx=x<tx?1:-1,sy=y<ty?1:-1;let err=dx+dy;for(;;){this.dot(x,y,c);if(x===tx&&y===ty)break;const e=2*err;if(e>=dy){err+=dy;x+=sx;}if(e<=dx){err+=dx;y+=sy;}}}
 poly(points,c,edge){const pts=points.map(p=>p.map(Math.round));const min=Math.min(...pts.map(p=>p[1])),max=Math.max(...pts.map(p=>p[1]));for(let y=min;y<=max;y++){const xs=[];for(let i=0;i<pts.length;i++){const [x1,y1]=pts[i],[x2,y2]=pts[(i+1)%pts.length];if((y1<=y&&y2>y)||(y2<=y&&y1>y))xs.push(x1+(y-y1)*(x2-x1)/(y2-y1));}xs.sort((a,b)=>a-b);for(let i=0;i+1<xs.length;i+=2)for(let x=Math.ceil(xs[i]);x<=Math.floor(xs[i+1]);x++)this.dot(x,y,c);}if(edge)for(let i=0;i<pts.length;i++)this.line(pts[i],pts[(i+1)%pts.length],edge);}
 ellipse(cx,cy,rx,ry,c,edge){for(let y=-ry;y<=ry;y++)for(let x=-rx;x<=rx;x++){const r=x*x/(rx*rx)+y*y/(ry*ry);if(r<=1)this.dot(cx+x,cy+y,edge&&((x+Math.sign(x||1))**2/(rx*rx)+y*y/(ry*ry)>1||x*x/(rx*rx)+(y+Math.sign(y||1))**2/(ry*ry)>1)?edge:c);}}
 crop(anchor=[320,210]){let x1=this.w,y1=this.h,x2=0,y2=0;for(let y=0;y<this.h;y++)for(let x=0;x<this.w;x++)if(this.data[(y*this.w+x)*4+3]){x1=Math.min(x1,x);y1=Math.min(y1,y);x2=Math.max(x2,x);y2=Math.max(y2,y);}const result=new Pixels(x2-x1+1,y2-y1+1);for(let y=y1;y<=y2;y++)for(let x=x1;x<=x2;x++)result.data.set(this.data.slice((y*this.w+x)*4,(y*this.w+x)*4+4),((y-y1)*result.w+x-x1)*4);return {pixels:result,anchor:{x:anchor[0]-x1,y:anchor[1]-y1}};}
 png(){return png(this.w,this.h,this.data);}
}
function crc(bytes){let c=0xffffffff;for(const byte of bytes){c^=byte;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;}
function chunk(name,data){const tag=Buffer.from(name),len=Buffer.alloc(4),sum=Buffer.alloc(4);len.writeUInt32BE(data.length);sum.writeUInt32BE(crc(Buffer.concat([tag,data])));return Buffer.concat([len,tag,data,sum]);}
function png(w,h,data){const header=Buffer.alloc(13);header.writeUInt32BE(w);header.writeUInt32BE(h,4);header[8]=8;header[9]=6;const rows=Buffer.alloc((w*4+1)*h);for(let y=0;y<h;y++)Buffer.from(data.slice(y*w*4,(y+1)*w*4)).copy(rows,y*(w*4+1)+1);return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(rows)),chunk('IEND',Buffer.alloc(0))]);}
export function studio(){const p=new Pixels();const P=(x,y,z=0)=>[320+12*(x-y),210+4*(x+y)-z];
 const top=(x,y,w,d,z,c,edge='ink')=>p.poly([P(x,y,z),P(x+w,y,z),P(x+w,y+d,z),P(x,y+d,z)],c,edge);
 const faceX=(x,y,d,z,h,c,edge='ink')=>p.poly([P(x,y,z),P(x,y+d,z),P(x,y+d,z+h),P(x,y,z+h)],c,edge);
 const faceY=(x,y,w,z,h,c,edge='ink')=>p.poly([P(x,y,z),P(x+w,y,z),P(x+w,y,z+h),P(x,y,z+h)],c,edge);
 const box=(x,y,w,d,z,h,colors=['woodLight','wood','woodShade'])=>{faceX(x+w,y,d,z,h,colors[2]);faceY(x,y+d,w,z,h,colors[1]);top(x,y,w,d,z+h,colors[0]);};
 const line=(a,b,c='ink')=>p.line(P(...a),P(...b),c);
 const shadow=(w,d)=>top(.15,.3,w+.25,d+.2,0,'shadow',null);
 const leg=(x,y,z=0,h=20)=>box(x,y,.22,.22,z,h,['woodLight','wood','woodShade']);
 return {p,P,top,faceX,faceY,box,line,shadow,leg};}
