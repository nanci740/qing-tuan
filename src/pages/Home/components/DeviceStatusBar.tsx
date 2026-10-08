import { useDeviceStatus } from '../../../hooks/useDeviceStatus';
import { OriginalComment } from '../../../components/shared/OriginalComment';
export function DeviceStatusBar() {
 const status = useDeviceStatus();
 return (
      <div className="ios-status-bar">
        {"\n            "}
        <div className="status-time" id="statusBarTime">
          {status.time}
        </div>
        {"\n            "}
        <div className="status-right">
          {"\n                "}
          <OriginalComment text={" 信号 "} />
          {"\n                "}
          <svg id="cellularIcon" viewBox="0 0 16 12" style={{
          "width": "16px",
          "height": "11px",
          "fill": "none",
          "stroke": "none"
        }}>
            {"\n                    "}
            <rect id="cellBar1" style={{opacity: status.cellLevel >= 1 ? '1' : '0.2'}} x="0" y="8" width="3" height="4" rx="1" fill="var(--color-text)" />
            {"\n                    "}
            <rect id="cellBar2" style={{opacity: status.cellLevel >= 2 ? '1' : '0.2'}} x="4.5" y="5" width="3" height="7" rx="1" fill="var(--color-text)" />
            {"\n                    "}
            <rect id="cellBar3" style={{opacity: status.cellLevel >= 3 ? '1' : '0.2'}} x="9" y="2" width="3" height="10" rx="1" fill="var(--color-text)" />
            {"\n                    "}
            <rect id="cellBar4" style={{opacity: status.cellLevel >= 4 ? '1' : '0.2'}} x="13.5" y="0" width="3" height="12" rx="1" fill="var(--color-text)" />
            {"\n                "}
          </svg>
          {"\n                "}
          <OriginalComment text={" Wi-Fi "} />
          {"\n                "}
          <svg id="wifiIcon" viewBox="0 0 24 24" style={{
          "width": "17px",
          "height": "17px",
          "marginBottom": "0px"
        }}>
            {"\n                    "}
            <path id="wifiPath3" style={{opacity: status.wifiLevel >= 3 ? '1' : '0.2'}} d="M1.42 9a16 16 0 0 1 21.16 0" stroke="var(--color-text)" fill="none" />
            {"\n                    "}
            <path id="wifiPath2" style={{opacity: status.wifiLevel >= 2 ? '1' : '0.2'}} d="M5 12.55a11 11 0 0 1 14.08 0" stroke="var(--color-text)" fill="none" />
            {"\n                    "}
            <path id="wifiPath1" style={{opacity: status.wifiLevel >= 1 ? '1' : '0.2'}} d="M8.53 16.11a6 6 0 0 1 6.95 0" stroke="var(--color-text)" fill="none" />
            {"\n                    "}
            <line x1="12" y1="20" x2="12.01" y2="20" style={{
            "strokeWidth": "3",
            "stroke": "var(--color-text)"
          }} />
            {"\n                "}
          </svg>
          {"\n                "}
          <OriginalComment text={" 电池 "} />
          {"\n                "}
          <svg viewBox="0 0 24 12" style={{
          "width": "24px",
          "height": "12px",
          "marginBottom": "0px"
        }}>
            {"\n                    "}
            <rect x="1" y="1" width="20" height="10" rx="3.5" fill="none" stroke="var(--color-text)" strokeWidth="1.5" />
            {"\n                    "}
            <rect id="batteryLevel" x="3" y="3" width={status.batteryWidth} height="6" rx="1.5" fill={status.batteryFill} stroke="none" />
            {"\n                    "}
            <path d="M22 4.5 L22 7.5" stroke="var(--color-text)" strokeWidth="1.5" strokeLinecap="round" />
            {"\n                "}
          </svg>
          {"\n            "}
        </div>
        {"\n        "}
      </div>
 );
}
