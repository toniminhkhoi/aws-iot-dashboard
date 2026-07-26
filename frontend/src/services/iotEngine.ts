import axios from 'axios';

export interface TelemetryData {
  id?: number;
  device_id: string;
  temperature?: number | null;
  humidity?: number | null;
  light_intensity?: number | null;
  fan_status?: boolean | null;
  light_status?: boolean | null;
  curtain_status?: boolean | null;
  timestamp: string;
}

export type DataSource = 'LIVE AWS' | 'SIMULATED';

export interface MetricSourceMap {
  temperature: DataSource;
  humidity: DataSource;
  light_intensity: DataSource;
  fan_status: DataSource;
  light_status: DataSource;
  curtain_status: DataSource;
}

export interface SafeTelemetryResult {
  data: TelemetryData;
  isGlobalMock: boolean;
  sourceMap: MetricSourceMap;
}

let mockState = {
  fan_status: false,
  light_status: true,
  curtain_status: false,
  tempBase: 28.5,
  humidBase: 65.0,
};

// 1. LẤY DỮ LIỆU REAL-TIME (CÓ HUY HIỆU NGUỒN)
export const getSafeTelemetry = async (deviceId: string): Promise<SafeTelemetryResult> => {
  try {
    const res = await axios.get(`/api/devices/${deviceId}/latest`, { timeout: 2000 });
    const realData = res.data.data;

    const sourceMap: MetricSourceMap = {
      temperature: realData?.temperature != null ? 'LIVE AWS' : 'SIMULATED',
      humidity: realData?.humidity != null ? 'LIVE AWS' : 'SIMULATED',
      light_intensity: realData?.light_intensity != null ? 'LIVE AWS' : 'SIMULATED',
      fan_status: realData?.fan_status != null ? 'LIVE AWS' : 'SIMULATED',
      light_status: realData?.light_status != null ? 'LIVE AWS' : 'SIMULATED',
      curtain_status: realData?.curtain_status != null ? 'LIVE AWS' : 'SIMULATED',
    };

    mockState.tempBase += (Math.random() - 0.48) * 0.4;
    mockState.humidBase += (Math.random() - 0.5) * 0.6;

    const cleanData: TelemetryData = {
      device_id: realData?.device_id || deviceId,
      temperature: realData?.temperature ?? Number(mockState.tempBase.toFixed(1)),
      humidity: realData?.humidity ?? Number(mockState.humidBase.toFixed(1)),
      light_intensity: realData?.light_intensity ?? Math.floor(450 + Math.random() * 50),
      fan_status: realData?.fan_status ?? mockState.fan_status,
      light_status: realData?.light_status ?? mockState.light_status,
      curtain_status: realData?.curtain_status ?? mockState.curtain_status,
      timestamp: realData?.timestamp || new Date().toISOString(),
    };

    return { data: cleanData, isGlobalMock: false, sourceMap };
  } catch (error) {
    mockState.tempBase += (Math.random() - 0.48) * 0.4;
    mockState.humidBase += (Math.random() - 0.5) * 0.6;

    const mockData: TelemetryData = {
      device_id: `${deviceId} [OFFLINE]`,
      temperature: Number(mockState.tempBase.toFixed(1)),
      humidity: Number(mockState.humidBase.toFixed(1)),
      light_intensity: Math.floor(450 + Math.random() * 50),
      fan_status: mockState.fan_status,
      light_status: mockState.light_status,
      curtain_status: mockState.curtain_status,
      timestamp: new Date().toISOString(),
    };

    const allMockMap: MetricSourceMap = {
      temperature: 'SIMULATED', humidity: 'SIMULATED', light_intensity: 'SIMULATED',
      fan_status: 'SIMULATED', light_status: 'SIMULATED', curtain_status: 'SIMULATED',
    };

    return { data: mockData, isGlobalMock: true, sourceMap: allMockMap };
  }
};

// 2. LẤY LỊCH SỬ DỮ LIỆU (CHO 3 BIỂU ĐỒ RIÊNG BIỆT)
export const getSafeHistory = async (deviceId: string): Promise<any[]> => {
  try {
    const res = await axios.get(`/api/devices/${deviceId}/history`, { timeout: 3000 });
    const logs: TelemetryData[] = res.data.data || [];
    
    return logs.slice(0, 15).reverse().map(log => ({
      time: new Date(log.timestamp).toLocaleTimeString('vi-VN', { second: '2-digit', minute: '2-digit' }),
      temp: log.temperature ?? 28,
      humid: log.humidity ?? 65,
      light: log.light_intensity ?? 500,
    }));
  } catch (error) {
    return Array.from({ length: 15 }, (_, i) => ({
      time: `${10 + i}s trước`,
      temp: Number((27 + Math.random() * 3).toFixed(1)),
      humid: Number((60 + Math.random() * 5).toFixed(1)),
      light: Math.floor(400 + Math.random() * 200),
    }));
  }
};

// 3. GỬI LỆNH ĐIỀU KHIỂN
export const sendSafeCommand = async (deviceId: string, commandString: string): Promise<boolean> => {
  try {
    await axios.post(`/api/devices/${deviceId}/commands`, { command: commandString }, { timeout: 2000 });
    return true;
  } catch (error) {
    if (commandString === 'FAN_ON') mockState.fan_status = true;
    if (commandString === 'FAN_OFF') mockState.fan_status = false;
    if (commandString === 'LIGHT_ON') mockState.light_status = true;
    if (commandString === 'LIGHT_OFF') mockState.light_status = false;
    if (commandString === 'CURTAIN_OPEN') mockState.curtain_status = true;
    if (commandString === 'CURTAIN_CLOSE') mockState.curtain_status = false;
    return true;
  }
};