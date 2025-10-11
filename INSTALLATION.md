# 설치 가이드

## 개발 환경 설정

### 1. Node.js 및 패키지 매니저

```bash
# Node.js 18 이상 설치
node --version  # v18.0.0 이상 확인

# 프로젝트 클론 후 의존성 설치
cd indi-guide
npm install
```

### 2. Android 개발 환경

#### 필수 요구사항
- Android Studio
- Android SDK (API Level 24 이상)
- JDK 11 이상

#### 환경 변수 설정

**Windows (PowerShell):**
```powershell
$env:ANDROID_HOME="C:\Users\YOUR_USERNAME\AppData\Local\Android\Sdk"
$env:Path += ";$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\tools"
```

**macOS/Linux:**
```bash
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/tools
```

#### Android 프로젝트 설정

1. **android/app/build.gradle** 확인:
```gradle
android {
    compileSdkVersion 34
    
    defaultConfig {
        applicationId "com.indiguide"
        minSdkVersion 24
        targetSdkVersion 34
    }
}
```

2. **android/app/src/main/AndroidManifest.xml** 권한 추가:
```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.BLUETOOTH" />
    <uses-permission android:name="android.permission.BLUETOOTH_ADMIN" />
    <uses-permission android:name="android.permission.BLUETOOTH_SCAN" 
                     android:usesPermissionFlags="neverForLocation" />
    <uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
</manifest>
```

#### 실행

```bash
# Android 에뮬레이터 또는 실제 기기 연결 후
npm run android
```

### 3. iOS 개발 환경 (macOS만 해당)

#### 필수 요구사항
- macOS
- Xcode 14 이상
- CocoaPods

#### CocoaPods 설치

```bash
sudo gem install cocoapods
```

#### iOS 프로젝트 설정

1. **ios/Podfile** 확인:
```ruby
require_relative '../node_modules/react-native/scripts/react_native_pods'
require_relative '../node_modules/@react-native-community/cli-platform-ios/native_modules'

platform :ios, '13.0'

target 'IndiGuide' do
  config = use_native_modules!
  use_react_native!(
    :path => config[:reactNativePath],
    :hermes_enabled => true,
  )
  
  # Permissions
  permissions_path = '../node_modules/react-native-permissions/ios'
  pod 'Permission-Camera', :path => "#{permissions_path}/Camera"
  pod 'Permission-BluetoothPeripheral', :path => "#{permissions_path}/BluetoothPeripheral"
  
  post_install do |installer|
    react_native_post_install(installer)
  end
end
```

2. **ios/IndiGuide/Info.plist** 권한 설명 추가:
```xml
<key>NSCameraUsageDescription</key>
<string>인덕션 상판을 모니터링하기 위해 카메라가 필요합니다.</string>

<key>NSBluetoothAlwaysUsageDescription</key>
<string>온도 센서와 통신하기 위해 Bluetooth가 필요합니다.</string>

<key>NSBluetoothPeripheralUsageDescription</key>
<string>온도 센서와 통신하기 위해 Bluetooth가 필요합니다.</string>

<key>NSLocationWhenInUseUsageDescription</key>
<string>Bluetooth 기기를 찾기 위해 위치 권한이 필요합니다.</string>
```

#### 실행

```bash
# Pod 설치
cd ios && pod install && cd ..

# iOS 시뮬레이터 또는 실제 기기에서 실행
npm run ios
```

## YOLOv8 모델 통합 (선택사항)

### 옵션 1: TensorFlow Lite

1. **YOLOv8 모델을 TFLite로 변환:**

```bash
pip install ultralytics

# Python 스크립트로 변환
python -c "from ultralytics import YOLO; YOLO('yolov8n.pt').export(format='tflite')"
```

2. **모델 파일을 프로젝트에 추가:**

- Android: `android/app/src/main/assets/yolov8n.tflite`
- iOS: Xcode에서 `ios/IndiGuide/` 폴더에 추가

3. **react-native-fast-tflite 설치:**

```bash
npm install react-native-fast-tflite
cd ios && pod install && cd ..
```

### 옵션 2: ONNX Runtime

```bash
npm install onnxruntime-react-native
```

## 하드웨어 거치대 (프로토타입)

### BLE 테스트용 시뮬레이터

실제 하드웨어 없이 테스트하려면 BLE 시뮬레이터 앱을 사용할 수 있습니다:

- **Android**: nRF Connect
- **iOS**: LightBlue

### 펌웨어 개발 (참고)

하드웨어 거치대는 다음 구성을 권장합니다:

- **MCU**: ESP32 (BLE + Wi-Fi)
- **온도 센서**: MLX90614 (비접촉 IR)
- **LED 조명**: WS2812B LED 링
- **카메라**: ESP32-CAM 또는 외부 USB 카메라

## 문제 해결

### Android

**Metro Bundler 포트 충돌:**
```bash
npx react-native start --port 8082
```

**빌드 실패 (Gradle):**
```bash
cd android && ./gradlew clean && cd ..
npm run android
```

### iOS

**Pod 설치 실패:**
```bash
cd ios
pod deintegrate
pod install
cd ..
```

**Xcode 빌드 실패:**
- Xcode에서 `Product > Clean Build Folder` (Shift + Cmd + K)
- `Derived Data` 삭제

### 공통

**Metro Bundler 캐시 초기화:**
```bash
npm start -- --reset-cache
```

**node_modules 재설치:**
```bash
rm -rf node_modules
npm install
```

## 다음 단계

설치가 완료되면 [README.md](README.md)를 참고하여 앱을 실행하고 기능을 테스트하세요.

