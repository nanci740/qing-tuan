import {useEffect,useRef,useState, type ImgHTMLAttributes} from 'react';
import {DEFAULT_PHOTO,DEFAULT_PHOTO_WIDE} from '../../utils/defaultPhoto';
/** 上传图优先；空照片按实际容器比例选择预设，避免方图在宽窗口里缩小。 */
export function PhotoImage({src,style,onError,...props}:ImgHTMLAttributes<HTMLImageElement>){
  const [failed,setFailed]=useState<string>();
  const [wide,setWide]=useState(false);
  const image=useRef<HTMLImageElement>(null);
  useEffect(()=>{
    const element=image.current;if(!element)return;
    const measure=()=>{const {width,height}=element.getBoundingClientRect();if(width>0&&height>0)setWide(width/height>=1.4);};
    measure();
    const observer=new ResizeObserver(measure);observer.observe(element);
    return()=>observer.disconnect();
  },[]);
  const custom=Boolean(src&&src!==failed);
  return <img {...props} ref={image} src={custom?src:wide?DEFAULT_PHOTO_WIDE:DEFAULT_PHOTO} data-default-photo={!custom||undefined}
    style={{...style,...(!custom?{objectFit:'contain',backgroundColor:'#f0f0f0'}:{})}}
    onError={event=>{if(custom)setFailed(src);onError?.(event);}}/>;
}
