# HC-06 빠른 시작 가이드

HC-06 블루투스 모듈을 앱과 연결하는 빠른 시작 가이드입니다.

## 🚀 빠른 시작 (3단계)

### 1단계: 의존성 설치 및 빌드

```bash
# 1. 의존성 설치
npm install

# 2. Android 네이티브 빌드 (중요!)
# react-native-bluetooth-classic은 네이티브 모듈이므로 반드시 빌드 필요
npx expo run:android
```

⚠️ **중요**: `expo start` 또는 Expo Go로는 작동하지 않습니다!
네이티브 블루투스 모듈을 사용하므로 반드시 `npx expo run:android`로 실행해야 합니다.

### 2단계: HC-06 페어링

앱 실행 **전에** Android 기기에서 HC-06을 페어링하세요:

1. **HC-06 전원 켜기** → LED 깜빡임 확인
2. **Android 설정** → **블루투스**
3. **HC-06** 또는 **linvor** 선택
4. **PIN 코드 입력**: `1234` 또는 `0000`
5. **페어링 완료** 확인

### 3단계: 실제 모드로 전환

`src/utils/constants.ts` 파일을 열고:

```typescript
export const APP_CONFIG = {
  BLE_MOCK_MODE: false,  // true → false로 변경
  // ...
};
```

앱을 재시작하면 자동으로 HC-06을 검색하고 연결합니다!

---

## 📱 연결 상태 확인

앱이 시작되면 콘솔에서 다음 로그를 확인하세요:

```
[BluetoothClassic] 서비스 생성됨
[BluetoothClassic] 블루투스 초기화 성공
[BluetoothClassic] HC-06 디바이스 검색 중...
[BluetoothClassic] 페어링된 HC-06 발견: HC-06
[BluetoothClassic] 연결 시도: HC-06 98:D3:31:F5:XX:XX
[BluetoothClassic] 연결 성공: HC-06
[App] HC-06 연결 성공
```

---

## 🔧 데이터 전송 테스트

### Arduino → 앱 (데이터 수신)

Arduino에서 다음 형식으로 데이터를 보내세요:

```cpp
// JSON 형식 (권장)
bluetooth.println("{\"temp\":25.5,\"burners\":{\"FL\":80,\"FR\":60,\"RL\":40,\"RR\":30}}");

// 또는 CSV 형식
bluetooth.println("TEMP:25.5,FL:80,FR:60,RL:40,RR:30");
```

앱 콘솔에서 확인:
```
[BluetoothClassic] 데이터 수신: {"temp":25.5,...}
```

### 앱 → Arduino (명령 전송)

앱에서 LED 밝기 조정:

```typescript
import { BluetoothClassicService } from '@/services/BluetoothClassicService';

const bluetoothService = BluetoothClassicService.getInstance();
await bluetoothService.setLedBrightness(200); // 0-255
```

Arduino에서 수신:
```cpp
if (bluetooth.available()) {
  String data = bluetooth.readStringUntil('\n');
  // {"type":"led","value":200} 수신
}
```

---

## ⚠️ 문제 해결

### "HC-06을 찾을 수 없습니다"

✅ **해결 방법**:
1. HC-06 전원 확인 (LED 깜빡임)
2. Android 설정에서 페어링 확인
3. 다른 앱이 HC-06을 사용 중인지 확인
4. HC-06 리셋 (전원 껐다 켜기)

### "Permission denied"

✅ **해결 방법**:
1. Android 설정 → 앱 → indi-guide → 권한
2. **블루투스**, **위치** 권한 허용
3. 앱 재시작

### 빌드 에러

✅ **해결 방법**:
```bash
cd android
./gradlew clean
cd ..
npx expo run:android
```

### 연결은 되는데 데이터가 안 옴

✅ **해결 방법**:
1. Arduino 시리얼 모니터로 HC-06 출력 확인
2. 보드레이트 확인 (HC-06: 9600)
3. 데이터 형식 확인 (JSON 또는 CSV)
4. 줄바꿈 문자 포함 확인 (`\n`)

---

## 📚 더 자세한 정보

자세한 내용은 다음 문서를 참고하세요:

- **완전한 가이드**: [BLUETOOTH_HC06_GUIDE.md](./BLUETOOTH_HC06_GUIDE.md)
- **Arduino 예제 코드**: 가이드 문서의 "HC-06 Arduino 예제 코드" 섹션
- **데이터 프로토콜**: 가이드 문서의 "데이터 프로토콜" 섹션

---

## ✅ 체크리스트

연결 전에 다음을 확인하세요:

- [ ] `npm install` 실행됨
- [ ] `npx expo run:android`로 빌드됨 (Expo Go ❌)
- [ ] HC-06이 Android와 페어링됨
- [ ] `BLE_MOCK_MODE: false`로 설정됨
- [ ] 블루투스 및 위치 권한 허용됨
- [ ] HC-06 전원이 켜져 있고 LED가 깜빡임

모든 항목이 체크되면 앱을 실행하세요! 🎉

