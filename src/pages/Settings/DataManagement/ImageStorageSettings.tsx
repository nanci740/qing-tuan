import {useEffect,useRef,useState} from 'react';
import {PressedButton} from '../../../components/shared/PressedButton';
import {cleanUnusedImages,getImageLibraryStats,type ImageLibraryStats} from '../../../utils/imageAssets';
import {confirmChat} from '../../../utils/chatConfirm';
import {showToast} from '../../../utils/toast';
function size(bytes:number){return bytes<1024?`${bytes} B`:bytes<1024*1024?`${(bytes/1024).toFixed(1)} KB`:`${(bytes/1024/1024).toFixed(2)} MB`;}
export function ImageStorageSettings({open,onClose}:{open:boolean;onClose:()=>void}){
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
  const status=busy?'正在检查图片库…':error?'检查未完成':!stats?'等待检查':stats.unusedCount?`可清理 ${stats.unusedCount} 张旧图片`:'图片库很整洁，暂时无需清理';
  return <section className="image-storage-tool" id="imageStorageSection" aria-labelledby="imageStorageTitle">
    <div className="image-storage-titlebar">
      <h3 id="imageStorageTitle"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="1"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 5-5 4 4 3-3 6 6"/></svg>图片清理</h3>
      <div className="image-storage-title-tools"><PressedButton className="image-storage-close" id="imageStorageCloseBtn" type="button" aria-label="关闭图片清理" onClick={onClose}><svg viewBox="0 0 12 12" aria-hidden="true"><rect x=".5" y=".5" width="11" height="11"/><path d="m3.5 3.5 5 5m0-5-5 5"/></svg></PressedButton></div>
    </div>
    <div className="image-storage-content" aria-busy={busy}>
      <div className="image-storage-intro">
        <svg className="image-storage-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 7V3h14v14h-4"/><rect x="3" y="7" width="14" height="14" rx="1"/><circle cx="7" cy="11" r="1"/><path d="m3 17 4-4 4 4 3-3 3 3"/>
        </svg>
        <p>给图片库腾一点空间<span>正在使用的图片会保留。</span></p>
      </div>
      <div className="image-storage-reclaim" aria-live="polite">
        <span>可释放空间</span>
        <strong>{stats?size(stats.unusedBytes):'—'}</strong>
      </div>
      <dl className="image-storage-summary" aria-label="图片库占用" aria-live="polite">
        <div><dt>图片库占用</dt><dd>{stats?`${stats.totalCount} 张`:'—'}</dd><dd>{stats?size(stats.totalBytes):'待检查'}</dd></div>
        <div><dt>正在使用</dt><dd>{stats?`${stats.usedCount} 张`:'—'}</dd><dd>{stats?size(stats.usedBytes):'—'}</dd></div>
        {Boolean(stats?.protectedCount)&&<div><dt>暂时保留</dt><dd>{stats!.protectedCount} 张</dd><dd>{size(stats!.protectedBytes)}</dd></div>}
        <div data-kind="unused"><dt>可清理</dt><dd>{stats?`${stats.unusedCount} 张`:'—'}</dd><dd>{stats?size(stats.unusedBytes):'—'}</dd></div>
      </dl>
      <p className="image-storage-status" role="status" data-busy={busy} data-error={Boolean(error)}>{status}</p>
      <div className="image-storage-scope">
        <p className="image-storage-note">只清理本机未被引用的旧图片，共用图片只计一次。聊天专属壁纸、字体及外链图片不计入此库。</p>
        <p className="image-storage-note">清理前，请关闭其他青团机页面。</p>
        {Boolean(stats?.protectedCount)&&<p className="image-storage-note">本次打开期间用过的 {stats!.protectedCount} 张图片暂时保留，重新打开后可再检查。</p>}
        {error&&<p className="image-storage-note" role="alert">{error}</p>}
      </div>
      <div className="theme-icon-bottom-actions">
        <PressedButton className="theme-icon-bottom-btn" id="inspectImageStorageBtn" disabled={busy} onClick={()=>void run(false)}>重新检查</PressedButton>
        <PressedButton className="theme-icon-bottom-btn primary ui-cyan-btn" id="cleanImageStorageBtn" disabled={busy||!stats?.unusedCount} onClick={()=>void run(true)}>{busy?'处理中…':'清理旧图片'}</PressedButton>
      </div>
    </div>
  </section>;
}
