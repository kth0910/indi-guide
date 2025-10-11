# 문제 해결 가이드

## "Cannot convert undefined value to object" 에러 해결

### 1. 캐시 정리 및 재빌드

```bash
# Metro 번들러 캐시 정리
npx react-native start --reset-cache

# 다른 터미널에서 앱 재실행
# Android
npx react-native run-android

# iOS  
npx react-native run-ios
```

### 2. 완전 정리 후 재빌드 (Android)

```bash
cd indi-guide/android
./gradlew clean
cd ..
npx react-native start --reset-cache
```

### 3. node_modules 재설치

```bash
cd indi-guide
rm -rf node_modules
npm install
npx react-native start --reset-cache
```

### 4. 목업 모드 설정 확인

`src/utils/constants.ts` 파일에서:

```typescript
export const APP_CONFIG = {
  BLE_MOCK_MODE: true,      // ✅ 블루투스 목업
  VISION_MOCK_MODE: true,   // ✅ 카메라 목업
  // ...
};
```

### 5. 콘솔 로그 확인

에러 발생 시 콘솔에 다음과 같은 로그가 출력됩니다:
- `[MOCK]` - 목업 모드 관련 로그
- `[CookingScreen]` - 조리 화면 관련 에러
- `[BLE]` - 블루투스 관련 로그

### 6. 일반적인 에러 원인

1. **Worklet 관련 에러**
   - worklet 내부에서 외부 객체 접근 시 발생
   - 해결: 목업 모드 활성화 (`VISION_MOCK_MODE: true`)

2. **타입 불일치**
   - undefined 값에 대한 안전 체크 누락
   - 해결: 옵셔널 체이닝(`?.`) 사용

3. **타이머 콜백 에러**
   - setInterval 내부에서 발생하는 에러
   - 해결: try-catch로 감싸기 (이미 적용됨)

### 7. 디버깅 모드

더 자세한 로그를 보려면:

```bash
# Android
adb logcat *:S ReactNative:V ReactNativeJS:V

# Chrome DevTools 사용
# Metro 실행 중 'j'를 눌러 디버거 열기
```

## 추가 도움말

문제가 계속되면 다음 정보와 함께 문의하세요:
1. 에러 메시지 전체 스택 트레이스
2. `constants.ts`의 목업 모드 설정
3. 실행 환경 (Android/iOS, 버전)
4. Metro 번들러 로그


