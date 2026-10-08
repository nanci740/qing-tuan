import {useState, type ImgHTMLAttributes} from 'react';
import {DEFAULT_PHOTO} from '../../utils/defaultPhoto';
/** 上传图优先；未上传或读取失败时完整显示预设。 */
export function PhotoImage({src,style,onError,...props}:ImgHTMLAttributes<HTMLImageElement>){
  const [failed,setFailed]=useState<string>();
  const custom=Boolean(src&&src!==failed);
  return <img {...props} src={custom?src:DEFAULT_PHOTO} data-default-photo={!custom||undefined}
    style={{...style,...(!custom?{objectFit:'contain',backgroundColor:'#f3f3f3'}:{})}}
    onError={event=>{if(custom)setFailed(src);onError?.(event);}}/>;
}
