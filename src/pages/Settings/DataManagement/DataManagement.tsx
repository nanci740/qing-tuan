import {useEffect,useState} from 'react';
import {PressedButton} from '../../../components/shared/PressedButton';
import {useSettingsNavigation} from '../../../providers/SettingsNavigationProvider';
import {ImageStorageSettings} from './ImageStorageSettings';
export function DataManagement(){
  const [open,setOpen]=useState(false);
  const {registerDestination}=useSettingsNavigation();
  useEffect(()=>{
    const unregister=registerDestination('settingBackup',()=>setOpen(true));
    const close=()=>setOpen(false);
    window.addEventListener('qingtuan:close-settings',close);
    return()=>{unregister();window.removeEventListener('qingtuan:close-settings',close);};
  },[registerDestination]);
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
    <div className="theme-settings-content"><ImageStorageSettings open={open}/></div>
  </div>;
}
