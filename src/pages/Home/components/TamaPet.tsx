import { PressedDiv } from '../../../components/shared/PressedDiv';
import { PressedButton } from '../../../components/shared/PressedButton';
import { flushSync } from 'react-dom';
import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, MouseEvent } from 'react';

const KEY = 'qt_tama_v1';
const MAX = 4;
const MAX_POOP = 3;
const DECAY_MS = 3 * 60 * 60 * 1000;
interface PetState { hunger: number; happy: number; sleeping: boolean; last: number; poops: number[]; }
interface Particle { id: number; kind: 'heart' | 'food' | 'zz' | 'sparkle'; x: number; y: number; text?: string; left?: boolean; }
const PET = ['...XXXXX...','..XoooooX..','.XoooooooX.','.XoEoMoEoX.','XoBBoMoBBoX','XoooooooooX','XoooooooooX','.XoooooooX.','..XXXXXXX..'];
const HEART = ['.XX.XX.','XXXXXXX','XXXXXXX','.XXXXX.','..XXX..','...X...'];
const HEART_EMPTY = ['.XX.XX.','X..X..X','X.....X','.X...X.','..X.X..','...X...'];
const APPLE = ['...X...','.XX.XX.','XwXXXXX','XXXXXXX','XXXXXXX','.XXXXX.'];
const APPLE_EMPTY = ['...X...','.XX.XX.','X.....X','X.....X','X.....X','.XXXXX.'];
const POOP = ['...X....','..XwXX..','.XwwwwX.','.XXwXXX.','XwwwwwwX','XwwwwwwX','.XXXXXX.'];
const ONIGIRI = ['....XXX....','...XwwwX...','..XwwwwwX..','.XwwwwwwwX.','.XwwwwwwwX.','XwwwwwwwwwX','XwwXXXXXwwX','XwwXXXXXwwX','XwwXXXXXwwX','.XXXXXXXXX.'];
const ZZ = ['XXXXX....','...X.....','..X......','.X...XXXX','XXXXX..X.','......X..','.....XXXX'];
const PET_CLASSES = { X: 'tq-x', o: 'tq-o', H: 'tq-h', E: 'tq-eye', B: 'tq-b', M: 'tq-mouth' };
type ExtraPixel = readonly [number, number, number, number, string];
/** 保留每行像素高度 1.08，避免缩放时出现细缝。 */
function PetPixels({ rows, classes, extra = [], className, underlay = false }: { rows: readonly string[]; classes: Record<string,string>; extra?: readonly ExtraPixel[]; className?: string; underlay?: boolean; }) {
  const pixels = rows.flatMap((row, y) => {
    const result = [];
    let x = 0;
    while (x < row.length) {
      const name = classes[row[x]];
      if (!name) { x++; continue; }
      let end = x;
      while (end < row.length && classes[row[end]] === name) end++;
      result.push(<rect key={`${y}:${x}`} x={x} y={y} width={end-x} height={1.08} className={name} />);
      x = end;
    }
    return result;
  });
  return <svg viewBox={`0 0 ${rows[0].length} ${rows.length}`} aria-hidden="true" className={className}>{underlay && <rect x={2} y={3} width={7} height={2} className="tq-o" />}{pixels}{extra.map(([x,y,w,h,cls],i)=><rect key={`extra:${i}`} x={x} y={y} width={w} height={h} className={cls} />)}</svg>;
}
function loadPet(): PetState {
  let state: PetState = { hunger: 3, happy: 3, sleeping: false, last: Date.now(), poops: [] };
  try { const saved: unknown = JSON.parse(localStorage.getItem(KEY) || 'null'); if (saved && typeof saved === 'object') state = Object.assign(state, saved); } catch { /* 原默认状态。 */ }
  if (!Array.isArray(state.poops)) state.poops = [];
  return state;
}
function savePet(state: PetState) { try { localStorage.setItem(KEY,JSON.stringify(state)); } catch { /* 原存储失败回退。 */ } }
function applyDecay(state: PetState): PetState {
  const steps = Math.floor((Date.now()-state.last)/DECAY_MS);
  if (steps <= 0) return state;
  const poops = [...state.poops];
  for (let i=0;i<steps && poops.length<MAX_POOP;i++) if(Math.random()<.5) poops.push(Math.random());
  const next = { ...state, hunger:Math.max(0,state.hunger-steps), happy:Math.max(0,state.happy-steps), poops, last:state.last+steps*DECAY_MS };
  savePet(next);
  return next;
}
export function TamaPet() {
  const [state,setState] = useState(() => applyDecay(loadPet()));
  const latest = useRef(state); latest.current = state;
  const [meters,setMeters] = useState(state);
  const [pose,setPose] = useState({ x: '', flip:false, transition:'' });
  const poseRef=useRef(pose);poseRef.current=pose;
  const [actions,setActions]=useState<ReadonlySet<string>>(new Set());
  const [particles,setParticles]=useState<Particle[]>([]);
  const stage=useRef<HTMLDivElement>(null),pet=useRef<HTMLDivElement>(null);
  const busyUntil=useRef(0),serial=useRef(0);
  const timers=useRef(new Set<ReturnType<typeof setTimeout>>());
  const actionTimers=useRef(new Map<string,ReturnType<typeof setTimeout>>());
  function later(action:()=>void,delay:number) {
    const timer=setTimeout(()=>{timers.current.delete(timer);action();},delay);
    timers.current.add(timer);return timer;
  }
  function update(next:PetState,render=true) { latest.current=next;setState(next);savePet(next);if(render)setMeters(next); }
  function act(cls:string,ms:number) {
    const previous=actionTimers.current.get(cls);if(previous)clearTimeout(previous);
    flushSync(()=>setActions(current=>{const next=new Set(current);next.delete(cls);return next;}));
    void pet.current?.offsetWidth;
    setActions(current=>new Set([...current,cls]));
    actionTimers.current.set(cls,later(()=>setActions(current=>{const next=new Set(current);next.delete(cls);return next;}),ms));
  }
  function fx(kind:Particle['kind'],x:number,y:number,left=false) {
    const id=serial.current++;
    const particle:Particle={id,kind,x,y,left,text:kind==='zz'?(Math.random()<.5?'z':'Z'):kind==='sparkle'?'✧':undefined};
    setParticles(current=>[...current,particle]);
    later(()=>setParticles(current=>current.filter(p=>p.id!==id)),kind==='zz'?4600:1700);
  }
  function hearts(n:number) { for(let i=0;i<n;i++)later(()=>{const el=pet.current;if(el)fx('heart',el.offsetLeft+el.offsetWidth/2-3+(i-(n-1)/2)*9,Math.max(0,el.offsetTop-8));},i*160); }
  function wake() { if(!latest.current.sleeping)return false;update({...latest.current,sleeping:false});act('jump',500);return true; }
  function stopWalking() {
    const el=pet.current;if(!el)return;
    const x=parseFloat(getComputedStyle(el).left)||el.offsetLeft;
    flushSync(()=>setPose(current=>({...current,x:`${x}px`,transition:'none'})));
    void el.offsetWidth;
    setPose(current=>({...current,transition:''}));
  }
  function poopLater() {
    if(Math.random()>.45)return;
    later(()=>{const s=stage.current,p=pet.current;if(!s||!p||latest.current.poops.length>=MAX_POOP)return;
      const maxX=Math.max(1,s.clientWidth-16);
      const behind=poseRef.current.flip?p.offsetLeft+p.offsetWidth:p.offsetLeft-12;
      update({...latest.current,poops:[...latest.current.poops,Math.min(1,Math.max(0,(behind-2)/maxX))]});
    },12000+Math.random()*18000);
  }
  function feed(event:MouseEvent) {
    event.stopPropagation();if(wake())return;stopWalking();busyUntil.current=Date.now()+2200;
    if(latest.current.hunger>=MAX){act('no',600);return;}
    const p=pet.current,s=stage.current;if(!p||!s)return;
    const x=poseRef.current.flip?p.offsetLeft-12:p.offsetLeft+p.offsetWidth+1;
    fx('food',Math.max(1,Math.min(s.clientWidth-12,x)),s.clientHeight-16);act('eat',1800);
    update({...latest.current,hunger:Math.min(MAX,latest.current.hunger+1)},false);
    later(()=>setMeters(latest.current),1800);poopLater();
  }
  function play(event:MouseEvent) { event.stopPropagation();if(wake())return;busyUntil.current=Date.now()+1400;act('love',1300);hearts(2);update({...latest.current,happy:Math.min(MAX,latest.current.happy+1)}); }
  function sleep(event:MouseEvent) { event.stopPropagation();const sleeping=!latest.current.sleeping;update({...latest.current,sleeping});if(!sleeping)act('jump',500); }
  function poke(event:MouseEvent|KeyboardEvent) { event.stopPropagation();if(wake())return;busyUntil.current=Date.now()+900;act('jump',500);hearts(1);if(Math.random()<.35)update({...latest.current,happy:Math.min(MAX,latest.current.happy+1)}); }
  useEffect(()=>{
    function wander() {
      later(wander,4500+Math.random()*4000);
      const p=pet.current,s=stage.current;
      if(!p||!s||latest.current.sleeping||Date.now()<busyUntil.current||document.hidden)return;
      const maxX=Math.max(4,s.clientWidth-p.offsetWidth-6),x=4+Math.round(Math.random()*(maxX-4));
      setPose(current=>({...current,flip:x<p.offsetLeft,x:`${x}px`}));
    }
    later(wander,1500);
    const zzz=setInterval(()=>{
      const p=pet.current,s=stage.current;if(!latest.current.sleeping||document.hidden||!p||!s)return;
      let right=!poseRef.current.flip;
      if(right&&p.offsetLeft+p.offsetWidth+14>s.clientWidth)right=false;
      if(!right&&p.offsetLeft<14)right=true;
      fx('zz',right?p.offsetLeft+p.offsetWidth+1:p.offsetLeft-7,Math.max(0,p.offsetTop-2),!right);
    },3400);
    const decay=setInterval(()=>{const next=applyDecay(latest.current);latest.current=next;setState(next);setMeters(next);},60000);
    return()=>{clearInterval(zzz);clearInterval(decay);timers.current.forEach(clearTimeout);timers.current.clear();};
  },[]);
  const petClass=['tama-pet',pose.flip?'flip':'',...actions].filter(Boolean).join(' ');
  const widgetClass=['tama-widget',meters.hunger<=1||meters.poops.length>=2?'needy':'',meters.sleeping?'sleeping':''].filter(Boolean).join(' ');
  return <section className={widgetClass} id="tamaWidget" aria-label="电子宠物小鸟">{'\n'}<div className="tama-screen">{'\n'}<div className="tama-inner">{'\n'}<div className="tama-status" aria-hidden="true">{'\n'}<div className="tama-meter" id="tamaHunger">{Array.from({length:MAX},(_,i)=><PetPixels key={i} rows={i<meters.hunger?APPLE:APPLE_EMPTY} classes={{X:'tf-x',w:'tf-w'}} className={i>=meters.hunger?'empty':undefined} />)}</div>{'\n'}<div className="tama-meter" id="tamaHappy">{Array.from({length:MAX},(_,i)=><PetPixels key={i} rows={i<meters.happy?HEART:HEART_EMPTY} classes={{X:'tf-x'}} className={i>=meters.happy?'empty':undefined} />)}</div>{'\n'}</div>{'\n'}<div className="tama-stage" id="tamaStage" ref={stage}>{'\n'}<PressedDiv className={petClass} id="tamaPet" role="button" tabIndex={0} aria-label="摸摸小鸟" ref={pet} style={{left:pose.x||undefined,transition:pose.transition||undefined}} onClick={poke} onKeyDown={event=>{if(event.key==='Enter'||event.key===' ')poke(event);}}><span className="tama-need" aria-hidden="true">!</span><div className="tama-bob"><PetPixels rows={PET} classes={PET_CLASSES} underlay extra={[[3,3.5,1,.5,'tq-eye-closed'],[7,3.5,1,.5,'tq-eye-closed'],[4.5,3,2,2,'tq-mouth-open']]} /></div></PressedDiv>{'\n'}{meters.poops.map((pos,i)=><PressedButton type="button" className="tama-poop" aria-label="清掉便便" style={{left:`calc(2px + ${pos} * (100% - 16px))`}} key={`${i}:${pos}`} onClick={event=>{event.stopPropagation();const x=event.currentTarget.offsetLeft;update({...latest.current,poops:latest.current.poops.filter((_,index)=>index!==i)});fx('sparkle',x+2,(stage.current?.clientHeight||0)-16);}}><PetPixels rows={POOP} classes={{X:'tf-x',w:'tf-w'}} /></PressedButton>)}{particles.map(p=><div key={p.id} className={`tama-fx ${p.kind}${p.left?' left':''}`} style={{left:p.x,top:p.y}}>{p.kind==='heart'?<PetPixels rows={HEART} classes={{X:'tf-x'}} />:p.kind==='food'?<PetPixels rows={ONIGIRI} classes={{X:'tf-x',w:'tf-w'}} />:p.text}</div>)}</div>{'\n'}</div>{'\n'}</div>{'\n'}<div className="tama-buttons">{'\n'}<PressedButton className="tama-btn" type="button" data-tama="feed" aria-label="喂食" onClick={feed}><PetPixels rows={ONIGIRI} classes={{X:'tb-x',w:'tb-w'}} /></PressedButton>{'\n'}<PressedButton className="tama-btn" type="button" data-tama="play" aria-label="摸摸" onClick={play}><PetPixels rows={HEART} classes={{X:'tb-x',w:'tb-w'}} /></PressedButton>{'\n'}<PressedButton className="tama-btn" type="button" data-tama="sleep" aria-label="睡觉" onClick={sleep}><PetPixels rows={ZZ} classes={{X:'tb-x',w:'tb-w'}} /></PressedButton>{'\n'}</div>{'\n'}</section>;
}
