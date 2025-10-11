/**
 * 애플리케이션 전역 상수
 */

export const APP_CONFIG = {
  // 목업 모드 설정
  BLE_MOCK_MODE: true, // true로 설정하면 실제 블루투스 없이 테스트 가능
  VISION_MOCK_MODE: true, // true로 설정하면 실제 카메라 없이 테스트 가능
  
  // BLE 설정
  BLE_SERVICE_UUID: '0000ffe0-0000-1000-8000-00805f9b34fb',
  BLE_CHARACTERISTIC_UUID: '0000ffe1-0000-1000-8000-00805f9b34fb',
  BLE_SCAN_TIMEOUT: 10000, // 10초
  
  // 카메라 설정
  CAMERA_FPS: 15,
  CAMERA_RESOLUTION: {
    width: 1280,
    height: 720,
  },
  
  // YOLOv8 설정
  YOLO_MODEL_PATH: '../../assets/yolo_model.onnx',
  YOLO_INPUT_SIZE: 640,
  YOLO_CONFIDENCE_THRESHOLD: 0.5,
  YOLO_IOU_THRESHOLD: 0.45,
  YOLO_CLASS_NAMES: ['hand'], // 학습된 클래스 이름
  
  // OCR 설정
  OCR_CONFIDENCE_THRESHOLD: 0.8,
  OCR_UPDATE_INTERVAL: 1000, // 1Hz
  
  // 온도 모니터링
  TEMPERATURE_SAMPLE_INTERVAL: 500, // 0.5초
  TEMPERATURE_MOVING_AVERAGE_SAMPLES: 5,
  
  // 타이머
  SAFE_TEMP_DURATION: 60000, // 60초
  INACTIVITY_WARNING_TIME: 600000, // 10분
  
  // 음성 안내 간격
  INFO_ANNOUNCEMENT_INTERVAL: 5000, // 5초
  WARNING_ANNOUNCEMENT_INTERVAL: 3000, // 3초
  EMERGENCY_ANNOUNCEMENT_INTERVAL: 1000, // 1초 (연속)
};

export const BURNER_NAMES = {
  FRONT_LEFT: '좌측 전면 버너',
  FRONT_RIGHT: '우측 전면 버너',
  REAR_LEFT: '좌측 후면 버너',
  REAR_RIGHT: '우측 후면 버너',
};

export const ALERT_MESSAGES = {
  RESIDUAL_HEAT: (burner: string) => `${burner}에 잔열이 감지됩니다. 손을 올리지 마세요.`,
  OVERHEATING: (burner: string) => `${burner}가 과열되고 있습니다. 주의하세요.`,
  HAND_ON_BURNER: (burner: string) => `주의! 손이 ${burner} 위에 있습니다.`,
  INACTIVITY: '장시간 조작이 없습니다. 조리 상태를 확인하세요.',
  BLE_DISCONNECTED: '하드웨어 연결이 끊어졌습니다. 재연결을 시도합니다.',
  CAMERA_ERROR: '카메라가 기울어져 있습니다. 상판 중앙을 다시 맞춰주세요.',
  SENSOR_ERROR: '센서에 문제가 발생했습니다. 청소하거나 교체가 필요합니다.',
};

export const BUTTON_NAMES: { [key: string]: string } = {
  POWER: '전원 버튼',
  PLUS: '출력 증가 버튼',
  MINUS: '출력 감소 버튼',
  TIMER: '타이머 버튼',
  LOCK: '잠금 버튼',
};

