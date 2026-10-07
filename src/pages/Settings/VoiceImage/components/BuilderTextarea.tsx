import { useLayoutEffect, useRef } from 'react';
import type { ComponentPropsWithoutRef } from 'react';
import { useVoiceImage } from '../../../../providers/VoiceImageProvider';
export function BuilderTextarea(props:ComponentPropsWithoutRef<'textarea'>){const ref=useRef<HTMLTextAreaElement>(null),{tab}=useVoiceImage();useLayoutEffect(()=>{const frame=requestAnimationFrame(()=>{const element=ref.current;if(element){element.style.height='auto';element.style.height=Math.min(Math.max(element.scrollHeight,28),120)+'px';}});return()=>cancelAnimationFrame(frame);},[props.value,tab]);return <textarea {...props} ref={ref}/>;}
