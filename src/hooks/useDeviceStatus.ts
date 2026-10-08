import { useEffect, useState } from 'react';
interface Battery extends EventTarget { level: number; charging: boolean }
interface Connection { type?: string; effectiveType?: string; downlink: number }
type DeviceNavigator = Navigator & { getBattery?: () => Promise<Battery>; connection?: Connection; mozConnection?: Connection; webkitConnection?: Connection };
const pad2 = (n: number) => String(n).padStart(2, '0');
function clock() { const date = new Date(); return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`; }

export function useDeviceStatus() {
  const [time, setTime] = useState(clock);
  const [status, setStatus] = useState({ batteryWidth: 14, wifiLevel: 3, cellLevel: 4 });
  useEffect(() => {
    let disposed = false;
    const batteries = new Map<Battery, () => void>();
    async function updateNetworkAndBattery() {
      const device = navigator as DeviceNavigator;
      let batteryWidth: number;
      try {
        if (!device.getBattery) throw new Error('Battery API not supported');
        const battery = await device.getBattery();
        if (disposed) return;
        const level = battery.level * 100;
        batteryWidth = Math.max(1, level / 100 * 14);
        if (!batteries.has(battery)) {
          const changed = () => { void updateNetworkAndBattery(); };
          batteries.set(battery, changed);
          battery.addEventListener('levelchange', changed); battery.addEventListener('chargingchange', changed);
        }
      } catch {
        // 更新状态栏数据（真实状态不可用时保留原模拟电量）。
        let currentBattery = parseInt(localStorage.getItem('simBattery') || '') || 85;
        if (Math.random() < 0.05) {
          currentBattery = Math.random() > 0.8 ? Math.min(100, currentBattery + 1) : Math.max(1, currentBattery - 1);
          localStorage.setItem('simBattery', String(currentBattery));
        }
        batteryWidth = Math.max(1, currentBattery / 100 * 14);
      }
      const connection = device.connection || device.mozConnection || device.webkitConnection;
      let wifiLevel = 3, cellLevel = 4;
      if (connection) {
        if (navigator.onLine) {
          const sigLevel = connection.downlink < 1 ? 1 : connection.downlink < 3 ? 2 : connection.downlink < 5 ? 3 : 4;
          if (connection.type === 'wifi' || connection.effectiveType === 'wifi') { wifiLevel = Math.min(sigLevel, 3); cellLevel = 0; }
          else { wifiLevel = 0; cellLevel = sigLevel; }
        } else { wifiLevel = 0; cellLevel = 0; }
      } else {
        // 模拟网络波动，与原概率一致。
        wifiLevel = Math.random() > 0.8 ? (Math.random() > 0.5 ? 2 : 1) : 3;
        cellLevel = Math.random() > 0.85 ? (Math.random() > 0.5 ? 3 : 2) : 4;
      }
      if (!disposed) setStatus({ batteryWidth, wifiLevel, cellLevel });
    }
    void updateNetworkAndBattery();
    const networkTimer = setInterval(() => { void updateNetworkAndBattery(); }, 3000);
    const clockTimer = setInterval(() => setTime(clock()), 1000);
    return () => {
      disposed = true; clearInterval(networkTimer); clearInterval(clockTimer);
      batteries.forEach((changed, battery) => { battery.removeEventListener('levelchange', changed); battery.removeEventListener('chargingchange', changed); });
    };
  }, []);
  return { time, ...status };
}
