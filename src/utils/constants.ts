/**
 * 애플리케이션 전역 상수
 */

export const APP_CONFIG = {
  // 목업 모드 설정
  BLE_MOCK_MODE: false, // true: 목업 데이터 사용 | false: 실제 HC-06 연결
  VISION_MOCK_MODE: false, // true: 목업 비전 사용 | false: 실제 카메라 사용
  
  // HC-06 블루투스 클래식 설정
  // HC-06 모듈은 Bluetooth Classic (SPP)을 사용합니다
  // 아래 UUID는 BLE용이므로 HC-06에서는 사용되지 않습니다 (하위 호환성 유지)
  BLE_SERVICE_UUID: '0000ffe0-0000-1000-8000-00805f9b34fb',
  BLE_CHARACTERISTIC_UUID: '0000ffe1-0000-1000-8000-00805f9b34fb',
  BLE_SCAN_TIMEOUT: 10000, // 10초
  
  // 카메라 설정
  CAMERA_FPS: 15,
  CAMERA_RESOLUTION: {
    width: 1280,
    height: 720,
  },
  
  // YOLOv10 설정
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
  
  // 음성 안내 간격
  INFO_ANNOUNCEMENT_INTERVAL: 5000, // 5초
  WARNING_ANNOUNCEMENT_INTERVAL: 3000, // 3초
  EMERGENCY_ANNOUNCEMENT_INTERVAL: 1000, // 1초 (연속)
};

export const ALERT_MESSAGES = {
  RESIDUAL_HEAT: '버너에 열이 감지됩니다. 손을 올리지 마세요.',
  BLE_DISCONNECTED: '하드웨어 연결이 끊어졌습니다. 재연결을 시도합니다.',
};

export const BUTTON_NAMES: { [key: string]: string } = {
  power: '전원 버튼',
  up: '출력 증가 버튼',
  down: '출력 감소 버튼',
  timer: '타이머 버튼',
  lock: '잠금 버튼',
};

