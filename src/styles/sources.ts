import tokens from './tokens.css?raw';
import sheet0 from "../pages/Settings/Settings.css?raw";
import sheet1 from "../pages/Settings/BackgroundActivity/BackgroundActivity.css?raw";
import sheet2 from "../pages/Settings/VoiceImage/VoiceImage.css?raw";
import sheet3 from "../pages/Settings/Mcp/Mcp.css?raw";
import sheet4 from "../pages/Settings/Api/Api.css?raw";
import sheet5 from "../pages/Settings/Appearance/Appearance.css?raw";
import sheet6 from "../pages/Settings/Music/Music.css?raw";
import sheet7 from "../pages/PersonalProfile/PersonalProfile.css?raw";
import sheet8 from "../pages/Splash/Splash.css?raw";
import sheet9 from "../pages/Home/Home.css?raw";
import sheet10 from "../pages/World/World.css?raw";
import sheet11 from "../pages/Chat/Chat.css?raw";
import sheet12 from "../pages/Chat/List/ChatList.css?raw";
import sheet13 from "../pages/Chat/Room/ChatRoom.css?raw";
import sheet14 from "../pages/Chat/Settings/ChatSettings.css?raw";
import sheet15 from "../components/shared/shared.css?raw";

import dataManagement from "../pages/Settings/DataManagement/DataManagement.css?raw";

export const tokensCss = tokens;
export const orderedStyleSources: readonly string[] = [sheet0, sheet1, sheet2, sheet3, sheet4, sheet5, sheet6, sheet7, sheet8, sheet9, sheet10, sheet11, sheet12, sheet13, sheet14, sheet15, dataManagement];

// The first original stylesheet precedes the remote font stylesheet.
export const preFontStyleFragmentCount = 2;
