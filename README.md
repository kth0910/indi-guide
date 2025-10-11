# IndiGuide - 시각장애인을 위한 인덕션 안전 조리 가이드

React Native로 개발된 시각장애인 및 저시력 사용자를 위한 인덕션 안전 조리 보조 애플리케이션입니다.

## 주요 기능

### 🔥 실시간 안전 모니터링
- 온도 센서를 통한 잔열 감지 및 경고
- 과열 감지 및 긴급 알림
- 무조작 시간 모니터링

### 👁️ AI 비전 인식
- **YOLOv8 온디바이스**: 손 감지 및 위치 추적
- **OCR**: 인덕션 디스플레이 읽기 (출력 단계, 타이머, H 아이콘)
- **ArUco 마커**: 자동 카메라 보정 및 호모그래피 변환

### 📱 접근성 우선
- **음성 안내 (TTS)**: 모든 상태와 경고를 음성으로 안내
- **진동 피드백**: 경보 레벨에 따른 차등 진동 패턴
- **큰 버튼**: 시각적 접근성을 고려한 UI 디자인
- **고대비 모드**: 저시력 사용자를 위한 옵션

### 🔗 하드웨어 연동
- **BLE 통신**: 온도 센서 및 LED 조명 제어
- **자동 LED 밝기 조정**: 환경 조명에 따른 자동 보정
- **센서 보정**: 얼음물-끓는물 2점 보정

## 프로젝트 구조

```
indi-guide/
├── src/
│   ├── types/              # TypeScript 타입 정의
│   │   └── index.ts
│   ├── store/              # 전역 상태 관리 (Zustand)
│   │   └── useAppStore.ts
│   ├── services/           # 핵심 서비스 모듈
│   │   ├── BLEService.ts         # BLE 통신
│   │   ├── VisionService.ts      # 카메라 및 AI 비전
│   │   ├── SafetyService.ts      # 안전 경보 시스템
│   │   └── AccessibilityService.ts # TTS 및 진동
│   ├── hooks/              # Custom Hooks
│   │   └── useVisionCamera.ts
│   ├── screens/            # 화면 컴포넌트
│   │   ├── HomeScreen.tsx        # 홈 화면
│   │   ├── CookingScreen.tsx     # 조리 모니터링 화면
│   │   ├── SettingsScreen.tsx    # 설정 화면
│   │   ├── LogsScreen.tsx        # 조리 기록
│   │   └── HelpScreen.tsx        # 도움말
│   ├── navigation/         # 네비게이션
│   │   └── AppNavigator.tsx
│   ├── utils/              # 유틸리티
│   │   └── constants.ts
│   └── App.tsx             # 메인 앱 컴포넌트
├── package.json
├── tsconfig.json
├── babel.config.js
└── metro.config.js
```

## 기술 스택

- **프레임워크**: Expo SDK 50 + React Native 0.73
- **언어**: TypeScript
- **상태 관리**: Zustand
- **네비게이션**: React Navigation 6
- **카메라**: react-native-vision-camera (Frame Processor 지원)
- **BLE**: react-native-ble-plx
- **TTS**: expo-speech
- **진동**: expo-haptics
- **AI/ML**: YOLOv8 (온디바이스, react-native-fast-tflite 또는 ONNX Runtime)

## 설치 방법

### 1. 필수 요구사항

- Node.js >= 18
- Expo CLI
- Android Studio 또는 Xcode (네이티브 빌드용)

### 2. 의존성 설치

```bash
# Expo CLI 설치 (전역)
npm install -g expo-cli

# 프로젝트 디렉토리로 이동
cd indi-guide

# 의존성 설치
npm install
```

### 3. 개발 서버 실행

#### Expo Go로 테스트 (추천)

```bash
# 개발 서버 시작
npm start

# QR 코드 스캔 후 Expo Go 앱에서 실행
```

**주의**: Expo Go는 일부 네이티브 모듈(react-native-vision-camera, react-native-ble-plx)을 지원하지 않으므로 전체 기능 테스트를 위해서는 개발 빌드가 필요합니다.

#### 개발 빌드 (전체 기능)

```bash
# 네이티브 프로젝트 생성
npx expo prebuild

# Android 실행
npm run android

# iOS 실행 (Mac만 가능)
npm run ios
```

### 4. 앱 아이콘 및 스플래시 이미지

`assets/` 폴더에 다음 파일들을 추가해야 합니다:

- `icon.png` (1024x1024) - 앱 아이콘
- `splash.png` (1284x2778) - 스플래시 화면
- `adaptive-icon.png` (1024x1024) - Android 적응형 아이콘
- `favicon.png` (48x48) - 웹용 파비콘

임시로 기본 이미지를 사용하려면:
```bash
# 기본 assets 자동 생성
npx expo prebuild --clean
```

### 5. 프로덕션 빌드

#### Android APK

```bash
# EAS Build 설치
npm install -g eas-cli

# EAS Build 설정
eas build:configure

# Android 빌드
eas build --platform android
```

#### iOS IPA

```bash
# iOS 빌드 (Apple Developer 계정 필요)
eas build --platform ios
```

## 주요 모듈 설명

### SafetyService
- 온도, OCR, 손 인식 데이터를 융합하여 안전 경보 생성
- 잔열, 과열, 무조작 시간 체크
- 경보 레벨에 따른 TTS 및 진동 자동 트리거

### VisionService
- ArUco/AprilTag 마커 감지 및 호모그래피 계산
- OCR로 디스플레이 읽기 (출력 단계, 타이머, H 아이콘)
- YOLOv8으로 손 감지 및 버튼/버너 위치 매칭
- LED 조명 자동 밝기 조정 계산

### BLEService
- 하드웨어 거치대와 BLE 통신
- 온도 센서 데이터 수신
- LED 밝기 조정 명령 전송
- 자동 재연결 처리

### AccessibilityService
- TTS 음성 안내 (큐 방식)
- 진동 패턴 차등 제어 (light, medium, strong)
- 접근성 설정 관리

## YOLOv8 온디바이스 통합 (TODO)

현재 VisionService에는 YOLOv8 추론을 위한 스켈레톤 구조가 구현되어 있습니다.
실제 통합을 위해서는 다음 중 하나를 선택하여 구현이 필요합니다:

### 옵션 1: react-native-fast-tflite

```bash
npm install react-native-fast-tflite
```

YOLOv8 모델을 TFLite로 변환 후 사용:

```typescript
import { TFLite } from 'react-native-fast-tflite';

const model = await TFLite.loadModel('yolov8n-hand.tflite');
const results = await model.detect(frame);
```

### 옵션 2: ONNX Runtime Mobile

```bash
npm install onnxruntime-react-native
```

YOLOv8 모델을 ONNX로 변환 후 사용.

## 하드웨어 거치대 프로토콜

### BLE 데이터 형식 (JSON)

**센서 → 앱 (Notify):**

```json
{
  "temperature": {
    "centerTemp": 85.5,
    "burners": {
      "FRONT_LEFT": 92.3,
      "FRONT_RIGHT": 0,
      "REAR_LEFT": 68.7,
      "REAR_RIGHT": 0
    },
    "ambientTemp": 23.5,
    "isOverheating": false,
    "timestamp": 1634567890123
  },
  "ledBrightness": 180
}
```

**앱 → 센서 (Write):**

```json
{
  "type": "led_brightness",
  "value": 200
}
```

```json
{
  "type": "calibrate",
  "data": {
    "ice": 0.5,
    "boiling": 99.8
  }
}
```

## 개발 로드맵

- [x] 기본 프로젝트 구조
- [x] 상태 관리 (Zustand)
- [x] BLE 통신 서비스
- [x] 접근성 서비스 (TTS, 진동)
- [x] 안전 경보 시스템
- [x] 기본 UI (홈, 조리, 설정, 기록, 도움말)
- [ ] YOLOv8 온디바이스 통합
- [ ] ArUco 마커 감지 (OpenCV)
- [ ] OCR 통합 (ML Kit 또는 Tesseract)
- [ ] 하드웨어 거치대 펌웨어 개발
- [ ] 실제 테스트 및 최적화
- [ ] UI/UX 디자인 개선
- [ ] 다국어 지원 (영어)

## 라이선스

이 프로젝트는 시각장애인의 안전한 조리를 돕기 위한 목적으로 개발되었습니다.

## 문의

기술 지원 및 문의: support@indiguide.com

