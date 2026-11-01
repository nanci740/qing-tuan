import {useEffect,useState} from 'react';
import {PressedButton} from '../../../components/shared/PressedButton';
import {useSettingsNavigation} from '../../../providers/SettingsNavigationProvider';
import {ImageStorageSettings} from './ImageStorageSettings';
import {BackupSettings} from './BackupSettings';
import {backupDue,updateBackupMeta} from '../../../utils/fullBackup';
import {confirmChat} from '../../../utils/chatConfirm';
export function DataManagement(){
  const [open,setOpen]=useState(false);
  const {registerDestination,settingsOpen}=useSettingsNavigation();
  useEffect(()=>{
    const unregister=registerDestination('settingBackup',()=>setOpen(true));
    const close=()=>setOpen(false);
    window.addEventListener('qingtuan:close-settings',close);
    return()=>{unregister();window.removeEventListener('qingtuan:close-settings',close);};
  },[registerDestination]);
  // 打开设置时，照选的周期跳一次「备份一下吧」；按「下次再说」就等下一个周期
  useEffect(()=>{
    if(!settingsOpen||!backupDue())return;
    void confirmChat({title:'备份一下吧',message:'上次备份有一阵子了。\n资料都存在这个浏览器里，清掉缓存就没了，要现在备份吗？',confirmText:'去备份',cancelText:'下次再说'}).then(yes=>{updateBackupMeta({snooze:Date.now()});if(yes)setOpen(true);});
  },[settingsOpen]);
  return <div id="dataManagementPage" className={`settings-page${open?' active':''}`}>
    <div className="settings-header">
      <div style={{display:'flex',alignItems:'center',gap:8}}>
        <PressedButton className="back-btn" id="dataManagementBackBtn" type="button" aria-label="返回设置" onClick={()=>setOpen(false)}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </PressedButton>
        <h2>数据管理</h2>
      </div>
    </div>
    <div className="retro-address-bar" aria-hidden="true">
      <span className="retro-address-label">地址</span>
      <span className="retro-address-field"><span className="retro-address-icon"/>{'C:\\青团\\设置\\数据管理\\'}</span>
    </div>
    <div className="theme-settings-content"><BackupSettings open={open}/><ImageStorageSettings open={open} onClose={()=>setOpen(false)}/></div>
  </div>;
}
