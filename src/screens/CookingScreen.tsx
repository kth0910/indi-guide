/**
 * 조리 화면 - 실시간 모니터링 및 경보
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
  PixelRatio,
  Image,
} from 'react-native';
import { Camera } from 'react-native-vision-camera';
import { useAppStore } from '@/store/useAppStore';
import { useVisionCamera } from '@/hooks/useVisionCamera';
import { BluetoothClassicService } from '@/services/BluetoothClassicService';
import { SafetyService } from '@/services/SafetyService';
import { AccessibilityService } from '@/services/AccessibilityService';
import { CookingState, VisionResult, SensorPacket } from '@/types';
import { APP_CONFIG } from '@/utils/constants';

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
    latestCapturedImage,
    accessibilitySettings,
    setCookingState,
    updateBurner,
    addAlert,
    endSession,
    setLatestVisionResult,
  } = useAppStore();

  const [isMonitoring, setIsMonitoring] = useState(false);
  const [currentTemp, setCurrentTemp] = useState<number>(0);
  const [tempState, setTempState] = useState<'safe' | 'hot'>('safe');
  
  const bluetoothService = BluetoothClassicService.getInstance();
  const safetyService = SafetyService.getInstance();
  const accessibilityService = AccessibilityService.getInstance();

  // AccessibilityService 설정 동기화
  useEffect(() => {
    console.log('[CookingScreen] AccessibilityService 설정 동기화:', accessibilitySettings);
    accessibilityService.updateSettings(accessibilitySettings);
  }, [accessibilitySettings]);

  // 비전 처리 결과 핸들러
  const handleVisionResult = (result: VisionResult) => {
    try {
      // Store에 최신 결과 저장
      setLatestVisionResult(result);
      
      // 디버깅: 손 감지 결과 로그
      if (result?.hand?.detected) {
      console.log('[UI] ✅ 버튼 감지 결과:', {
        detected: result.hand.detected,
        allDetections: result.hand.allDetections?.length || 0,
      });
      
      if (result.hand.allDetections && result.hand.allDetections.length > 0) {
        console.log('[UI] 📦 감지된 객체들:');
        result.hand.allDetections.forEach((det, idx) => {
          console.log(`  [${idx}] ${det.className}: conf=${(det.confidence * 100).toFixed(1)}% bbox=(${Math.round(det.bbox.x)}, ${Math.round(det.bbox.y)}, ${Math.round(det.bbox.width)}x${Math.round(det.bbox.height)})`);
        });
        console.log('[UI] 화면 크기 (픽셀):', {
          width: SCREEN_WIDTH,
          height: SCREEN_HEIGHT,
          dp: `${SCREEN_WIDTH_DP}x${SCREEN_HEIGHT_DP}`,
        });
      }
    } else {
      console.log('[UI] ❌ 버튼 감지 안됨');
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

  // 블루투스 데이터 수신 콜백 (useCallback으로 안정적인 참조 유지)
  const handleBluetoothData = useCallback((packet: SensorPacket) => {
    try {
      console.log('[CookingScreen] 📡 블루투스 데이터 수신:', JSON.stringify(packet));
      
      // 온도 데이터 처리
      if (packet?.temperature) {
        // 온도 값 저장
        let temp = packet.temperature.centerTemp || 0;
        
        // centerTemp가 없으면 burners 중 첫 번째 값 사용
        if (!temp && packet.temperature.burners) {
          const temps = Object.values(packet.temperature.burners).filter(t => t !== undefined);
          if (temps.length > 0) {
            temp = temps[0] as number;
          }
        }
        
        console.log('[CookingScreen] 현재 온도:', temp);
        setCurrentTemp(temp);
        
        // ⭐ Arduino에서 전송한 state 값으로만 판단
        const state = packet.temperature.state || 'safe';
        console.log('[CookingScreen] ✅ Arduino state:', state);
        setTempState(state);
        
        // state가 'hot'이면 음성 안내 (5초마다)
        if (state === 'hot') {
          safetyService.announceHeat();
        }
        
        // 버너 상태 업데이트 (state 기반)
        if (packet.temperature.burners) {
          console.log('[CookingScreen] 버너 온도:', packet.temperature.burners);
          Object.entries(packet.temperature.burners).forEach(([position, temp]) => {
            if (temp !== undefined) {
              updateBurner(position as any, {
                temperature: temp,
                hasResidualHeat: state === 'hot', // state 기반으로 판단
              });
            }
          });
        }
      }
    } catch (error) {
      console.error('[CookingScreen] 블루투스 데이터 처리 에러:', error);
    }
  }, [burners, systemConfig, updateBurner, addAlert, safetyService]);

  // 블루투스 데이터 수신 핸들러 등록
  useEffect(() => {
    console.log('[CookingScreen] 블루투스 데이터 수신 핸들러 등록');
    
    try {
      bluetoothService.onDataReceived(handleBluetoothData);
      console.log('[CookingScreen] ✅ 콜백 등록 완료');
      console.log('[CookingScreen] 블루투스 연결 상태:', bluetoothService.getConnectionStatus());
    } catch (error) {
      console.error('[CookingScreen] 블루투스 초기화 에러:', error);
    }
  }, [handleBluetoothData, safetyService, systemConfig]);

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
      {/* 백그라운드 카메라 (숨김 - 캡쳐만 수행) */}
      {device && (
        <Camera
          ref={cameraRef}
          style={styles.hiddenCamera}
          device={device}
          isActive={true}
          photo={true}
        />
      )}
      
      {/* YOLO 디버그 이미지 (바운딩 박스 포함) 또는 원본 이미지 뷰 */}
      <View style={styles.cameraContainer}>
        {latestVisionResult?.hand?.debugImagePath ? (
          // YOLO 바운딩 박스가 그려진 디버그 이미지
          <Image
            source={{ uri: latestVisionResult.hand.debugImagePath }}
            style={styles.squareCamera}
            resizeMode="cover"
          />
        ) : latestCapturedImage ? (
          // 원본 이미지 (YOLO 처리 전)
          <Image
            source={{ uri: latestCapturedImage }}
            style={styles.squareCamera}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.squareCamera, styles.mockCamera]}>
            <Text style={styles.mockCameraText}>이미지 로딩 중...</Text>
          </View>
        )}
      </View>

      {/* 바운딩 박스 오버레이는 이제 사용하지 않음 (이미지에 직접 그려짐) */}
      {false && latestVisionResult?.hand?.detected && latestVisionResult.hand.allDetections && latestVisionResult.hand.allDetections.length > 0 && (
        <View style={styles.boundingBoxSquareContainer}>
          {latestVisionResult.hand.allDetections.map((detection, idx) => {
            // VisionService는 원본 이미지 픽셀 좌표로 반환
            // 원본 이미지는 정사각형(center crop)이므로 짧은 쪽을 기준으로 스케일
            const imageSize = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT); // 원본 정사각형 크기
            const scale = SCREEN_WIDTH_DP / imageSize; // 픽셀 -> dp 변환
            
            const left = detection.bbox.x * scale;
            const top = detection.bbox.y * scale;
            const width = detection.bbox.width * scale;
            const height = detection.bbox.height * scale;
            
            // 레이블 위치: 박스 상단 외부에 배치 (최소 여백 확보)
            const labelHeight = 20; // 레이블 높이 추정
            const labelTop = Math.max(2, top - labelHeight - 2); // 화면 상단 여백 2dp
            
            // 강조 색상 (손이 버튼 아래에 있을 때 보라색, 기본은 초록색)
            const boxColor = detection.highlightColor || '#00FF00';
            const isHighlighted = !!detection.highlightColor;
            
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
                      borderColor: boxColor,
                      backgroundColor: isHighlighted 
                        ? 'rgba(156, 39, 176, 0.1)'  // 보라색 반투명
                        : 'rgba(0, 255, 0, 0.05)',   // 초록색 반투명
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
                  <Text style={[
                    styles.boundingBoxLabel,
                    {
                      backgroundColor: boxColor,
                      color: isHighlighted ? '#FFFFFF' : '#000000',
                    }
                  ]}>
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
          {/* 블루투스 온도 및 YOLO 인식 현황 */}
          <View style={styles.visionStatusContainer}>
            {/* 블루투스 온도 데이터 */}
            <View style={[
              styles.statusCard,
              bluetoothService.getConnectionStatus() ? styles.statusCardGood : styles.statusCardError,
              tempState === 'safe' ? styles.statusBorderSafe : styles.statusBorderHot,
            ]}>
              <Text style={styles.statusLabel}>인덕션 온도</Text>
              {bluetoothService.getConnectionStatus() ? (
                <>
                  <Text style={[
                    styles.statusValue,
                    tempState === 'hot' && styles.statusValueHot,
                  ]}>
                    {currentTemp > 0 ? `${currentTemp.toFixed(1)}°C` : '대기 중...'}
                  </Text>
                  <Text style={styles.statusDetail}>
                    상태: {tempState === 'safe' ? '✓ 안전' : '⚠ 뜨거움'}
                  </Text>
                </>
              ) : (
                <Text style={styles.statusValue}>✗ 연결 안됨</Text>
              )}
            </View>

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
  hiddenCamera: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  cameraContainer: {
    width: SCREEN_WIDTH_DP,
    height: SCREEN_WIDTH_DP, // 정사각형 (dp 단위)
    backgroundColor: '#000000',
  },
  squareCamera: {
    width: SCREEN_WIDTH_DP,
    height: SCREEN_WIDTH_DP, // 정사각형 (dp 단위)
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
  statusBorderSafe: {
    borderColor: '#4CAF50',
    borderWidth: 3,
  },
  statusBorderHot: {
    borderColor: '#F44336',
    borderWidth: 3,
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
  statusValueHot: {
    color: '#F44336',
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

