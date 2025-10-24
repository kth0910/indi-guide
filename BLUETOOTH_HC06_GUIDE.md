# HC-06 블루투스 연결 가이드

이 가이드는 HC-06 블루투스 모듈과 앱을 연결하는 방법을 설명합니다.

## 📋 목차

1. [HC-06 모듈 개요](#hc-06-모듈-개요)
2. [설정 방법](#설정-방법)
3. [연결 방법](#연결-방법)
4. [데이터 프로토콜](#데이터-프로토콜)
5. [문제 해결](#문제-해결)

---

## HC-06 모듈 개요

HC-06은 블루투스 클래식(Bluetooth Classic) 시리얼 통신 모듈입니다.

### 기본 사양

- **프로토콜**: Bluetooth 2.0 + EDR (SPP - Serial Port Profile)
- **기본 이름**: `HC-06` 또는 `linvor`
- **기본 보드레이트**: 9600 bps
- **기본 PIN 코드**: 1234 또는 0000
- **동작 전압**: 3.3V ~ 6V
- **통신 거리**: 약 10m (장애물 없을 때)

---

## 설정 방법

### 1. 라이브러리 설치

프로젝트에 이미 `react-native-bluetooth-classic`이 추가되어 있습니다.

```bash
# 의존성 설치
npm install

# Android 빌드 (네이티브 모듈 포함)
npx expo run:android
```

### 2. Android 권한 설정

`android/app/src/main/AndroidManifest.xml`에 이미 필요한 권한이 추가되어 있습니다:

- `BLUETOOTH`
- `BLUETOOTH_ADMIN`
- `BLUETOOTH_CONNECT`
- `BLUETOOTH_SCAN`
- `ACCESS_FINE_LOCATION`
- `ACCESS_COARSE_LOCATION`

### 3. HC-06 모듈 페어링

앱을 실행하기 **전에** Android 기기에서 HC-06을 페어링해야 합니다:

1. **Android 설정** → **블루투스** 열기
2. HC-06 전원 켜기 (LED가 깜빡이는지 확인)
3. 사용 가능한 기기 목록에서 **HC-06** 또는 **linvor** 찾기
4. 선택하여 페어링
5. PIN 코드 입력 (기본값: **1234** 또는 **0000**)
6. 페어링 성공 확인

---

## 연결 방법

### 자동 연결 (앱 시작 시)

앱이 시작되면 자동으로 HC-06을 검색하고 연결을 시도합니다:

```typescript
// src/App.tsx
const bluetoothService = BluetoothClassicService.getInstance();

// 초기화 및 자동 연결
const bluetoothInitialized = await bluetoothService.initialize();
if (bluetoothInitialized) {
  const connected = await bluetoothService.scanAndConnect(
    (deviceName) => {
      console.log('[App] HC-06 디바이스 발견:', deviceName);
    }
  );
}
```

### 수동 연결 (특정 주소로)

특정 MAC 주소로 직접 연결하려면:

```typescript
const bluetoothService = BluetoothClassicService.getInstance();

// MAC 주소로 연결 (예: "98:D3:31:F5:XX:XX")
const connected = await bluetoothService.connectByAddress("98:D3:31:F5:XX:XX");

if (connected) {
  console.log('HC-06 연결 성공!');
} else {
  console.log('HC-06 연결 실패');
}
```

### 페어링된 디바이스 목록 확인

```typescript
const devices = await bluetoothService.getPairedDevices();

devices.forEach((device) => {
  console.log(`이름: ${device.name}, 주소: ${device.address}`);
});
```

---

## 데이터 프로토콜

### 수신 데이터 형식

HC-06에서 앱으로 데이터를 보낼 때 다음 두 가지 형식 중 하나를 사용할 수 있습니다:

#### 1. JSON 형식 (권장)

```json
{
  "temp": 25.5,
  "burners": {
    "FL": 80,
    "FR": 60,
    "RL": 40,
    "RR": 30
  },
  "ambient": 20,
  "led": 128
}
```

#### 2. CSV 형식 (간단한 경우)

```
TEMP:25.5,FL:80,FR:60,RL:40,RR:30,AMB:20,LED:128
```

### 전송 데이터 형식

앱에서 HC-06으로 명령을 보낼 때:

#### LED 밝기 조정

```json
{
  "type": "led",
  "value": 255
}
```

또는 간단한 문자열:
```
LED:255
```

#### 센서 보정

```json
{
  "type": "calibrate",
  "data": {
    "ice": 0,
    "boiling": 100
  }
}
```

### 데이터 수신 예제

```typescript
const bluetoothService = BluetoothClassicService.getInstance();

// 데이터 수신 콜백 등록
bluetoothService.onDataReceived((packet: SensorPacket) => {
  console.log('온도 데이터:', packet.temperature);
  console.log('좌측 전면 버너:', packet.temperature.burners.FRONT_LEFT);
  console.log('우측 전면 버너:', packet.temperature.burners.FRONT_RIGHT);
  console.log('좌측 후면 버너:', packet.temperature.burners.REAR_LEFT);
  console.log('우측 후면 버너:', packet.temperature.burners.REAR_RIGHT);
});
```

### 데이터 전송 예제

```typescript
const bluetoothService = BluetoothClassicService.getInstance();

// LED 밝기 조정 (0-255)
await bluetoothService.setLedBrightness(200);

// 직접 데이터 전송
await bluetoothService.sendData('CUSTOM_COMMAND\n');
```

---

## 목업 모드와 실제 모드 전환

### 목업 모드 (개발/테스트용)

HC-06 없이 테스트하려면 `src/utils/constants.ts`에서:

```typescript
export const APP_CONFIG = {
  BLE_MOCK_MODE: true,  // 목업 모드 활성화
  // ...
};
```

### 실제 모드 (HC-06 연결)

실제 HC-06과 연결하려면:

```typescript
export const APP_CONFIG = {
  BLE_MOCK_MODE: false,  // 실제 블루투스 사용
  // ...
};
```

또는 런타임에 전환:

```typescript
const bluetoothService = BluetoothClassicService.getInstance();
bluetoothService.setMockMode(false); // 실제 모드로 전환
```

---

## 문제 해결

### 1. HC-06이 검색되지 않음

**원인**:
- HC-06 전원이 꺼져 있음
- 이미 다른 기기와 연결됨
- 블루투스가 꺼져 있음

**해결 방법**:
1. HC-06 전원 확인 (LED 깜빡임)
2. HC-06 리셋 (전원 껐다 켜기)
3. Android 블루투스 확인
4. 위치 권한 확인

### 2. 페어링은 되는데 연결이 안됨

**원인**:
- 앱 권한 부족
- HC-06이 다른 앱과 연결 중

**해결 방법**:
1. 앱 권한 확인 (설정 → 앱 → indi-guide → 권한)
2. HC-06을 페어링 해제 후 재페어링
3. Android 기기 재시작

### 3. 데이터가 수신되지 않음

**원인**:
- HC-06에서 데이터를 전송하지 않음
- 데이터 형식이 잘못됨
- 보드레이트 불일치

**해결 방법**:
1. HC-06 TX 핀에서 데이터가 나오는지 확인
2. 시리얼 모니터로 HC-06 출력 확인
3. 데이터 형식이 JSON 또는 CSV인지 확인
4. HC-06 보드레이트 확인 (기본 9600)

### 4. 연결이 자주 끊김

**원인**:
- 신호 간섭
- 거리가 멀음
- HC-06 전원 불안정

**해결 방법**:
1. 기기를 HC-06에 가까이
2. 다른 블루투스 기기 끄기
3. HC-06 전원 안정화 (레귤레이터 사용)

### 5. 권한 에러

**에러 메시지**: "Permission denied"

**해결 방법**:
```bash
# 권한 재설정
cd android
./gradlew clean
cd ..
npx expo run:android
```

앱 설치 후 수동으로 권한 허용:
1. 설정 → 앱 → indi-guide
2. 권한 → 블루투스, 위치, 카메라 모두 허용

---

## HC-06 Arduino 예제 코드

HC-06과 Arduino를 연결하여 온도 센서 데이터를 전송하는 예제:

```cpp
#include <SoftwareSerial.h>

// HC-06 핀 설정 (RX, TX)
SoftwareSerial bluetooth(10, 11);

// 온도 센서 핀
const int tempPins[] = {A0, A1, A2, A3}; // 4개 버너

void setup() {
  Serial.begin(9600);
  bluetooth.begin(9600); // HC-06 보드레이트
  
  Serial.println("HC-06 준비 완료");
}

void loop() {
  // 온도 센서 읽기
  float temps[4];
  for (int i = 0; i < 4; i++) {
    int raw = analogRead(tempPins[i]);
    temps[i] = raw * 0.48828125; // 0-1023 → 0-500°C (예시)
  }
  
  // JSON 형식으로 전송
  bluetooth.print("{");
  bluetooth.print("\"temp\":");
  bluetooth.print((temps[0] + temps[1] + temps[2] + temps[3]) / 4.0);
  bluetooth.print(",\"burners\":{");
  bluetooth.print("\"FL\":");
  bluetooth.print(temps[0]);
  bluetooth.print(",\"FR\":");
  bluetooth.print(temps[1]);
  bluetooth.print(",\"RL\":");
  bluetooth.print(temps[2]);
  bluetooth.print(",\"RR\":");
  bluetooth.print(temps[3]);
  bluetooth.print("},\"ambient\":20,\"led\":128}");
  bluetooth.println(); // 줄바꿈
  
  // 시리얼 모니터에도 출력
  Serial.print("전송: ");
  Serial.println(temps[0]);
  
  delay(500); // 0.5초마다 전송
}
```

---

## 추가 리소스

- [HC-06 데이터시트](https://components101.com/wireless/hc-06-bluetooth-module-pinout-datasheet)
- [react-native-bluetooth-classic 문서](https://github.com/kenjdavidson/react-native-bluetooth-classic)
- [Arduino Serial 통신](https://www.arduino.cc/reference/en/language/functions/communication/serial/)

---

## 지원

문제가 계속되면:
1. 로그 확인: `npx react-native log-android`
2. HC-06 리셋
3. 앱 재설치

