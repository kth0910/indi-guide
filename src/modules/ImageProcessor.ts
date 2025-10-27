/**
 * ImageProcessor 네이티브 모듈
 * Base64 또는 URI 이미지를 RGB Float32Array로 변환
 */

import { NativeModules } from 'react-native';

interface ImageProcessorModule {
  /**
   * Base64 인코딩된 이미지를 RGB Float32Array로 변환
   * @param base64Image Base64 인코딩된 이미지 문자열
   * @param targetWidth 목표 너비
   * @param targetHeight 목표 높이
   * @returns RGB 데이터 배열 (NCHW format: [R채널, G채널, B채널])
   */
  decodeImageToRGB(
    base64Image: string,
    targetWidth: number,
    targetHeight: number
  ): Promise<{
    data: number[];
    width: number;
    height: number;
    channels: number;
    cropX?: number;
    cropY?: number;
    cropSize?: number;
    originalWidth?: number;
    originalHeight?: number;
  }>;

  /**
   * URI 경로의 이미지를 RGB Float32Array로 변환
   * @param imageUri 이미지 파일 URI (file:// 형식)
   * @param targetWidth 목표 너비
   * @param targetHeight 목표 높이
   * @param orientation 카메라 orientation
   * @returns RGB 데이터 배열 (NCHW format: [R채널, G채널, B채널]) 및 crop 정보
   */
  decodeImageFromUri(
    imageUri: string,
    targetWidth: number,
    targetHeight: number,
    orientation: string
  ): Promise<{
    data: number[];
    width: number;
    height: number;
    channels: number;
    cropX?: number;
    cropY?: number;
    cropSize?: number;
    originalWidth?: number;
    originalHeight?: number;
  }>;

  /**
   * NMS (Non-Maximum Suppression) 적용
   * @param boxes 감지된 박스 배열 (각 박스: [x, y, width, height, confidence, class])
   * @param iouThreshold IOU 임계값
   * @returns NMS 적용 후 박스 배열
   */
  applyNMS(
    boxes: Array<[number, number, number, number, number, number]>,
    iouThreshold: number
  ): Promise<Array<[number, number, number, number, number, number]>>;

  /**
   * 회전되고 crop된 이미지를 파일로 저장
   * @param imageUri 원본 이미지 URI
   * @param orientation 이미지 orientation
   * @param outputPath 출력 경로
   * @param cropInfo crop 정보
   * @returns 저장된 이미지 경로
   */
  saveRotatedCroppedImage(
    imageUri: string,
    orientation: string,
    outputPath: string,
    cropInfo: { cropX: number; cropY: number; cropSize: number }
  ): Promise<string>;

  /**
   * 바운딩 박스가 그려진 디버그 이미지 생성
   * @param imageUri 원본 이미지 URI
   * @param detections 감지된 객체 배열
   * @param outputPath 출력 이미지 경로
   * @returns 생성된 이미지 경로
   */
  drawBoundingBoxes(
    imageUri: string,
    detections: Array<any>,
    outputPath: string
  ): Promise<string>;
}

const { ImageProcessor } = NativeModules;

if (!ImageProcessor) {
  throw new Error(
    'ImageProcessor 네이티브 모듈을 찾을 수 없습니다. ' +
    'Android 네이티브 모듈이 제대로 링크되었는지 확인하세요.'
  );
}

export default ImageProcessor as ImageProcessorModule;

