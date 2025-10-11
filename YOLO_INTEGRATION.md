# YOLO 모델 통합 가이드

이 문서는 학습된 YOLOv8 ONNX 모델을 React Native 프로젝트에 통합하는 방법을 설명합니다.

## 완료된 작업

### 1. 모델 파일 복사 ✅
- `runs/detect/train7/weights/best.onnx` → `indi-guide/assets/yolo_model.onnx`

### 2. 패키지 추가 ✅
- `package.json`에 `onnxruntime-react-native` 추가

### 3. VisionService 업데이트 ✅
- ONNX Runtime 통합
- YOLOv8 추론 로직 구현
- 전처리/후처리 파이프라인 구현
- NMS (Non-Maximum Suppression) 구현

### 4. 설정 업데이트 ✅
- `constants.ts`에 YOLO 모델 관련 설정 추가

## 다음 단계

### 1. 패키지 설치
프로젝트 디렉토리에서 다음 명령어를 실행하세요:

```bash
cd indi-guide
npm install
```

### 2. TypeScript 타입 선언 (선택사항)
만약 TypeScript 에러가 발생하면, `src/types/onnxruntime-react-native.d.ts` 파일을 생성하세요:

```typescript
declare module 'onnxruntime-react-native' {
  export class InferenceSession {
    static create(path: string): Promise<InferenceSession>;
    run(feeds: Record<string, Tensor>): Promise<Record<string, Tensor>>;
    release(): Promise<void>;
    readonly inputNames: string[];
    readonly outputNames: string[];
  }

  export class Tensor {
    constructor(type: string, data: Float32Array | Uint8Array, dims: number[]);
    readonly data: Float32Array | Uint8Array;
    readonly dims: number[];
    readonly type: string;
  }
}
```

### 3. 프레임 전처리 구현
현재 `preprocessFrame` 메서드는 스켈레톤 구조만 제공합니다. 실제 구현을 위해서는:

1. **react-native-vision-camera**의 Frame을 사용하여 이미지 데이터 추출
2. 640x640으로 리사이즈 (aspect ratio 유지)
3. RGB로 변환 및 정규화 (0-255 → 0-1)
4. CHW 형식으로 변환 (Height, Width, Channels → Channels, Height, Width)

참고 코드:
```typescript
private async preprocessFrame(frame: Frame): Promise<Tensor> {
  // 1. Frame에서 이미지 버퍼 추출
  const buffer = frame.toArrayBuffer();
  
  // 2. 리사이즈 및 정규화 (네이티브 모듈 또는 TensorFlow.js 사용)
  const resized = await this.resizeImage(buffer, 640, 640);
  
  // 3. Float32Array로 변환
  const inputData = new Float32Array(1 * 3 * 640 * 640);
  
  // RGB 값을 CHW 형식으로 배치
  for (let c = 0; c < 3; c++) {
    for (let h = 0; h < 640; h++) {
      for (let w = 0; w < 640; w++) {
        const idx = (h * 640 + w) * 3 + c;
        const outIdx = c * 640 * 640 + h * 640 + w;
        inputData[outIdx] = resized[idx] / 255.0; // 정규화
      }
    }
  }
  
  return new Tensor('float32', inputData, [1, 3, 640, 640]);
}
```

### 4. 모델 출력 형식 확인
학습된 모델의 출력 형식을 확인하려면:

```bash
cd c:\dev\indi-guide
python -c "import onnx; model = onnx.load('runs/detect/train7/weights/best.onnx'); print('입력:', [i.name for i in model.graph.input]); print('출력:', [o.name for o in model.graph.output])"
```

출력 형식에 따라 `postprocessOutput` 메서드의 파싱 로직을 조정하세요.

### 5. Android/iOS 빌드
ONNX Runtime은 네이티브 라이브러리를 사용하므로, 빌드가 필요합니다:

**Android:**
```bash
cd indi-guide/android
./gradlew clean
cd ..
npm run android
```

**iOS (Mac 전용):**
```bash
cd indi-guide/ios
pod install
cd ..
npm run ios
```

### 6. 테스트
1. 앱 실행
2. 홈 화면에서 "조리 시작" 버튼 클릭
3. 카메라가 인덕션 상판을 비추도록 위치
4. 손을 인덕션 위에 올려서 감지 테스트

## 주요 클래스 및 설정

### VisionService
- **위치**: `indi-guide/src/services/VisionService.ts`
- **주요 메서드**:
  - `initializeModel()`: ONNX 모델 로딩
  - `runYOLOv8()`: YOLOv8 추론 실행
  - `preprocessFrame()`: 프레임 전처리
  - `postprocessOutput()`: 출력 후처리 및 NMS

### 설정 (constants.ts)
```typescript
YOLO_MODEL_PATH: '../../assets/yolo_model.onnx',
YOLO_INPUT_SIZE: 640,
YOLO_CONFIDENCE_THRESHOLD: 0.5,
YOLO_IOU_THRESHOLD: 0.45,
YOLO_CLASS_NAMES: ['hand'],
```

## 성능 최적화

### 1. 모델 경량화
현재 모델 크기가 크면 (>10MB), 양자화를 고려하세요:

```bash
# INT8 양자화 (Python)
python convert_to_tflite.py --quantize int8
```

### 2. 프레임 스킵
매 프레임마다 추론하지 않고, N프레임마다 실행:

```typescript
private frameCount = 0;
private readonly INFERENCE_INTERVAL = 3; // 3프레임마다

async processFrame(frame: Frame): Promise<VisionResult | null> {
  this.frameCount++;
  
  if (this.frameCount % this.INFERENCE_INTERVAL !== 0) {
    // 이전 결과 재사용
    return this.lastResult;
  }
  
  // 추론 실행
  // ...
}
```

### 3. 워커 스레드 활용
ONNX 추론을 백그라운드 스레드에서 실행하여 UI 블로킹 방지.

## 문제 해결

### 모델이 로드되지 않음
- `assets/yolo_model.onnx` 파일 존재 확인
- Metro bundler 재시작: `npm start -- --reset-cache`

### 추론이 느림
- 모델 크기 확인 (>50MB이면 양자화 필요)
- 프레임 해상도 낮추기 (1280x720 → 640x480)
- 프레임 스킵 적용

### 감지 정확도가 낮음
- `CONFIDENCE_THRESHOLD` 조정 (0.5 → 0.3)
- 전처리 로직 확인 (정규화, 색공간 변환)
- 학습 데이터 추가 및 재학습

## 참고 자료

- [ONNX Runtime React Native](https://onnxruntime.ai/docs/tutorials/mobile/react-native.html)
- [YOLOv8 문서](https://docs.ultralytics.com/)
- [React Native Vision Camera](https://react-native-vision-camera.com/)

