import { readImageSlot } from '../utils/imageAssets';
import {createContext,useContext,useRef,useState} from 'react';
import type {ReactNode} from 'react';
import {readSettingsAvatar} from '../utils/settingsStorage';
import {DEFAULT_BIRD_AVATAR} from '../utils/defaultAvatar';
function readStar(){try{return readImageSlot('avatar_star_custom')||'';}catch{return '';}}
function useAvatarState(){
 const [avatar,setAvatar]=useState(readSettingsAvatar),[avatarMissing,setAvatarMissing]=useState(true),[star,setStar]=useState(readStar),[restoreRevision,setRestoreRevision]=useState(0);
 const current=useRef({avatar,avatarMissing,star});current.current={avatar,avatarMissing,star};
 const api=useRef({messageAvatar(){return current.current.avatar||current.current.star||DEFAULT_BIRD_AVATAR;},sidebarAvatar(){return !current.current.avatarMissing&&current.current.avatar?current.current.avatar:current.current.star||DEFAULT_BIRD_AVATAR;}}).current;
 return {avatar,setAvatar,avatarMissing,setAvatarMissing,star,setStar,api,restoreRevision,restoreSidebar:()=>setRestoreRevision(value=>value+1)};
}
const Context=createContext<ReturnType<typeof useAvatarState>|null>(null);
export function ProfileAvatarProvider({children}:{children:ReactNode}){const value=useAvatarState();return <Context.Provider value={value}>{children}</Context.Provider>;}
export function useProfileAvatar(){const value=useContext(Context);if(!value)throw Error('ProfileAvatarProvider is required');return value;}
