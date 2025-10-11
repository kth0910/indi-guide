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
}

const { ImageProcessor } = NativeModules;

if (!ImageProcessor) {
  throw new Error(
    'ImageProcessor 네이티브 모듈을 찾을 수 없습니다. ' +
    'Android 네이티브 모듈이 제대로 링크되었는지 확인하세요.'
  );
}

export default ImageProcessor as ImageProcessorModule;

