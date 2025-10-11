# 🚀 빠른 시작 가이드

## IndiGuide - Expo 프로젝트

### 1️⃣ 의존성 설치

```bash
npm install
```

### 2️⃣ 개발 서버 시작

```bash
npm start
```

### 3️⃣ 앱 실행

터미널에서 다음 키를 눌러 실행:

- **`a`** - Android 에뮬레이터에서 실행
- **`i`** - iOS 시뮬레이터에서 실행 (Mac만)
- **`w`** - 웹 브라우저에서 실행

또는 QR 코드를 스캔하여 Expo Go 앱에서 실행

### ⚠️ 중요 참고사항

**Expo Go 제한사항**: 이 프로젝트는 다음 네이티브 모듈을 사용합니다:
- react-native-vision-camera
- react-native-ble-plx

Expo Go에서는 이러한 모듈이 작동하지 않습니다.

**전체 기능 테스트**를 위해서는 개발 빌드를 생성해야 합니다:

```bash
# 네이티브 프로젝트 생성
npx expo prebuild

# Android 실행
npm run android

# iOS 실행
npm run ios
```

### 📱 필요한 파일

`assets/` 폴더에 다음 이미지 파일들을 추가하세요:
- icon.png (1024x1024)
- splash.png (1284x2778)
- adaptive-icon.png (1024x1024)
- favicon.png (48x48)

또는 기본 이미지 자동 생성:
```bash
npx expo prebuild --clean
```

### 📚 더 많은 정보

- 상세 설정: [EXPO_SETUP.md](./EXPO_SETUP.md)
- 프로젝트 문서: [README.md](./README.md)
- 설치 가이드: [INSTALLATION.md](./INSTALLATION.md)

### 🐛 문제 해결

캐시 초기화:
```bash
npx expo start -c
```

의존성 재설치:
```bash
rm -rf node_modules
npm install
```

### 💡 개발 팁

- **자동 새로고침**: 코드 변경 시 자동으로 앱이 새로고침됩니다
- **개발자 메뉴**: Android는 `Ctrl+M`, iOS는 `Cmd+D`
- **로그 확인**: 터미널에서 실시간 로그 확인 가능

---

문제가 발생하면 [EXPO_SETUP.md](./EXPO_SETUP.md)의 문제 해결 섹션을 참고하세요!

