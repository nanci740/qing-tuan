/** 未迁移的子页面只暴露进入前的初始化，不在 React 菜单上绑定原生点击事件。 */
export type SettingsDestination = 'settingTheme' | 'settingMusic' | 'settingPersonal' | 'settingApi' | 'settingMcp' | 'settingVoiceAi' | 'settingBackground' | 'settingBackup';
export type SettingsPageEntries = Partial<Record<SettingsDestination, () => void | Promise<void>>>;
