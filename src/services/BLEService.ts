/**
 * BLE 통신 서비스
 * 하드웨어 거치대(온도 센서, LED 조명)와 통신
 */

import { BleManager, Device, Characteristic } from 'react-native-ble-plx';
import { SensorPacket, TemperatureData, BurnerPosition } from '@/types';
import { APP_CONFIG } from '@/utils/constants';

export class BLEService {
  private static instance: BLEService;
  private manager: BleManager;
  private device?: Device;
  private isConnected: boolean = false;
  private reconnectTimer?: NodeJS.Timeout;
  private dataCallback?: (packet: SensorPacket) => void;
  private mockDataTimer?: NodeJS.Timeout;
  private isMockMode: boolean = APP_CONFIG.BLE_MOCK_MODE;

  private constructor() {
    this.manager = new BleManager();
  }

  static getInstance(): BLEService {
    if (!BLEService.instance) {
      BLEService.instance = new BLEService();
    }
    return BLEService.instance;
  }

  /**
   * BLE 초기화 및 권한 확인
   */
  async initialize(): Promise<boolean> {
    // 목업 모드인 경우 즉시 성공 반환
    if (this.isMockMode) {
      console.log('[MOCK] BLE 초기화 성공 (목업 모드)');
      return true;
    }

    try {
      const state = await this.manager.state();
      if (state !== 'PoweredOn') {
        console.warn('Bluetooth가 꺼져 있습니다.');
        return false;
      }
      return true;
    } catch (error) {
      console.error('BLE 초기화 실패:', error);
      return false;
    }
  }

  /**
   * 디바이스 스캔 및 연결
   */
  async scanAndConnect(
    onDeviceFound?: (name: string) => void,
    timeout: number = APP_CONFIG.BLE_SCAN_TIMEOUT
  ): Promise<boolean> {
    // 목업 모드인 경우 가상 연결
    if (this.isMockMode) {
      return new Promise((resolve) => {
        setTimeout(() => {
          console.log('[MOCK] 가상 IndiGuide 디바이스 발견');
          if (onDeviceFound) {
            onDeviceFound('IndiGuide-Mock-Device');
          }
          this.isConnected = true;
          this.startMockDataStream();
          console.log('[MOCK] BLE 연결 성공 (목업 모드)');
          resolve(true);
        }, 1000); // 1초 지연으로 실제 스캔처럼 시뮬레이션
      });
    }

    return new Promise((resolve) => {
      const scanTimeout = setTimeout(() => {
        this.manager.stopDeviceScan();
        console.warn('BLE 스캔 타임아웃');
        resolve(false);
      }, timeout);

      this.manager.startDeviceScan(
        null,
        null,
        async (error, device) => {
          if (error) {
            console.error('BLE 스캔 에러:', error);
            clearTimeout(scanTimeout);
            resolve(false);
            return;
          }

          // IndiGuide 디바이스 찾기 (이름 또는 서비스 UUID로 필터링)
          if (
            device &&
            (device.name?.includes('IndiGuide') ||
              device.serviceUUIDs?.includes(APP_CONFIG.BLE_SERVICE_UUID))
          ) {
            this.manager.stopDeviceScan();
            clearTimeout(scanTimeout);

            if (onDeviceFound && device.name) {
              onDeviceFound(device.name);
            }

            // 연결 시도
            const connected = await this.connect(device);
            resolve(connected);
          }
        }
      );
    });
  }

  /**
   * 특정 디바이스에 연결
   */
  private async connect(device: Device): Promise<boolean> {
    try {
      console.log('BLE 연결 시도:', device.name);
      
      this.device = await device.connect();
      this.device = await this.device.discoverAllServicesAndCharacteristics();
      
      this.isConnected = true;
      console.log('BLE 연결 성공');

      // 연결 해제 모니터링
      this.device.onDisconnected(() => {
        console.warn('BLE 연결 끊김');
        this.isConnected = false;
        this.attemptReconnect();
      });

      // 데이터 수신 시작
      this.startMonitoring();
      
      return true;
    } catch (error) {
      console.error('BLE 연결 실패:', error);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * 재연결 시도
   */
  private attemptReconnect(): void {
    if (this.reconnectTimer) {
      return;
    }

    this.reconnectTimer = setInterval(async () => {
      console.log('BLE 재연결 시도...');
      
      if (this.device) {
        try {
          const connected = await this.device.connect();
          if (connected) {
            this.isConnected = true;
            console.log('BLE 재연결 성공');
            
            if (this.reconnectTimer) {
              clearInterval(this.reconnectTimer);
              this.reconnectTimer = undefined;
            }
            
            this.startMonitoring();
          }
        } catch (error) {
          console.error('재연결 실패:', error);
        }
      }
    }, 5000); // 5초마다 재시도
  }

  /**
   * 센서 데이터 수신 시작
   */
  private async startMonitoring(): Promise<void> {
    if (!this.device) {
      return;
    }

    try {
      // Characteristic 구독
      this.device.monitorCharacteristicForService(
        APP_CONFIG.BLE_SERVICE_UUID,
        APP_CONFIG.BLE_CHARACTERISTIC_UUID,
        (error, characteristic) => {
          if (error) {
            console.error('데이터 수신 에러:', error);
            return;
          }

          if (characteristic?.value) {
            const packet = this.parseData(characteristic);
            if (packet && this.dataCallback) {
              this.dataCallback(packet);
            }
          }
        }
      );
    } catch (error) {
      console.error('모니터링 시작 실패:', error);
    }
  }

  /**
   * 목업 데이터 스트림 시작
   */
  private startMockDataStream(): void {
    if (this.mockDataTimer) {
      clearInterval(this.mockDataTimer);
    }

    // 주기적으로 가상 센서 데이터 생성
    this.mockDataTimer = setInterval(() => {
      try {
        if (!this.isConnected || !this.dataCallback) {
          return;
        }

        const now = Date.now();
        const mockPacket: SensorPacket = {
          temperature: {
            timestamp: now,
            centerTemp: this.generateMockTemperature(20, 80),
            burners: {
              FRONT_LEFT: this.generateMockTemperature(20, 100),
              FRONT_RIGHT: this.generateMockTemperature(20, 80),
              REAR_LEFT: this.generateMockTemperature(20, 60),
              REAR_RIGHT: this.generateMockTemperature(20, 40),
            },
            ambientTemp: this.generateMockTemperature(18, 25),
            isOverheating: false,
          },
          ledBrightness: 128,
          timestamp: now,
        };

        // console.log('[MOCK] 가상 센서 데이터 생성:', mockPacket);
        this.dataCallback(mockPacket);
      } catch (error) {
        console.error('[MOCK] BLE 데이터 생성 에러:', error);
      }
    }, APP_CONFIG.TEMPERATURE_SAMPLE_INTERVAL);
  }

  /**
   * 목업 온도 생성 (랜덤 + 점진적 변화)
   */
  private generateMockTemperature(min: number, max: number): number {
    // 실제 온도 변화처럼 보이도록 랜덤 변화량 추가
    const baseTemp = min + Math.random() * (max - min);
    const variation = (Math.random() - 0.5) * 5; // ±2.5도 변동
    return Math.max(min, Math.min(max, baseTemp + variation));
  }

  /**
   * 수신 데이터 파싱
   */
  private parseData(characteristic: Characteristic): SensorPacket | null {
    try {
      if (!characteristic.value) {
        return null;
      }

      // Base64 디코드 및 JSON 파싱
      const decodedData = Buffer.from(characteristic.value, 'base64').toString('utf-8');
      const data = JSON.parse(decodedData);

      const packet: SensorPacket = {
        temperature: data.temperature as TemperatureData,
        ledBrightness: data.ledBrightness || 0,
        timestamp: Date.now(),
      };

      return packet;
    } catch (error) {
      console.error('데이터 파싱 실패:', error);
      return null;
    }
  }

  /**
   * 데이터 콜백 등록
   */
  onDataReceived(callback: (packet: SensorPacket) => void): void {
    this.dataCallback = callback;
  }

  /**
   * LED 밝기 조정 명령 전송
   */
  async setLedBrightness(brightness: number): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    // 목업 모드인 경우 시뮬레이션
    if (this.isMockMode) {
      const normalizedBrightness = Math.max(0, Math.min(255, brightness));
      console.log(`[MOCK] LED 밝기 조정: ${normalizedBrightness}`);
      return true;
    }

    if (!this.device) {
      return false;
    }

    try {
      const command = JSON.stringify({
        type: 'led_brightness',
        value: Math.max(0, Math.min(255, brightness)),
      });

      const encodedCommand = Buffer.from(command, 'utf-8').toString('base64');

      await this.device.writeCharacteristicWithResponseForService(
        APP_CONFIG.BLE_SERVICE_UUID,
        APP_CONFIG.BLE_CHARACTERISTIC_UUID,
        encodedCommand
      );

      return true;
    } catch (error) {
      console.error('LED 밝기 조정 실패:', error);
      return false;
    }
  }

  /**
   * 센서 보정 명령 전송
   */
  async calibrateSensor(calibrationData: { ice: number; boiling: number }): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    // 목업 모드인 경우 시뮬레이션
    if (this.isMockMode) {
      console.log('[MOCK] 센서 보정:', calibrationData);
      return true;
    }

    if (!this.device) {
      return false;
    }

    try {
      const command = JSON.stringify({
        type: 'calibrate',
        data: calibrationData,
      });

      const encodedCommand = Buffer.from(command, 'utf-8').toString('base64');

      await this.device.writeCharacteristicWithResponseForService(
        APP_CONFIG.BLE_SERVICE_UUID,
        APP_CONFIG.BLE_CHARACTERISTIC_UUID,
        encodedCommand
      );

      return true;
    } catch (error) {
      console.error('센서 보정 실패:', error);
      return false;
    }
  }

  /**
   * 연결 상태 확인
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * 연결 해제
   */
  async disconnect(): Promise<void> {
    if (this.reconnectTimer) {
      clearInterval(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }

    if (this.mockDataTimer) {
      clearInterval(this.mockDataTimer);
      this.mockDataTimer = undefined;
    }

    // 목업 모드인 경우
    if (this.isMockMode) {
      this.isConnected = false;
      console.log('[MOCK] BLE 연결 해제 (목업 모드)');
      return;
    }

    if (this.device && this.isConnected) {
      try {
        await this.device.cancelConnection();
        this.isConnected = false;
        console.log('BLE 연결 해제');
      } catch (error) {
        console.error('연결 해제 실패:', error);
      }
    }
  }

  /**
   * 정리
   */
  cleanup(): void {
    if (this.mockDataTimer) {
      clearInterval(this.mockDataTimer);
      this.mockDataTimer = undefined;
    }
    this.disconnect();
    this.dataCallback = undefined;
  }

  /**
   * 목업 모드 전환
   */
  setMockMode(enabled: boolean): void {
    this.isMockMode = enabled;
    console.log(`[BLE] 목업 모드 ${enabled ? '활성화' : '비활성화'}`);
  }

  /**
   * 현재 목업 모드 상태 확인
   */
  isMock(): boolean {
    return this.isMockMode;
  }
}

