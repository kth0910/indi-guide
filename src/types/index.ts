/**
 * 시스템 전반의 타입 정의
 */

// 조리 상태
export enum CookingState {
  IDLE = 'IDLE',                    // 대기
  PRE_CHECK = 'PRE_CHECK',          // 시작 전 점검
  COOKING = 'COOKING',              // 조리 중
  RESIDUAL_HEAT = 'RESIDUAL_HEAT',  // 잔열 관리
}

// 안전 경보 레벨
export enum AlertLevel {
  INFO = 'INFO',          // 1단계: 정보 안내
  WARNING = 'WARNING',    // 2단계: 주의
  EMERGENCY = 'EMERGENCY', // 3단계: 긴급
}

// 버너 위치
export enum BurnerPosition {
  FRONT_LEFT = 'FRONT_LEFT',      // 좌측 전면
  FRONT_RIGHT = 'FRONT_RIGHT',    // 우측 전면
  REAR_LEFT = 'REAR_LEFT',        // 좌측 후면
  REAR_RIGHT = 'REAR_RIGHT',      // 우측 후면
}

// 버너 상태
export interface BurnerState {
  position: BurnerPosition;
  temperature: number;              // 온도 (°C)
  powerLevel: number;               // 출력 단계 (0-9)
  isActive: boolean;                // 가열 중 여부
  hasResidualHeat: boolean;         // 잔열 있음
  timerRemaining?: number;          // 타이머 남은 시간 (초)
}

// 온도 센서 데이터
export interface TemperatureData {
  timestamp: number;
  centerTemp: number;               // 중앙 온도
  burners: {
    [key in BurnerPosition]?: number;
  };
  ambientTemp: number;              // 주변온
  isOverheating: boolean;           // 과열 여부
}

// OCR 인식 결과
export interface OCRResult {
  powerLevel?: number;              // 출력 단계
  timerMinutes?: number;            // 타이머 (분)
  hasResidualHeatIcon: boolean;     // 'H' 아이콘 감지
  confidence: number;               // 신뢰도 (0-1)
  timestamp: number;
}

// YOLO 감지 결과 (버튼 감지)
export interface YOLODetection {
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
    centerX: number;
    centerY: number;
  };
  confidence: number;
  class: number;
  className: string;
}

// 손 인식 결과 (실제로는 버튼 감지)
export interface HandDetection {
  detected: boolean;
  position?: {
    x: number;
    y: number;
  };
  bbox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence?: number;              // 검출 신뢰도
  onButton?: string;                // 버튼 위 여부 (버튼 이름)
  onBurner?: BurnerPosition;        // 버너 위 여부
  timestamp: number;
  allDetections?: YOLODetection[];  // 감지된 모든 버튼 정보
}

// 마커 인식 및 포즈 품질
export interface PoseQuality {
  detected: boolean;
  markerCount: number;              // 감지된 마커 수
  reprojectionError: number;        // 리프로젝션 에러 (px)
  status: 'OK' | 'WARNING' | 'FAIL'; // 포즈 품질
  timestamp: number;
}

// 비전 인식 결과 (통합)
export interface VisionResult {
  ocr: OCRResult;
  hand: HandDetection;
  pose: PoseQuality;
  brightness: number;               // 영상 밝기 (히스토그램 중앙값)
}

// BLE 센서 패킷
export interface SensorPacket {
  temperature: TemperatureData;
  ledBrightness: number;            // LED 조명 밝기 (0-255)
  timestamp: number;
}

// 안전 경보
export interface SafetyAlert {
  level: AlertLevel;
  message: string;
  burner?: BurnerPosition;
  timestamp: number;
  autoResolve?: boolean;            // 자동 해제 여부
}

// 애플리케이션 상태
export interface AppState {
  cookingState: CookingState;
  burners: BurnerState[];
  currentAlerts: SafetyAlert[];
  bleConnected: boolean;
  cameraReady: boolean;
  sessionStartTime?: number;
  logs: CookingLog[];
}

// 조리 로그
export interface CookingLog {
  sessionId: string;
  startTime: number;
  endTime?: number;
  maxTemperature: number;
  alerts: SafetyAlert[];
  burnerUsage: {
    burner: BurnerPosition;
    totalTime: number;
    maxPowerLevel: number;
  }[];
}

// 접근성 설정
export interface AccessibilitySettings {
  ttsEnabled: boolean;
  ttsLanguage: 'ko' | 'en';
  ttsSpeed: number;                 // 0.5 - 2.0
  vibrationEnabled: boolean;
  vibrationIntensity: 'light' | 'medium' | 'strong';
  largeButtons: boolean;
  highContrast: boolean;
}

// 설정 (온도 임계값 등)
export interface SystemConfig {
  residualHeatThreshold: number;    // 잔열 경고 온도 (기본: 60°C)
  safeTemperature: number;          // 안전 온도 (기본: 45°C)
  overheatingThreshold: number;     // 과열 의심 온도 (기본: 300°C)
  ocrConfidenceThreshold: number;   // OCR 신뢰도 임계값 (기본: 0.8)
  poseErrorThreshold: number;       // 포즈 에러 임계값 (기본: 1.5px)
  inactivityWarningTime: number;    // 무조작 경고 시간 (초, 기본: 600)
}

