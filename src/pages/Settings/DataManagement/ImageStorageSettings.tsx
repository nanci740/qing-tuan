import {useEffect,useRef,useState} from 'react';
import {PressedButton} from '../../../components/shared/PressedButton';
import {cleanUnusedImages,getImageLibraryStats,type ImageLibraryStats} from '../../../utils/imageAssets';
import {confirmChat} from '../../../utils/chatConfirm';
import {showToast} from '../../../utils/toast';
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
  const status=busy?'正在检查图片库…':error?'检查未完成':!stats?'等待检查':stats.unusedCount?`可清理 ${stats.unusedCount} 张旧图片`:'图片库很整洁，暂时无需清理';
  const percent=(bytes:number)=>stats?.totalBytes?`${bytes/stats.totalBytes*100}%`:'0%';
  return <section className="theme-setting-group image-storage-tool" id="imageStorageSection" aria-labelledby="imageStorageTitle">
    <div className="image-storage-titlebar">
      <h3 id="imageStorageTitle">图片清理</h3>
      <span>本机图片库</span>
    </div>
    <div className="theme-setting-card" aria-busy={busy}>
      <div className="image-storage-intro">
        <svg className="image-storage-icon" viewBox="0 0 20 20" aria-hidden="true" shapeRendering="crispEdges">
          <path fill="var(--set-bg)" d="M7 2h10v11H7z"/>
          <path fill="currentColor" d="M7 1h10v1H7zM17 2h1v11h-1zM7 13h10v1H7zM6 2h1v3H6z"/>
          <path fill="var(--color-surface)" d="M3 6h11v11H3z"/>
          <path fill="currentColor" d="M3 5h11v1H3zM2 6h1v11H2zM14 6h1v11h-1zM3 17h11v1H3z"/>
          <path fill="var(--sb-accent)" d="M5 7h2v2H5zM4 14h2v-2h2v-2h2v2h2v2h1v2H4z"/>
          <path fill="currentColor" d="M10 3h5v1h-5zM16 16h2v-1h1v3h-3v-1h-1v-2h1z"/>
        </svg>
        <p>整理不再使用的图片<span>留下正在使用的，收拾替换下来的。</span></p>
      </div>
      <fieldset className="image-storage-overview">
        <legend>占用概览</legend>
        <dl className="image-storage-summary" aria-live="polite">
          <div><dt>图片库占用</dt><dd>{stats?`${stats.totalCount} 张 · ${size(stats.totalBytes)}`:'待检查'}</dd></div>
          <div><dt>正在使用</dt><dd>{stats?`${stats.usedCount} 张 · ${size(stats.usedBytes)}`:'—'}</dd></div>
          <div><dt>可清理</dt><dd>{stats?`${stats.unusedCount} 张 · ${size(stats.unusedBytes)}`:'—'}</dd></div>
        </dl>
        <div className="image-storage-meter" aria-hidden="true">
          <span data-kind="used" style={{width:percent(stats?.usedBytes??0)}}/>
          <span data-kind="protected" style={{width:percent(stats?.protectedBytes??0)}}/>
          <span data-kind="unused" style={{width:percent(stats?.unusedBytes??0)}}/>
        </div>
        <div className="image-storage-legend" aria-hidden="true"><span data-kind="used">使用中</span>{Boolean(stats?.protectedCount)&&<span data-kind="protected">暂时保留</span>}<span data-kind="unused">可清理</span></div>
      </fieldset>
      <fieldset className="image-storage-scope">
        <legend>清理说明</legend>
        <p className="image-storage-note">仅清理这台设备中未被引用的旧图片，共用图片只计一次。聊天专属壁纸、字体及外链图片不计入此库。</p>
        <p className="image-storage-note">清理前，请关闭其他青团机页面。</p>
        {Boolean(stats?.protectedCount)&&<p className="image-storage-note">本次打开期间用过的 {stats!.protectedCount} 张图片暂时保留，重新打开后可再检查。</p>}
        {error&&<p className="image-storage-note" role="alert">{error}</p>}
      </fieldset>
      <div className="theme-icon-bottom-actions">
        <PressedButton className="theme-icon-bottom-btn" id="inspectImageStorageBtn" disabled={busy} onClick={()=>void run(false)}>重新检查</PressedButton>
        <PressedButton className="theme-icon-bottom-btn primary ui-cyan-btn" id="cleanImageStorageBtn" disabled={busy||!stats?.unusedCount} onClick={()=>void run(true)}>{busy?'处理中…':'清理旧图片'}</PressedButton>
      </div>
    </div>
    <div className="image-storage-status" role="status" data-busy={busy} data-error={Boolean(error)}>{status}</div>
  </section>;
}
