/**
 * HC-06 블루투스 클래식 통신 서비스
 * HC-06 모듈과 시리얼 통신 (SPP - Serial Port Profile)
 */

import RNBluetoothClassic, {
  BluetoothDevice,
  BluetoothEventSubscription,
} from 'react-native-bluetooth-classic';
import { SensorPacket, TemperatureData } from '@/types';
import { APP_CONFIG } from '@/utils/constants';

export class BluetoothClassicService {
  private static instance: BluetoothClassicService;
  private device?: BluetoothDevice;
  private isConnected: boolean = false;
  private reconnectTimer?: NodeJS.Timeout;
  private dataCallback?: (packet: SensorPacket) => void;
  private readSubscription?: BluetoothEventSubscription;

  // HC-06 기본 설정
  private readonly HC06_NAME_PREFIX = 'indiguide'; // 블루투스 모듈 이름
  private readonly BAUD_RATE = 9600; // HC-06 기본 보드레이트

  private constructor() {
    console.log('[BluetoothClassic] 서비스 생성됨');
  }

  static getInstance(): BluetoothClassicService {
    if (!BluetoothClassicService.instance) {
      BluetoothClassicService.instance = new BluetoothClassicService();
    }
    return BluetoothClassicService.instance;
  }

  /**
   * 블루투스 초기화 및 권한 확인
   */
  async initialize(): Promise<boolean> {
    try {
      // 블루투스 활성화 확인
      const enabled = await RNBluetoothClassic.isBluetoothEnabled();
      if (!enabled) {
        console.warn('[BluetoothClassic] 블루투스가 꺼져 있습니다.');
        
        // 블루투스 활성화 요청
        try {
          await RNBluetoothClassic.requestBluetoothEnabled();
          console.log('[BluetoothClassic] 블루투스 활성화됨');
          return true;
        } catch (error) {
          console.error('[BluetoothClassic] 블루투스 활성화 거부됨:', error);
          return false;
        }
      }
      
      console.log('[BluetoothClassic] 블루투스 초기화 성공');
      return true;
    } catch (error) {
      console.error('[BluetoothClassic] 초기화 실패:', error);
      return false;
    }
  }

  /**
   * 페어링된 디바이스 목록 가져오기
   */
  async getPairedDevices(): Promise<BluetoothDevice[]> {
    try {
      const devices = await RNBluetoothClassic.getBondedDevices();
      console.log('[BluetoothClassic] 페어링된 디바이스:', devices.length);
      devices.forEach((device, index) => {
        console.log(`  ${index + 1}. ${device.name} (${device.address})`);
      });
      return devices;
    } catch (error) {
      console.error('[BluetoothClassic] 페어링된 디바이스 조회 실패:', error);
      return [];
    }
  }

  /**
   * HC-06 디바이스 검색 및 연결
   */
  async scanAndConnect(
    onDeviceFound?: (name: string) => void
  ): Promise<boolean> {
    try {
      console.log('[BluetoothClassic] indiguide 디바이스 검색 중...');

      // 먼저 페어링된 디바이스에서 indiguide 찾기
      const bondedDevices = await this.getPairedDevices();
      const indiguideDevice = bondedDevices.find(
        (device) =>
          device.name?.toLowerCase().includes(this.HC06_NAME_PREFIX.toLowerCase())
      );

      if (indiguideDevice) {
        console.log('[BluetoothClassic] 페어링된 indiguide 발견:', indiguideDevice.name);
        if (onDeviceFound && indiguideDevice.name) {
          onDeviceFound(indiguideDevice.name);
        }
        return await this.connect(indiguideDevice);
      }

      // 페어링된 디바이스에 없으면 새로 검색
      console.log('[BluetoothClassic] 페어링된 indiguide가 없습니다. 새로운 디바이스 검색 시작...');
      
      const devices = await RNBluetoothClassic.startDiscovery();
      console.log('[BluetoothClassic] 발견된 디바이스:', devices.length);

      const foundIndiguide = devices.find(
        (device) =>
          device.name?.toLowerCase().includes(this.HC06_NAME_PREFIX.toLowerCase())
      );

      if (foundIndiguide) {
        console.log('[BluetoothClassic] indiguide 발견:', foundIndiguide.name);
        if (onDeviceFound && foundIndiguide.name) {
          onDeviceFound(foundIndiguide.name);
        }
        
        // 먼저 페어링 시도
        console.log('[BluetoothClassic] 페어링 시도 중...');
        // 참고: 페어링은 사용자가 시스템 설정에서 미리 해야 할 수도 있습니다
        
        return await this.connect(foundIndiguide);
      }

      console.warn('[BluetoothClassic] indiguide 디바이스를 찾을 수 없습니다.');
      return false;
    } catch (error) {
      console.error('[BluetoothClassic] 검색 실패:', error);
      return false;
    }
  }

  /**
   * 특정 주소로 디바이스 연결
   */
  async connectByAddress(address: string): Promise<boolean> {
    try {
      const devices = await RNBluetoothClassic.getBondedDevices();
      const device = devices.find((d) => d.address === address);

      if (!device) {
        console.error('[BluetoothClassic] 해당 주소의 디바이스를 찾을 수 없습니다:', address);
        return false;
      }

      return await this.connect(device);
    } catch (error) {
      console.error('[BluetoothClassic] 주소로 연결 실패:', error);
      return false;
    }
  }

  /**
   * 디바이스 연결
   */
  private async connect(device: BluetoothDevice): Promise<boolean> {
    try {
      console.log('[BluetoothClassic] 연결 시도:', device.name, device.address);

      // 이미 연결된 경우 먼저 해제
      if (this.device && this.isConnected) {
        await this.disconnect();
      }

      // 연결 시도
      const connected = await device.connect({
        // delimiter: '\n', // 줄바꿈으로 데이터 구분 (필요시 설정)
        // DELIMITER: '\n',
      });

      if (connected) {
        this.device = device;
        this.isConnected = true;
        console.log('[BluetoothClassic] 연결 성공:', device.name);

        // 데이터 수신 리스너 등록
        this.startListening();

        return true;
      } else {
        console.error('[BluetoothClassic] 연결 실패');
        return false;
      }
    } catch (error) {
      console.error('[BluetoothClassic] 연결 에러:', error);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * 데이터 수신 시작
   */
  private startListening(): void {
    if (!this.device) {
      return;
    }

    try {
      console.log('[BluetoothClassic] 데이터 수신 리스너 등록 중...');
      
      // 읽기 이벤트 구독
      this.readSubscription = this.device.onDataReceived((data) => {
        try {
          const receivedData = data.data;
          console.log('[BluetoothClassic] 📥 원본 데이터 수신:', receivedData);
          console.log('[BluetoothClassic] 데이터 타입:', typeof receivedData);
          console.log('[BluetoothClassic] 데이터 길이:', receivedData?.length);

          // 데이터 파싱
          const packet = this.parseData(receivedData);
          if (packet) {
            console.log('[BluetoothClassic] ✅ 파싱 성공:', JSON.stringify(packet));
            if (this.dataCallback) {
              console.log('[BluetoothClassic] 📤 콜백 호출');
              this.dataCallback(packet);
            }
            // 콜백이 없을 때는 조용히 무시 (HomeScreen에서는 정상)
          } else {
            console.warn('[BluetoothClassic] ⚠️ 파싱 실패 - packet is null');
          }
        } catch (error) {
          console.error('[BluetoothClassic] 데이터 처리 에러:', error);
        }
      });

      console.log('[BluetoothClassic] ✅ 데이터 수신 리스너 등록 완료');
    } catch (error) {
      console.error('[BluetoothClassic] ❌ 리스너 등록 실패:', error);
    }
  }

  /**
   * 수신 데이터 파싱
   * 프로토콜에 맞게 수정 필요
   */
  private parseData(data: string): SensorPacket | null {
    console.log('[BluetoothClassic] 파싱 시작, 원본 데이터:', data);
    
    try {
      // JSON 형식으로 데이터가 오는 경우
      // 예: {"temp": 25.5, "burners": {"FL": 80, "FR": 60, "RL": 40, "RR": 30}}
      // 또는: {"temp": 35.5, "state": "safe"}
      // 또는: {"temp": 75.0, "state": "hot"}
      console.log('[BluetoothClassic] JSON 파싱 시도...');
      const jsonData = JSON.parse(data);
      console.log('[BluetoothClassic] JSON 파싱 성공:', jsonData);

      const packet: SensorPacket = {
        temperature: {
          timestamp: Date.now(),
          centerTemp: jsonData.temp || jsonData.temperature || 0,
          burners: {
            FRONT_LEFT: jsonData.burners?.FL || jsonData.temp || 0,
            FRONT_RIGHT: jsonData.burners?.FR || 0,
            REAR_LEFT: jsonData.burners?.RL || 0,
            REAR_RIGHT: jsonData.burners?.RR || 0,
          },
          ambientTemp: jsonData.ambient || 20,
          isOverheating: (jsonData.temp || 0) >= 100,
          state: jsonData.state || undefined, // Arduino에서 전송한 state 사용
        },
        ledBrightness: jsonData.led || 128,
        timestamp: Date.now(),
      };

      console.log('[BluetoothClassic] 패킷 생성 완료 (state:', packet.temperature.state, '):', packet);
      return packet;
    } catch (error) {
      console.log('[BluetoothClassic] JSON 파싱 실패, 커스텀 프로토콜 시도...');
      
      // JSON 파싱 실패 시 커스텀 프로토콜 파싱
      // 예: "T:25.5;STATE:safe" 또는 "TEMP:25.5,FL:80,FR:60"
      try {
        // `;` 또는 `,`로 구분된 데이터 처리
        const separator = data.includes(';') ? ';' : ',';
        const parts = data.split(separator);
        const values: { [key: string]: number } = {};
        
        parts.forEach((part) => {
          const [key, value] = part.split(':');
          if (key && value) {
            const numValue = parseFloat(value.trim());
            if (!isNaN(numValue)) {
              values[key.trim()] = numValue;
            }
          }
        });

        console.log('[BluetoothClassic] 커스텀 프로토콜 파싱 결과:', values);

        // 온도 값 추출 (T, TEMP, temp 모두 지원)
        const temp = values['T'] || values['TEMP'] || values['temp'] || 0;
        
        // STATE 파싱 (STATE:safe 또는 STATE:hot)
        let state: 'safe' | 'hot' | undefined = undefined;
        const stateStr = data.match(/STATE:(\w+)/i)?.[1]?.toLowerCase();
        if (stateStr === 'safe' || stateStr === 'hot') {
          state = stateStr;
        }
        
        console.log('[BluetoothClassic] 온도:', temp, '/ state:', state);
        
        const packet: SensorPacket = {
          temperature: {
            timestamp: Date.now(),
            centerTemp: temp,
            burners: {
              FRONT_LEFT: values['FL'] || temp,
              FRONT_RIGHT: values['FR'] || 0,
              REAR_LEFT: values['RL'] || 0,
              REAR_RIGHT: values['RR'] || 0,
            },
            ambientTemp: values['AMB'] || 20,
            isOverheating: temp >= 100,
            state: state, // Arduino에서 전송한 state 사용
          },
          ledBrightness: values['LED'] || 128,
          timestamp: Date.now(),
        };

        console.log('[BluetoothClassic] 커스텀 패킷 생성 완료 (state:', state, '):', packet);
        return packet;
      } catch (parseError) {
        console.error('[BluetoothClassic] ❌ 모든 파싱 실패:', parseError);
        console.error('[BluetoothClassic] 원본 데이터:', data);
        return null;
      }
    }
  }

  /**
   * 데이터 전송
   */
  async sendData(data: string): Promise<boolean> {
    if (!this.isConnected || !this.device) {
      console.warn('[BluetoothClassic] 연결되지 않음');
      return false;
    }

    try{
      const result = await this.device.write(data);
      console.log('[BluetoothClassic] 데이터 전송 성공:', data);
      return result;
    } catch (error) {
      console.error('[BluetoothClassic] 데이터 전송 실패:', error);
      return false;
    }
  }

  /**
   * LED 밝기 조정 명령 전송
   */
  async setLedBrightness(brightness: number): Promise<boolean> {
    const normalizedBrightness = Math.max(0, Math.min(255, brightness));
    
    // JSON 형식으로 전송
    const command = JSON.stringify({
      type: 'led',
      value: normalizedBrightness,
    });

    // 또는 간단한 문자열 형식
    // const command = `LED:${normalizedBrightness}\n`;

    return await this.sendData(command);
  }

  /**
   * 센서 보정 명령 전송
   */
  async calibrateSensor(calibrationData: { ice: number; boiling: number }): Promise<boolean> {
    const command = JSON.stringify({
      type: 'calibrate',
      data: calibrationData,
    });

    return await this.sendData(command);
  }

  /**
   * 데이터 콜백 등록
   */
  onDataReceived(callback: (packet: SensorPacket) => void): void {
    this.dataCallback = callback;
  }

  /**
   * 연결 상태 확인
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * 연결된 디바이스 정보
   */
  getConnectedDevice(): BluetoothDevice | undefined {
    return this.device;
  }


  /**
   * 재연결 시도
   */
  private async attemptReconnect(): Promise<void> {
    if (this.reconnectTimer || !this.device) {
      return;
    }

    console.log('[BluetoothClassic] 재연결 타이머 시작');
    
    this.reconnectTimer = setInterval(async () => {
      if (!this.device) {
        return;
      }

      console.log('[BluetoothClassic] 재연결 시도...');
      
      try {
        const connected = await this.device.connect();
        if (connected) {
          this.isConnected = true;
          console.log('[BluetoothClassic] 재연결 성공');
          
          if (this.reconnectTimer) {
            clearInterval(this.reconnectTimer);
            this.reconnectTimer = undefined;
          }
          
          this.startListening();
        }
      } catch (error) {
        console.error('[BluetoothClassic] 재연결 실패:', error);
      }
    }, 5000); // 5초마다 재시도
  }

  /**
   * 연결 해제
   */
  async disconnect(): Promise<void> {
    if (this.reconnectTimer) {
      clearInterval(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }

    if (this.readSubscription) {
      this.readSubscription.remove();
      this.readSubscription = undefined;
    }

    if (this.device && this.isConnected) {
      try {
        await this.device.disconnect();
        this.isConnected = false;
        console.log('[BluetoothClassic] 연결 해제');
      } catch (error) {
        console.error('[BluetoothClassic] 연결 해제 실패:', error);
      }
    }
  }

  /**
   * 정리
   */
  cleanup(): void {
    if (this.reconnectTimer) {
      clearInterval(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }

    this.disconnect();
    this.dataCallback = undefined;
  }
}

