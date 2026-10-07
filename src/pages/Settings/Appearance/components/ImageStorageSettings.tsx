import {useEffect,useRef,useState} from 'react';
import {PressedButton} from '../../../../components/shared/PressedButton';
import {cleanUnusedImages,getImageLibraryStats,type ImageLibraryStats} from '../../../../utils/imageAssets';
import {confirmChat} from '../../../../utils/chatConfirm';
import {showToast} from '../../../../utils/toast';
function size(bytes:number){return bytes<1024?`${bytes} B`:bytes<1024*1024?`${(bytes/1024).toFixed(1)} KB`:`${(bytes/1024/1024).toFixed(2)} MB`;}
export function ImageStorageSettings({open}:{open:boolean}){
  const [stats,setStats]=useState<ImageLibraryStats|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const lock=useRef(false);
  async function run(clean:boolean){
    if(lock.current)return;lock.current=true;setBusy(true);setError('');
    try {
      const current=await getImageLibraryStats();setStats(current);
      if(!clean)return;
      if(!current.unusedCount){showToast('没有可清理的旧图片');return;}
      if(!await confirmChat({title:'清理旧图片',message:`将清理 ${current.unusedCount} 张未引用的旧图片，约 ${size(current.unusedBytes)}。正在使用和本次打开期间用过的图片会保留。`,confirmText:'清理图片',danger:true}))return;
      const result=await cleanUnusedImages();setStats(result.stats);
      showToast(`已清理 ${result.deletedCount} 张旧图片，释放 ${size(result.deletedBytes)}`);
    } catch(cause){const message=cause instanceof Error?cause.message:'图片库读取或清理失败，请稍后重试';setError(message);setStats(null);showToast(message);}
    finally{lock.current=false;setBusy(false);}
  }
  useEffect(()=>{if(open)void run(false);},[open]);
  return <section className="theme-setting-group" id="imageStorageSection">
    <div className="theme-setting-label">图片清理</div>
    <div className="theme-setting-card image-storage-card" aria-busy={busy}>
      <dl className="image-storage-summary" aria-live="polite">
        <div><dt>图片库占用</dt><dd>{stats?`${stats.totalCount} 张 · ${size(stats.totalBytes)}`:'待检查'}</dd></div>
        <div><dt>正在使用</dt><dd>{stats?`${stats.usedCount} 张 · ${size(stats.usedBytes)}`:'—'}</dd></div>
        <div><dt>可清理</dt><dd>{stats?`${stats.unusedCount} 张 · ${size(stats.unusedBytes)}`:'—'}</dd></div>
      </dl>
      <p className="image-storage-note">只清理这台设备中未被引用的旧图片。同一张图片共用时只计一次。清理前请关闭其他青团机页面。聊天专属壁纸、字体及外链图片不计入此图片库。</p>
      {Boolean(stats?.protectedCount)&&<p className="image-storage-note">本次打开期间用过的 {stats!.protectedCount} 张图片暂时保留，重新打开后可再检查。</p>}
      {error&&<p className="image-storage-note" role="alert">{error}</p>}
      <div className="theme-icon-bottom-actions">
        <PressedButton className="theme-icon-bottom-btn" id="inspectImageStorageBtn" disabled={busy} onClick={()=>void run(false)}>重新检查</PressedButton>
        <PressedButton className="theme-icon-bottom-btn primary ui-cyan-btn" id="cleanImageStorageBtn" disabled={busy||!stats?.unusedCount} onClick={()=>void run(true)}>{busy?'处理中…':'清理旧图片'}</PressedButton>
      </div>
    </div>
  </section>;
}
