/**
 * Vision Camera Hook
 * 카메라 프레임 처리 및 워크렛 통합
 */

import { useEffect, useState, useRef } from 'react';
import { useCameraDevice, useFrameProcessor, Camera } from 'react-native-vision-camera';
import { Dimensions } from 'react-native';
import { VisionService } from '@/services/VisionService';
import { VisionResult } from '@/types';
import { useAppStore } from '@/store/useAppStore';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const useVisionCamera = (
  onResult: (result: VisionResult) => void
) => {
  const device = useCameraDevice('back');
  const [isReady, setIsReady] = useState(false);
  const visionService = VisionService.getInstance();
  const processingTimerRef = useRef<NodeJS.Timeout>();
  const cameraRef = useRef<Camera>(null);
  const onResultRef = useRef(onResult);
  const isInitializedRef = useRef(false);
  const isProcessingRef = useRef(false); // 병렬 처리 방지 플래그
  const setLatestCapturedImage = useAppStore((state) => state.setLatestCapturedImage);

  // onResult가 바뀔 때마다 ref 업데이트
  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    // 중복 초기화 방지
    if (isInitializedRef.current) {
      console.log('[CAMERA] 이미 초기화됨, 스킵');
      return;
    }

    const initialize = async () => {
      try {
        const granted = await visionService.requestPermissions();
        if (granted) {
          visionService.start((result) => onResultRef.current(result));
          setIsReady(true);
          isInitializedRef.current = true;
          console.log('[CAMERA] 비전 서비스 시작');
          
          // 카메라가 준비될 때까지 대기 후 타이머 시작
          setTimeout(() => {
            console.log('[CAMERA] 스냅샷 캡처 타이머 시작');
            
            // 타이머 기반 스냅샷 캡처 및 처리 (2fps - 부하 고려)
            processingTimerRef.current = setInterval(async () => {
              try {
                // 병렬 처리 방지: 이전 추론이 완료되기 전까지 새 추론 시작하지 않음
                if (isProcessingRef.current) {
                  console.log('[CAMERA] 이전 처리 진행 중, 스킵');
                  return;
                }

                if (cameraRef.current) {
                  isProcessingRef.current = true; // 처리 시작
                  
                  try {
                    // 카메라 사진 캡처
                    const photo = await cameraRef.current.takePhoto({
                      qualityPrioritization: 'speed',
                      flash: 'off',
                      enableShutterSound: false, // 셔터 소리 끄기
                    });
                    
                    if (photo && photo.path) {
                      const orientation = (photo as any).orientation || 'portrait';
                      const imagePath = 'file://' + photo.path;
                      console.log('[CAMERA] 사진 캡처됨:', {
                        width: photo.width,
                        height: photo.height,
                        path: photo.path,
                        orientation
                      });
                      
                      // 캡쳐한 이미지 경로를 store에 저장 (화면 표시용)
                      setLatestCapturedImage(imagePath);
                      
                      // 사진을 VisionService에 전달 (orientation 정보 포함)
                      const result = await visionService.processSnapshot(imagePath, orientation);
                      if (result) {
                        onResultRef.current(result);
                      }
                    }
                  } finally {
                    isProcessingRef.current = false; // 처리 완료
                  }
                }
              } catch (error) {
                console.error('[CAMERA] 스냅샷 캡처 에러:', error);
                isProcessingRef.current = false; // 에러 시에도 플래그 해제
              }
            }, 1000); // 1fps (1초마다, 부하 감소)
          }, 1500); // 1.5초 후 타이머 시작 (Camera 마운트 대기)
        } else {
          console.warn('[CAMERA] 카메라 권한이 거부되었습니다.');
          setIsReady(false);
        }
      } catch (error) {
        console.error('[CAMERA] 카메라 초기화 실패:', error);
        setIsReady(false);
      }
    };

    initialize();

    return () => {
      console.log('[CAMERA] cleanup');
      if (processingTimerRef.current) {
        clearInterval(processingTimerRef.current);
      }
      isInitializedRef.current = false;
      visionService.stop();
    };
  }, []); // 빈 dependency - 한 번만 실행

  // Frame Processor (사용 안함)
  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    // 스냅샷 기반 처리를 사용
  }, []);

  return {
    device,
    isReady,
    frameProcessor,
    cameraRef, // Camera ref 반환
  };
};

