# Expo 프로젝트 설정 가이드

이 프로젝트는 Expo SDK 50을 사용하는 React Native 애플리케이션입니다.

## 빠른 시작

### 1. 개발 환경 설정

```bash
# Node.js 18 이상이 설치되어 있는지 확인
node --version

# Expo CLI 설치
npm install -g expo-cli

# 프로젝트 의존성 설치
cd indi-guide
npm install
```

### 2. 개발 서버 실행

```bash
# Expo 개발 서버 시작
npm start
```

실행 후 터미널에 QR 코드가 표시됩니다.

### 3. 앱 실행 방법

#### 옵션 A: Expo Go (간단한 테스트용)

1. 모바일 기기에 [Expo Go](https://expo.dev/client) 앱 설치
2. QR 코드 스캔
3. 앱 실행

**제한사항**: react-native-vision-camera, react-native-ble-plx 등의 커스텀 네이티브 모듈이 작동하지 않습니다.

#### 옵션 B: 개발 빌드 (전체 기능)

전체 기능을 테스트하려면 개발 빌드를 생성해야 합니다:

```bash
# 네이티브 프로젝트 생성 (android/, ios/ 폴더 생성)
npx expo prebuild

# Android에서 실행
npm run android

# iOS에서 실행 (Mac만 가능)
npm run ios
```

## 주요 명령어

```bash
# 개발 서버 시작
npm start

# Android 실행
npm run android

# iOS 실행
npm run ios

# 웹에서 실행
npm run web

# 의존성 업데이트
npx expo install --check

# 캐시 초기화
npx expo start -c
```

## Assets 설정

`assets/` 폴더에 다음 파일들이 필요합니다:

- `icon.png` (1024x1024) - 앱 아이콘
- `splash.png` (1284x2778) - 스플래시 화면
- `adaptive-icon.png` (1024x1024) - Android 적응형 아이콘
- `favicon.png` (48x48) - 웹용 파비콘

임시 이미지를 사용하려면:
```bash
npx expo prebuild --clean
```

## 빌드 설정

### EAS Build (권장)

```bash
# EAS CLI 설치
npm install -g eas-cli

# EAS 계정 로그인
eas login

# 빌드 설정 초기화
eas build:configure

# Android 빌드
eas build --platform android --profile preview

# iOS 빌드
eas build --platform ios --profile preview
```

### 로컬 빌드

#### Android APK

```bash
# 개발 APK 생성
cd android
./gradlew assembleRelease
```

APK 위치: `android/app/build/outputs/apk/release/app-release.apk`

#### iOS IPA

```bash
# Xcode에서 Archive 생성
# Xcode 열기
open ios/IndiGuide.xcworkspace
```

Xcode에서 Product → Archive 선택

## 문제 해결

### Metro bundler 캐시 이슈

```bash
npx expo start -c
```

### 의존성 버전 충돌

```bash
npm install --legacy-peer-deps
```

### Android 빌드 실패

```bash
cd android
./gradlew clean
cd ..
npx expo prebuild --clean
```

### iOS 빌드 실패

```bash
cd ios
pod deintegrate
pod install
cd ..
npx expo prebuild --clean
```

## 네이티브 모듈 권한

### Android (app.json에 설정됨)

- CAMERA
- BLUETOOTH
- BLUETOOTH_ADMIN
- BLUETOOTH_CONNECT
- BLUETOOTH_SCAN
- ACCESS_FINE_LOCATION
- VIBRATE

### iOS (app.json에 설정됨)

- NSCameraUsageDescription
- NSBluetoothAlwaysUsageDescription
- NSBluetoothPeripheralUsageDescription

## 개발 팁

1. **Fast Refresh**: 코드 변경 시 자동 새로고침
2. **개발자 메뉴**: 
   - Android: `Ctrl + M` 또는 기기 흔들기
   - iOS: `Cmd + D` 또는 기기 흔들기
3. **Remote Debugging**: Chrome DevTools 사용 가능
4. **React DevTools**: 컴포넌트 트리 검사

## 참고 문서

- [Expo 공식 문서](https://docs.expo.dev/)
- [React Native 공식 문서](https://reactnative.dev/)
- [EAS Build 문서](https://docs.expo.dev/build/introduction/)
- [Config Plugins](https://docs.expo.dev/guides/config-plugins/)

