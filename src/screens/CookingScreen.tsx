/**
 * 조리 화면 - 실시간 모니터링 및 경보
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
  PixelRatio,
} from 'react-native';
import { Camera } from 'react-native-vision-camera';
import { useAppStore } from '@/store/useAppStore';
import { useVisionCamera } from '@/hooks/useVisionCamera';
import { BLEService } from '@/services/BLEService';
import { SafetyService } from '@/services/SafetyService';
import { AccessibilityService } from '@/services/AccessibilityService';
import { CookingState, VisionResult, SensorPacket } from '@/types';
import { BURNER_NAMES, APP_CONFIG } from '@/utils/constants';

const { width: SCREEN_WIDTH_DP, height: SCREEN_HEIGHT_DP } = Dimensions.get('window');
const PIXEL_RATIO = PixelRatio.get();
const SCREEN_WIDTH = SCREEN_WIDTH_DP * PIXEL_RATIO; // 실제 픽셀 (1080)
const SCREEN_HEIGHT = SCREEN_HEIGHT_DP * PIXEL_RATIO; // 실제 픽셀 (2340)

console.log('[Screen Info]', {
  dp: `${SCREEN_WIDTH_DP}x${SCREEN_HEIGHT_DP}`,
  pixelRatio: PIXEL_RATIO,
  actualPixels: `${SCREEN_WIDTH}x${SCREEN_HEIGHT}`
});

interface CookingScreenProps {
  navigation: any;
}

export const CookingScreen: React.FC<CookingScreenProps> = ({ navigation }) => {
  const {
    cookingState,
    burners,
    currentAlerts,
    systemConfig,
    latestVisionResult,
    setCookingState,
    updateBurner,
    addAlert,
    endSession,
    setLatestVisionResult,
  } = useAppStore();

  const [isMonitoring, setIsMonitoring] = useState(false);
  
  const bleService = BLEService.getInstance();
  const safetyService = SafetyService.getInstance();
  const accessibilityService = AccessibilityService.getInstance();

  // 비전 처리 결과 핸들러
  const handleVisionResult = (result: VisionResult) => {
    try {
      // Store에 최신 결과 저장
      setLatestVisionResult(result);
      
      // 디버깅: 손 감지 결과 로그
      if (result?.hand?.detected) {
        console.log('[UI] 버튼 감지 결과:', {
          detected: result.hand.detected,
          allDetections: result.hand.allDetections?.length || 0,
          firstDetection: result.hand.allDetections?.[0],
        });
        
        if (result.hand.allDetections && result.hand.allDetections.length > 0) {
          console.log('[UI] 첫 번째 바운딩 박스:', result.hand.allDetections[0].bbox);
        }
      } else {
        console.log('[UI] 버튼 감지 안됨');
      }
      
      // 포즈 품질 체크
      if (result?.pose?.status === 'FAIL') {
        accessibilityService.speak('카메라가 기울어져 있습니다.');
      }

      // OCR 결과 처리
      if (result?.ocr && result.ocr.confidence > systemConfig.ocrConfidenceThreshold) {
        // TODO: OCR 결과로 버너 상태 업데이트
      }

      // 손 감지 처리
      if (result?.hand?.detected) {
        const alerts = safetyService.checkHandPosition(result.hand, burners);
        alerts.forEach(alert => addAlert(alert));
      }

      // LED 밝기 자동 조정
      // TODO: VisionService에서 밝기 조정값 계산 후 BLE로 전송
    } catch (error) {
      console.error('[CookingScreen] Vision 결과 처리 에러:', error);
    }
  };

  // 카메라 Hook
  const { device, isReady, frameProcessor, cameraRef } = useVisionCamera(handleVisionResult);

  // BLE 데이터 수신 핸들러
  useEffect(() => {
    try {
      bleService.onDataReceived((packet: SensorPacket) => {
        try {
          // 온도 데이터로 버너 상태 업데이트
          if (packet?.temperature?.burners) {
            Object.entries(packet.temperature.burners).forEach(([position, temp]) => {
              if (temp !== undefined) {
                updateBurner(position as any, {
                  temperature: temp,
                  hasResidualHeat: temp >= systemConfig.residualHeatThreshold,
                });
              }
            });
          }

          // 안전 체크
          if (packet?.temperature) {
            const residualAlerts = safetyService.checkResidualHeat(burners, systemConfig);
            residualAlerts.forEach(alert => addAlert(alert));

            const overheatingAlerts = safetyService.checkOverheating(
              packet.temperature,
              systemConfig
            );
            overheatingAlerts.forEach(alert => addAlert(alert));
          }
        } catch (error) {
          console.error('[CookingScreen] BLE 데이터 처리 에러:', error);
        }
      });
    } catch (error) {
      console.error('[CookingScreen] BLE 초기화 에러:', error);
    }

    // 무조작 모니터링 시작
    try {
      safetyService.startInactivityMonitor(systemConfig, () => {
        // 무조작 경고 콜백
      });
    } catch (error) {
      console.error('[CookingScreen] 무조작 모니터링 시작 에러:', error);
    }

    return () => {
      try {
        safetyService.stopInactivityMonitor();
      } catch (error) {
        console.error('[CookingScreen] 무조작 모니터링 중지 에러:', error);
      }
    };
  }, [burners, systemConfig]);

  const handleEndCooking = () => {
    Alert.alert(
      '조리 종료',
      '조리를 종료하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '종료',
          onPress: () => {
            endSession();
            accessibilityService.speak('조리가 종료되었습니다. 상판이 뜨거우니 손을 대지 마세요.');
            navigation.goBack();
          },
        },
      ]
    );
  };

  if (!isReady) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>시스템 준비 중...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 카메라 뷰 - 정사각형으로 제한 */}
      <View style={styles.cameraContainer}>
        {device ? (
          <Camera
            ref={cameraRef}
            style={styles.squareCamera}
            device={device}
            isActive={true}
            photo={true}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.squareCamera, styles.mockCamera]}>
            <Text style={styles.mockCameraText}>카메라 준비 중...</Text>
          </View>
        )}
      </View>

      {/* YOLO 바운딩 박스 오버레이 - 카메라 영역에만 표시 */}
      {latestVisionResult?.hand?.detected && latestVisionResult.hand.allDetections && latestVisionResult.hand.allDetections.length > 0 && (
        <View style={styles.boundingBoxSquareContainer}>
          {latestVisionResult.hand.allDetections.map((detection, idx) => {
            // YOLO는 640x640 정사각형으로 추론하고 픽셀 좌표 반환
            // 640x640 좌표를 화면 크기(dp)로 스케일링
            const YOLO_SIZE = 640;
            const scale = SCREEN_WIDTH_DP / YOLO_SIZE;
            
            const left = detection.bbox.x * scale;
            const top = detection.bbox.y * scale;
            const width = detection.bbox.width * scale;
            const height = detection.bbox.height * scale;
            
            // 레이블 위치: 박스 상단 외부에 배치 (최소 여백 확보)
            const labelHeight = 20; // 레이블 높이 추정
            const labelTop = Math.max(2, top - labelHeight - 2); // 화면 상단 여백 2dp
            
            console.log(`[UI] ${detection.className}: ${left.toFixed(0)}, ${top.toFixed(0)} (${width.toFixed(0)}x${height.toFixed(0)})`);
            
            return (
              <React.Fragment key={idx}>
                {/* 바운딩 박스 */}
                <View
                  style={[
                    styles.boundingBox,
                    {
                      left,
                      top,
                      width,
                      height,
                    },
                  ]}
                />
                
                {/* 레이블 (박스 외부 상단) */}
                <View
                  style={[
                    styles.boundingBoxLabelContainer,
                    {
                      left,
                      top: labelTop,
                    },
                  ]}
                >
                  <Text style={styles.boundingBoxLabel}>
                    {detection.className} {(detection.confidence * 100).toFixed(0)}%
                  </Text>
                </View>
              </React.Fragment>
            );
          })}
        </View>
      )}

      {/* 오버레이 UI */}
      <View style={styles.overlay}>
        {/* 상단: 경보 */}
        <View style={styles.alertContainer}>
          {currentAlerts.map((alert, index) => (
            <View key={index} style={[
              styles.alert,
              alert.level === 'EMERGENCY' && styles.alertEmergency,
            ]}>
              <Text style={styles.alertText}>{alert.message}</Text>
            </View>
          ))}
        </View>

        {/* 하단: 상태 카드와 종료 버튼 */}
        <View style={styles.bottomContainer}>
          {/* YOLO 인식 현황 */}
          <View style={styles.visionStatusContainer}>
            {/* 카메라 포즈 상태 */}
            {latestVisionResult?.pose && (
              <View style={[
                styles.statusCard,
                latestVisionResult.pose.status === 'OK' && styles.statusCardGood,
                latestVisionResult.pose.status === 'WARNING' && styles.statusCardWarning,
                latestVisionResult.pose.status === 'FAIL' && styles.statusCardError,
              ]}>
                <Text style={styles.statusLabel}>카메라 포즈</Text>
                <Text style={styles.statusValue}>
                  {latestVisionResult.pose.status === 'OK' ? '✓ 정상' :
                   latestVisionResult.pose.status === 'WARNING' ? '⚠ 주의' :
                   '✗ 불량'}
                </Text>
                <Text style={styles.statusDetail}>
                  마커: {latestVisionResult.pose.markerCount}개
                </Text>
                <Text style={styles.statusDetail}>
                  오차: {latestVisionResult.pose.reprojectionError.toFixed(2)}
                </Text>
              </View>
            )}

            {/* 버튼 감지 상태 (YOLO) */}
            <View style={[
              styles.statusCard,
              latestVisionResult?.hand?.detected ? styles.statusCardGood : styles.statusCardWarning,
            ]}>
              <Text style={styles.statusLabel}>버튼 감지 (YOLO)</Text>
              <Text style={styles.statusValue}>
                {latestVisionResult?.hand?.detected 
                  ? `✓ ${latestVisionResult.hand.allDetections?.length || 1}개 감지` 
                  : '⚠ 감지 안됨'}
              </Text>
              {latestVisionResult?.hand?.detected && latestVisionResult.hand.allDetections && (
                <>
                  {latestVisionResult.hand.allDetections.slice(0, 3).map((det, idx) => (
                    <Text key={idx} style={styles.statusDetail}>
                      {det.className}: {(det.confidence * 100).toFixed(0)}%
                    </Text>
                  ))}
                  {latestVisionResult.hand.allDetections.length > 3 && (
                    <Text style={styles.statusDetail}>
                      +{latestVisionResult.hand.allDetections.length - 3}개 더
                    </Text>
                  )}
                </>
              )}
            </View>
          </View>

          {/* 종료 버튼 */}
          <TouchableOpacity
            style={styles.endButton}
            onPress={handleEndCooking}
            accessibilityLabel="조리 종료 버튼"
          >
            <Text style={styles.endButtonText}>조리 종료</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  cameraContainer: {
    width: SCREEN_WIDTH_DP,
    height: SCREEN_WIDTH_DP, // 정사각형 (dp 단위)
    backgroundColor: '#000000',
  },
  squareCamera: {
    width: SCREEN_WIDTH_DP,
    height: SCREEN_WIDTH_DP, // 정사각형 (dp 단위)
    transform: [{ scale: 0.75 }], // center crop 비율에 맞춤 (3060/4080)
  },
  camera: {
    flex: 1,
  },
  mockCamera: {
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mockCameraText: {
    fontSize: 20,
    color: '#666666',
    fontWeight: '600',
  },
  mockCameraSubtext: {
    fontSize: 14,
    color: '#999999',
    marginTop: 12,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    padding: 20,
    justifyContent: 'space-between',
  },
  bottomContainer: {
    flex: 0,
    justifyContent: 'flex-end',
  },
  loadingText: {
    fontSize: 20,
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 100,
  },
  alertContainer: {
    marginTop: 40,
  },
  alert: {
    backgroundColor: 'rgba(255, 152, 0, 0.9)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  alertEmergency: {
    backgroundColor: 'rgba(244, 67, 54, 0.9)',
  },
  alertText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  visionStatusContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  statusCard: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  statusCardGood: {
    borderColor: '#4CAF50',
  },
  statusCardWarning: {
    borderColor: '#FF9800',
  },
  statusCardError: {
    borderColor: '#F44336',
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  statusValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  statusDetail: {
    fontSize: 12,
    color: '#888888',
    marginBottom: 2,
  },
  dangerText: {
    color: '#F44336',
    fontWeight: 'bold',
  },
  boundingBoxContainer: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'none',
  },
  boundingBoxSquareContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN_WIDTH_DP,
    height: SCREEN_WIDTH_DP, // 정사각형 카메라 영역에만 (dp 단위)
    pointerEvents: 'none',
  },
  boundingBox: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: '#00FF00',
    borderRadius: 4,
    backgroundColor: 'rgba(0, 255, 0, 0.05)',
  },
  boundingBoxLabelContainer: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
  },
  boundingBoxLabel: {
    backgroundColor: '#00FF00',
    color: '#000000',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    fontSize: 10,
    fontWeight: 'bold',
  },
  endButton: {
    backgroundColor: '#F44336',
    paddingVertical: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  endButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

