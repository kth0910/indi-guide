/**
 * 비전 인식 서비스 (카메라, YOLOv10, OCR, 마커 감지)
 */

import { Camera, useCameraDevice } from 'react-native-vision-camera';
import { InferenceSession, Tensor } from 'onnxruntime-react-native';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';
import ImageProcessor from '@/modules/ImageProcessor';
import {
  VisionResult,
  OCRResult,
  HandDetection,
  PoseQuality,
  BurnerPosition,
  YOLODetection,
} from '@/types';
import { APP_CONFIG } from '@/utils/constants';

// YOLODetection은 @/types에서 import됨

export class VisionService {
  private static instance: VisionService;
  private isRunning: boolean = false;
  private frameCallback?: (result: VisionResult) => void;
  private lastOCRUpdate: number = 0;
  
  // 마커 보정 데이터
  private homographyMatrix?: number[][];
  private pixelToMmScale: number = 1.0;

  // ONNX 모델 관련
  private yoloSession?: InferenceSession;
  private modelLoaded: boolean = false;
  private readonly MODEL_INPUT_SIZE = 640; // YOLOv10 입력 크기
  private readonly CONFIDENCE_THRESHOLD = APP_CONFIG.YOLO_CONFIDENCE_THRESHOLD; // constants.ts에서 가져옴
  private readonly IOU_THRESHOLD = 0.45; // NMS IOU 임계값
  private readonly CLASS_NAMES = ['lock', 'timer', 'down', 'up', 'power', 'fingertip', 'segment']; // 인덕션 버튼 클래스 (6개)

  private constructor() {
    console.log('[VISION] VisionService 초기화 시작');
    this.initializeModel();
  }

  static getInstance(): VisionService {
    if (!VisionService.instance) {
      VisionService.instance = new VisionService();
    }
    return VisionService.instance;
  }

  /**
   * ONNX 모델 초기화
   */
  private async initializeModel(): Promise<void> {
    try {
      console.log('YOLOv10 ONNX 모델 로딩 시작...');
      
      // assets에서 모델 파일 로드
      const modelAsset = Asset.fromModule(require('../../assets/yolo_model.onnx'));
      await modelAsset.downloadAsync();
      
      if (!modelAsset.localUri) {
        throw new Error('모델 파일을 로드할 수 없습니다.');
      }

      console.log('모델 파일 경로:', modelAsset.localUri);

      // ONNX Runtime 세션 생성
      this.yoloSession = await InferenceSession.create(modelAsset.localUri);
      this.modelLoaded = true;
      
      console.log('✅ YOLOv10 모델 로딩 완료');
      console.log('입력 이름:', this.yoloSession.inputNames);
      console.log('출력 이름:', this.yoloSession.outputNames);
    } catch (error) {
      console.warn('⚠️ ONNX 모델 로딩 실패:', error);
      console.warn('비전 기능은 목업 모드로만 동작합니다.');
      this.modelLoaded = false;
    }
  }

  /**
   * 카메라 권한 요청
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const cameraPermission = await Camera.requestCameraPermission();
      return cameraPermission === 'granted';
    } catch (error) {
      console.error('카메라 권한 요청 실패:', error);
      return false;
    }
  }

  /**
   * 비전 처리 시작
   */
  start(callback: (result: VisionResult) => void): void {
    this.frameCallback = callback;
    this.isRunning = true;
  }

  /**
   * 비전 처리 중지
   */
  stop(): void {
    this.isRunning = false;
    this.frameCallback = undefined;
  }

  /**
   * 스냅샷 이미지 처리 (실제 카메라 프레임)
   */
  async processSnapshot(imagePath: string, orientation?: string): Promise<VisionResult | null> {
    if (!this.isRunning) {
      return null;
    }

    const timestamp = Date.now();

    try {
      console.log('[VISION] 스냅샷 처리 시작:', imagePath);

      // 1. 마커 감지 (임시로 OK 반환)
      const pose: PoseQuality = {
        detected: true,
        markerCount: 4,
        reprojectionError: 0.5,
        status: 'OK',
        timestamp,
      };

      // 2. OCR (1Hz로 제한)
      let ocr: OCRResult;
      if (timestamp - this.lastOCRUpdate >= APP_CONFIG.OCR_UPDATE_INTERVAL) {
        ocr = this.getEmptyOCR(timestamp);
        this.lastOCRUpdate = timestamp;
      } else {
        ocr = this.getEmptyOCR(timestamp);
      }

      // 3. 버튼 감지 (YOLO) - 네이티브 모듈이 이미지 리사이즈와 RGB 변환 처리
      const hand = await this.detectHandFromImage(imagePath, orientation);

      // 4. 밝기 측정
      const brightness = 120;

      return {
        ocr,
        hand,
        pose,
        brightness,
      };
    } catch (error) {
      console.error('[VISION] 스냅샷 처리 에러:', error);
      return null;
    }
  }

  /**
   * 프레임 처리 (레거시 - 사용 안함)
   */
  async processFrame(frame: any): Promise<VisionResult | null> {
    if (!this.isRunning) {
      return null;
    }

    const timestamp = Date.now();
    const pose = this.detectMarkers(frame);
    const ocr = this.getEmptyOCR(timestamp);
    const hand = await this.detectHand(frame);
    const brightness = this.measureBrightness(frame);

    return {
      ocr,
      hand,
      pose,
      brightness,
    };
  }

  /**
   * 마커 감지 및 호모그래피 계산
   * ArUco/AprilTag 마커를 찾아 카메라 포즈 추정
   */
  private detectMarkers(frame: any): PoseQuality {
    // TODO: 실제 구현에서는 OpenCV 또는 ArUco 라이브러리 사용
    // 여기서는 스켈레톤 구조만 제공
    
    try {
      // 마커 감지 로직 (네이티브 모듈 호출 필요)
      const markers = this.findArucoMarkers(frame);
      
      if (markers.length < 3) {
        return {
          detected: false,
          markerCount: markers.length,
          reprojectionError: 999,
          status: 'FAIL',
          timestamp: Date.now(),
        };
      }

      // 호모그래피 계산
      this.homographyMatrix = this.computeHomography(markers);
      
      // 리프로젝션 에러 계산
      const error = this.calculateReprojectionError(markers);
      
      let status: 'OK' | 'WARNING' | 'FAIL';
      if (error <= APP_CONFIG.OCR_CONFIDENCE_THRESHOLD) {
        status = 'OK';
      } else if (error <= 3.0) {
        status = 'WARNING';
      } else {
        status = 'FAIL';
      }

      return {
        detected: true,
        markerCount: markers.length,
        reprojectionError: error,
        status,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('마커 감지 실패:', error);
      return {
        detected: false,
        markerCount: 0,
        reprojectionError: 999,
        status: 'FAIL',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * OCR 실행 (디스플레이 숫자/아이콘 인식)
   */
  private runOCR(frame: any): OCRResult {
    // TODO: 실제 구현에서는 Tesseract OCR 또는 ML Kit 사용
    // 여기서는 스켈레톤 구조만 제공
    
    try {
      // 호모그래피 적용하여 디스플레이 영역 추출
      const displayRegion = this.extractDisplayRegion(frame);
      
      // OCR 수행 (네이티브 모듈 또는 ML Kit)
      const ocrText = this.performOCR(displayRegion);
      
      // 파싱: 출력 단계, 타이머, H 아이콘
      const powerLevel = this.extractPowerLevel(ocrText);
      const timerMinutes = this.extractTimer(ocrText);
      const hasHIcon = ocrText.includes('H');
      
      return {
        powerLevel,
        timerMinutes,
        hasResidualHeatIcon: hasHIcon,
        confidence: 0.9, // TODO: 실제 신뢰도 계산
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('OCR 실패:', error);
      return this.getEmptyOCR(Date.now());
    }
  }

  /**
   * 이미지 파일에서 버튼 감지 (YOLO)
   */
  private async detectHandFromImage(imageUri: string, orientation?: string): Promise<HandDetection> {
    try {
      console.log('[YOLO] ========== 버튼 감지 시작 ==========');
      console.log('[YOLO] 이미지:', imageUri);
      console.log('[YOLO] Orientation:', orientation);

      // orientation 정보를 네이티브 모듈에 전달 (undefined 대신 null 사용)
      const result = await ImageProcessor.decodeImageFromUri(
        imageUri,
        this.MODEL_INPUT_SIZE,
        this.MODEL_INPUT_SIZE,
        orientation || 'portrait'
      );

      console.log('[YOLO] ✅ 네이티브 모듈로 이미지 로드 완료');
      console.log('[YOLO] 이미지 크기:', `${result.width}x${result.height}`);
      console.log('[YOLO] RGB 데이터 길이:', result.data.length, '(예상:', 640*640*3, ')');
      console.log('[YOLO] 원본:', `${result.originalWidth}x${result.originalHeight}`);
      console.log('[YOLO] Crop:', result.cropX !== undefined ? 
        `${result.cropSize}x${result.cropSize} at (${result.cropX}, ${result.cropY})` : 'none');

      // Float32Array로 변환하고 0-1로 정규화
      const inputData = new Float32Array(result.data.length);
      for (let i = 0; i < result.data.length; i++) {
        inputData[i] = result.data[i] / 255.0;
      }
      const inputTensor = new Tensor('float32', inputData, [1, 3, this.MODEL_INPUT_SIZE, this.MODEL_INPUT_SIZE]);

      // YOLO 추론 실행
      if (!this.modelLoaded || !this.yoloSession) {
        console.warn('[YOLO] ONNX 모델이 로드되지 않았습니다.');
        return { detected: false, timestamp: Date.now() };
      }

      const feeds: Record<string, Tensor> = {};
      feeds[this.yoloSession.inputNames[0]] = inputTensor;
      
      const inferenceResult = await this.yoloSession.run(feeds);
      const outputTensor = inferenceResult[this.yoloSession.outputNames[0]];
      
      console.log('[YOLO] 추론 완료, 출력 shape:', outputTensor.dims);

      // 후처리 (네이티브 NMS 사용) - 640x640 기준 좌표로 변환
      const detections = await this.postprocessOutput(
        outputTensor,
        640,  // YOLO 출력 이미지는 항상 640x640
        640,
        undefined  // crop offset은 사용하지 않음
      );
      
      if (detections.length === 0) {
        console.log('[YOLO] 버튼 감지 안됨');
        return { detected: false, timestamp: Date.now() };
      }

      // 감지된 모든 버튼 로그
      console.log(`[YOLO] ✅ ${detections.length}개 버튼 감지됨:`);
      detections.forEach((det, idx) => {
        console.log(`  [${idx}] ${det.className}: ${(det.confidence * 100).toFixed(1)}% bbox=(${Math.round(det.bbox.x)}, ${Math.round(det.bbox.y)}) size=(${Math.round(det.bbox.width)}x${Math.round(det.bbox.height)})`);
      });
      
      // 원본 이미지 크기 정보 로그
      console.log('[YOLO] 이미지 크기 정보:', {
        original: `${result.originalWidth}x${result.originalHeight}`,
        crop: result.cropSize ? `${result.cropSize}x${result.cropSize} at (${result.cropX}, ${result.cropY})` : 'none',
        model: `${this.MODEL_INPUT_SIZE}x${this.MODEL_INPUT_SIZE}`,
      });
      
      // 바운딩 박스가 그려진 디버그 이미지 생성
      let debugImagePath: string | undefined;
      try {
        console.log('[YOLO] 디버그 이미지 생성 시작...');
        
        // 1. 회전되고 crop된 640x640 이미지 저장
        const rotatedImagePath = `file://${FileSystem.cacheDirectory}yolo_rotated_${Date.now()}.jpg`;
        console.log('[YOLO] 회전/Crop 이미지 저장 중:', rotatedImagePath);
        
        await ImageProcessor.saveRotatedCroppedImage(
          imageUri, 
          orientation || 'portrait', 
          rotatedImagePath,
          {
            cropX: result.cropX || 0,
            cropY: result.cropY || 0,
            cropSize: result.cropSize || this.MODEL_INPUT_SIZE
          }
        );
        console.log('[YOLO] ✅ 회전/Crop 이미지 저장 완료');
        
        // 2. 640x640 이미지에 바운딩 박스 그리기
        const outputPath = `file://${FileSystem.cacheDirectory}yolo_debug_${Date.now()}.jpg`;
        console.log('[YOLO] 바운딩 박스 그리기 시작:', detections.length, '개');
        
        debugImagePath = await ImageProcessor.drawBoundingBoxes(
          rotatedImagePath,
          detections,
          outputPath
        );
        console.log('[YOLO] ✅✅✅ 디버그 이미지 생성 완료:', debugImagePath);
      } catch (error) {
        console.error('[YOLO] ❌ 디버그 이미지 생성 실패:', error);
        console.error('[YOLO] Error details:', JSON.stringify(error));
      }
      
      const primary = detections[0];
      const position = {
        x: primary.bbox.centerX,
        y: primary.bbox.centerY,
      };
      const realPosition = this.transformPoint(position);
      const onButton = this.matchButtonRegion(realPosition);
      const onBurner = this.matchBurnerRegion(realPosition);

      return {
        detected: true,
        position: realPosition,
        bbox: {
          x: primary.bbox.x,
          y: primary.bbox.y,
          width: primary.bbox.width,
          height: primary.bbox.height,
        },
        confidence: primary.confidence,
        onButton,
        onBurner,
        timestamp: Date.now(),
        allDetections: detections,
        debugImagePath, // 바운딩 박스가 그려진 이미지 경로
      };
    } catch (error) {
      console.error('[YOLO] 이미지에서 버튼 감지 실패:', error);
      return { detected: false, timestamp: Date.now() };
    }
  }

  /**
   * 손 감지 (레거시 - 사용 안함)
   */
  private async detectHand(frame: any): Promise<HandDetection> {
    return { detected: false, timestamp: Date.now() };
  }

  /**
   * 밝기 측정 (히스토그램)
   */
  private measureBrightness(frame: any): number {
    // TODO: 프레임의 그레이스케일 히스토그램 중앙값 계산
    // 여기서는 임시값 반환
    return 120;
  }

  /**
   * LED 조명 자동 밝기 조정 계산
   */
  calculateLedBrightness(currentBrightness: number, targetBrightness: number = 120): number {
    const diff = targetBrightness - currentBrightness;
    const adjustment = Math.round(diff * 0.5); // 비례 제어
    return Math.max(0, Math.min(255, 128 + adjustment));
  }

  // ==================== 헬퍼 메서드 ====================
  
  private findArucoMarkers(frame: any): any[] {
    // TODO: ArUco 마커 감지 구현
    return [];
  }

  private computeHomography(markers: any[]): number[][] {
    // TODO: OpenCV homography 계산
    return [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  }

  private calculateReprojectionError(markers: any[]): number {
    // TODO: 리프로젝션 에러 계산
    return 0.5;
  }

  private extractDisplayRegion(frame: any): any {
    // TODO: 호모그래피로 디스플레이 영역 추출
    return frame;
  }

  private performOCR(region: any): string {
    // TODO: OCR 수행
    return '';
  }

  private extractPowerLevel(text: string): number | undefined {
    // TODO: 텍스트에서 출력 단계 추출 (1-9)
    return undefined;
  }

  private extractTimer(text: string): number | undefined {
    // TODO: 텍스트에서 타이머 추출
    return undefined;
  }

  /**
   * Base64 이미지에서 YOLOv10 추론 실행
   */
  private async runYOLOv10FromBase64(base64Image: string): Promise<YOLODetection[]> {
    if (!this.modelLoaded || !this.yoloSession) {
      console.warn('[YOLO] ONNX 모델이 로드되지 않았습니다.');
      return [];
    }

    try {
      console.log('[YOLO] 추론 시작...');
      
      // 1. Base64 이미지를 전처리 (640x640, 정규화)
      const inputTensor = await this.preprocessImageFromBase64(base64Image);
      console.log('[YOLO] 입력 텐서 생성 완료:', inputTensor.dims);
      
      // 2. ONNX 추론 실행
      const feeds: Record<string, Tensor> = {};
      feeds[this.yoloSession.inputNames[0]] = inputTensor;
      
      const results = await this.yoloSession.run(feeds);
      const outputTensor = results[this.yoloSession.outputNames[0]];
      console.log('[YOLO] 추론 완료, 출력 shape:', outputTensor.dims);
      
      // 3. 후처리 (NMS, 좌표 변환) - 네이티브 NMS 사용
      const detections = await this.postprocessOutput(
        outputTensor,
        640,
        640
      );
      
      console.log('[YOLO] 감지된 객체 수:', detections.length);
      if (detections.length > 0) {
        console.log('[YOLO] 첫 번째 감지:', detections[0]);
      }
      
      return detections;
    } catch (error) {
      console.error('[YOLO] 추론 실패:', error);
      return [];
    }
  }

  /**
   * YOLOv10 추론 실행 (레거시)
   */
  private async runYOLOv10(frame: any): Promise<YOLODetection[]> {
    return [];
  }

  /**
   * Base64 이미지를 YOLO 입력 텐서로 변환
   */
  private async preprocessImageFromBase64(base64Image: string): Promise<Tensor> {
    const inputSize = this.MODEL_INPUT_SIZE;
    
    try {
      // 네이티브 모듈을 사용하여 이미지 디코딩 및 RGB 변환
      const result = await ImageProcessor.decodeImageToRGB(
        base64Image,
        inputSize,
        inputSize
      );
      
      console.log('[YOLO] 네이티브 모듈로 이미지 디코딩 완료:', {
        width: result.width,
        height: result.height,
        channels: result.channels,
        dataLength: result.data.length,
      });
      
      // Float32Array로 변환하고 0-1로 정규화
      const inputData = new Float32Array(result.data.length);
      for (let i = 0; i < result.data.length; i++) {
        inputData[i] = result.data[i] / 255.0;
      }
      
      return new Tensor('float32', inputData, [1, 3, inputSize, inputSize]);
    } catch (error) {
      console.error('[YOLO] 네이티브 모듈 이미지 디코딩 실패:', error);
      
      // Fallback: 빈 텐서 반환
      const inputData = new Float32Array(1 * 3 * inputSize * inputSize);
      for (let i = 0; i < inputData.length; i++) {
        inputData[i] = 0;
      }
      
      return new Tensor('float32', inputData, [1, 3, inputSize, inputSize]);
    }
  }

  /**
   * 프레임 전처리 (레거시 - 사용 안함)
   */
  private async preprocessFrame(frame: any): Promise<Tensor> {
    const inputSize = this.MODEL_INPUT_SIZE;
    const inputData = new Float32Array(1 * 3 * inputSize * inputSize);
    for (let i = 0; i < inputData.length; i++) {
      inputData[i] = 0;
    }
    return new Tensor('float32', inputData, [1, 3, inputSize, inputSize]);
  }

  /**
   * 출력 후처리 (NMS 적용 및 좌표 변환)
   */
  private async postprocessOutput(
    output: Tensor,
    originalWidth: number,
    originalHeight: number,
    cropInfo?: { cropX: number; cropY: number; cropSize: number }
  ): Promise<YOLODetection[]> {
    const detections: YOLODetection[] = [];
    
    try {
      // YOLOv10 출력 형식: [1, 84, 8400] or [1, 8400, 84] or [1, 5, 8400] (손 1개 클래스)
      // 또는 [1, N, 6] (NMS가 적용된 형식: x, y, w, h, confidence, class_id)
      const data = output.data as Float32Array;
      const shape = output.dims;
      
      console.log('[YOLO] 후처리 시작, shape:', shape, 'data length:', data.length);
      
      // [1, N, 6] 형식 (NMS가 이미 적용된 형식) - 새로운 모델
      if (shape.length === 3 && shape[2] === 6) {
        const numDetections = shape[1];
        console.log(`[YOLO] NMS 적용된 모델 감지 [1, ${numDetections}, 6]`);
        
        for (let i = 0; i < numDetections; i++) {
          // 데이터 인덱싱: data[i * 6 + offset]
          const x1 = data[i * 6 + 0];
          const y1 = data[i * 6 + 1];
          const x2 = data[i * 6 + 2];
          const y2 = data[i * 6 + 3];
          const confidence = data[i * 6 + 4];
          const classId = Math.round(data[i * 6 + 5]);
          
          // 신뢰도 체크
          if (confidence > this.CONFIDENCE_THRESHOLD) {
            // 좌표 변환: x1,y1,x2,y2 -> x,y,w,h
            const width = x2 - x1;
            const height = y2 - y1;
            
            // crop 정보를 고려한 좌표 변환
            let finalX, finalY, finalWidth, finalHeight;
            
            if (cropInfo) {
              // 1. MODEL_INPUT_SIZE (640) -> cropSize로 스케일
              const scale = cropInfo.cropSize / this.MODEL_INPUT_SIZE;
              const croppedX = x1 * scale;
              const croppedY = y1 * scale;
              const croppedW = width * scale;
              const croppedH = height * scale;
              
              // 2. crop offset 추가하여 원본 이미지 좌표로 변환
              finalX = croppedX + cropInfo.cropX;
              finalY = croppedY + cropInfo.cropY;
              finalWidth = croppedW;
              finalHeight = croppedH;
            } else {
              // crop 정보 없으면 직접 스케일링
              const scaleX = originalWidth / this.MODEL_INPUT_SIZE;
              const scaleY = originalHeight / this.MODEL_INPUT_SIZE;
              finalX = x1 * scaleX;
              finalY = y1 * scaleY;
              finalWidth = width * scaleX;
              finalHeight = height * scaleY;
            }
            
            detections.push({
              bbox: {
                x: finalX,
                y: finalY,
                width: finalWidth,
                height: finalHeight,
                centerX: finalX + finalWidth / 2,
                centerY: finalY + finalHeight / 2,
              },
              confidence,
              class: classId,
              className: this.CLASS_NAMES[classId] || `class_${classId}`,
            });
            
            console.log(`[YOLO] Detection ${i}: ${this.CLASS_NAMES[classId]} (conf: ${(confidence * 100).toFixed(1)}%)`);
          }
        }
        
        console.log(`[YOLO] ${detections.length}개 감지됨 (신뢰도 > ${this.CONFIDENCE_THRESHOLD})`);
        return detections;
      }
      
      // 출력 shape에 따라 처리
      let numDetections = 0;
      let numClasses = 0;
      
      // YOLOv10 출력 형식: [1, N, 8400] where N = 4 + num_classes
      if (shape.length === 3 && shape[2] === 8400) {
        numDetections = shape[2];
        numClasses = shape[1] - 4;
        console.log(`[YOLO] YOLOv10 모델 감지 [1, ${shape[1]}, 8400], 클래스 수: ${numClasses}, detections: ${numDetections}`);
      } else if (shape[1] === 84) {
        // [1, 84, 8400] 형식 (COCO 80 클래스)
        numDetections = shape[2];
        numClasses = shape[1] - 4;
        console.log('[YOLO] 멀티클래스 모델 [1, 84, 8400], detections:', numDetections);
      } else if (shape[2] === 84) {
        // [1, 8400, 84] 형식
        numDetections = shape[1];
        numClasses = shape[2] - 4;
        console.log('[YOLO] 멀티클래스 모델 [1, 8400, 84], detections:', numDetections);
      } else {
        console.warn('[YOLO] 알 수 없는 출력 형식:', shape);
        return [];
      }
      
      // NMS를 위한 임시 배열
      const boxes: Array<[number, number, number, number, number, number]> = [];
      
      // 각 detection 처리
      let highConfCount = 0;
      for (let i = 0; i < Math.min(numDetections, 8400); i++) {
        // YOLOv10 출력: [1, N, 8400] 형식 (N = 4 + num_classes)
        // 데이터는 [cx, cy, w, h, class1_conf, class2_conf, ...] 순서로 각 detection마다 배열됨
        // 인덱싱: data[feature_idx * numDetections + detection_idx]
        
        const cx = data[0 * numDetections + i];
        const cy = data[1 * numDetections + i];
        const w = data[2 * numDetections + i];
        const h = data[3 * numDetections + i];
        
        // 클래스별 신뢰도 확인
        let maxConfidence = 0;
        let maxClass = 0;
        
        for (let c = 0; c < numClasses; c++) {
          const confidence = data[(4 + c) * numDetections + i];
          if (confidence > maxConfidence) {
            maxConfidence = confidence;
            maxClass = c;
          }
        }
        
        // 높은 신뢰도 카운트 (디버깅용)
        if (maxConfidence > 0.3) {
          highConfCount++;
          if (highConfCount <= 3) {
            console.log(`[YOLO] Detection ${i}: conf=${maxConfidence.toFixed(3)}, cx=${cx.toFixed(1)}, cy=${cy.toFixed(1)}, w=${w.toFixed(1)}, h=${h.toFixed(1)}`);
          }
        }
        
        // 신뢰도 임계값 체크
        if (maxConfidence > this.CONFIDENCE_THRESHOLD) {
          // crop 정보를 고려한 좌표 변환
          let finalX, finalY, finalWidth, finalHeight;
          
          if (cropInfo) {
            // 1. MODEL_INPUT_SIZE (640) -> cropSize로 스케일
            const scale = cropInfo.cropSize / this.MODEL_INPUT_SIZE;
            const croppedX = (cx - w / 2) * scale;
            const croppedY = (cy - h / 2) * scale;
            const croppedW = w * scale;
            const croppedH = h * scale;
            
            // 2. crop offset 추가하여 원본 이미지 좌표로 변환
            finalX = croppedX + cropInfo.cropX;
            finalY = croppedY + cropInfo.cropY;
            finalWidth = croppedW;
            finalHeight = croppedH;
          } else {
            // crop 정보 없으면 직접 스케일링
            const scaleX = originalWidth / this.MODEL_INPUT_SIZE;
            const scaleY = originalHeight / this.MODEL_INPUT_SIZE;
            finalX = (cx - w / 2) * scaleX;
            finalY = (cy - h / 2) * scaleY;
            finalWidth = w * scaleX;
            finalHeight = h * scaleY;
          }
          
          boxes.push([
            finalX,         // x
            finalY,         // y
            finalWidth,     // width
            finalHeight,    // height
            maxConfidence,  // confidence
            maxClass        // class
          ]);
        }
      }
      
      console.log(`[YOLO] 신뢰도 > 0.3: ${highConfCount}개, 신뢰도 > ${this.CONFIDENCE_THRESHOLD}: ${boxes.length}개`);
      
      // 네이티브 NMS 적용 (최적화)
      const nmsBoxes = await ImageProcessor.applyNMS(boxes, this.IOU_THRESHOLD);
      console.log(`[YOLO] NMS 후: ${nmsBoxes.length}개 (네이티브 처리)`);
      
      // 최종 detection 형식으로 변환
      for (const box of nmsBoxes) {
        const [x, y, width, height, confidence, classId] = box;
        detections.push({
          bbox: {
            x,
            y,
            width,
            height,
            centerX: x + width / 2,
            centerY: y + height / 2,
          },
          confidence,
          class: classId,
          className: this.CLASS_NAMES[classId] || `class_${classId}`,
        });
      }
    } catch (error) {
      console.error('후처리 실패:', error);
    }
    
    return detections;
  }

  /**
   * NMS (Non-Maximum Suppression) 구현 - 네이티브 모듈로 이동됨
   * 이 메서드는 더 이상 사용되지 않으며, ImageProcessor.applyNMS를 사용합니다.
   * @deprecated Use ImageProcessor.applyNMS instead
   */

  private transformPoint(point: { x: number; y: number }): { x: number; y: number } {
    // TODO: 호모그래피로 좌표 변환
    return point;
  }

  private matchButtonRegion(position: { x: number; y: number }): string | undefined {
    // TODO: 버튼 영역 정의 및 매칭
    // 예: 전원 버튼, +, -, 타이머 등
    return undefined;
  }

  private matchBurnerRegion(position: { x: number; y: number }): BurnerPosition | undefined {
    // 1구 인덕션 - 화면 중앙 영역을 버너로 정의
    // 640x640 이미지에서 중앙 400x400 영역을 버너로 간주
    const minX = 120;
    const maxX = 520;
    const minY = 120;
    const maxY = 520;
    
    if (position.x >= minX && position.x <= maxX && 
        position.y >= minY && position.y <= maxY) {
      console.log('[VISION] 손이 버너 위에 있음');
      return BurnerPosition.FRONT_LEFT; // 1구 인덕션이므로 FRONT_LEFT 사용
    }
    
    return undefined;
  }

  private getEmptyOCR(timestamp: number): OCRResult {
    return {
      hasResidualHeatIcon: false,
      confidence: 0,
      timestamp,
    };
  }

  /**
   * 정리
   */
  async cleanup(): Promise<void> {
    this.stop();
    this.homographyMatrix = undefined;
    
    // ONNX 세션 정리
    if (this.yoloSession) {
      try {
        await this.yoloSession.release();
        this.yoloSession = undefined;
        this.modelLoaded = false;
      } catch (error) {
        console.error('ONNX 세션 정리 실패:', error);
      }
    }
  }
}

