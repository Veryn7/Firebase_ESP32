export interface SensorState {
  temperature: number | "--";
  humidity: number | "--";
  lastUpdate: number | null;
}

export interface RelayState {
  relay1: boolean;
  relay2: boolean;
  relay3: boolean;
  relay4: boolean;
}

export interface ModeState {
  name: "NORMAL" | "KIRI_KANAN" | "STROBO";
  active: boolean;
}

export interface DeviceState {
  status: "ONLINE" | "OFFLINE" | "demo" | string;
  ipAddress: string;
  lastSeen: number | null;
}

export interface SystemLog {
  id?: string;
  message: string;
  source: "web" | "voice" | "system";
  timestamp: any;
}

export interface ChartDataPoint {
  time: string;
  temperature: number;
  humidity: number;
}
