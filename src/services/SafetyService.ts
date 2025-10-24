/**
 * 안전 경보 시스템 서비스
 * 온도, OCR, 손 인식 데이터를 융합하여 안전 경보 생성
 */

import {
  AlertLevel,
  SafetyAlert,
  BurnerState,
  TemperatureData,
  HandDetection,
  BurnerPosition,
  SystemConfig,
  YOLODetection,
} from '@/types';
import { ALERT_MESSAGES, BUTTON_NAMES } from '@/utils/constants';
import { AccessibilityService } from './AccessibilityService';

export class SafetyService {
  private static instance: SafetyService;
  private accessibilityService: AccessibilityService;
  private lastAlertTime: Map<string, number> = new Map();
  private lastAnnouncedButton: Map<string, number> = new Map();

  private constructor() {
    this.accessibilityService = AccessibilityService.getInstance();
  }

  static getInstance(): SafetyService {
    if (!SafetyService.instance) {
      SafetyService.instance = new SafetyService();
    }
    return SafetyService.instance;
  }

  /**
   * 손 위치 체크 및 경보 생성
   */
  checkHandPosition(
    hand: HandDetection,
    burners: BurnerState[]
  ): SafetyAlert[] {
    const alerts: SafetyAlert[] = [];

    if (!hand.detected) {
      return alerts;
    }

    // 손이 뜨거운 버너 위에 있는 경우 (5초마다 한 번 알림)
    if (hand.onBurner) {
      const burner = burners.find((b) => b.position === hand.onBurner);
      if (burner && (burner.isActive || burner.hasResidualHeat)) {
        const alertKey = `heat_${hand.onBurner}`;
        
        // 5초마다 한 번씩만 알림
        if (this.shouldCreateAlert(alertKey, 5000)) {
          const alert: SafetyAlert = {
            level: AlertLevel.WARNING,
            message: ALERT_MESSAGES.RESIDUAL_HEAT,
            burner: hand.onBurner,
            timestamp: Date.now(),
          };
          alerts.push(alert);
          
          // 경고 음성
          this.accessibilityService.speak(alert.message);
        }
      }
    }

    // 손이 버튼 위에 있는 경우 (정보 안내)
    if (hand.onButton) {
      this.accessibilityService.speak(`손이 ${hand.onButton} 위에 있습니다.`);
    }

    // 손이 버튼 아래에 있는지 체크
    if (hand.allDetections && hand.allDetections.length > 0) {
      const belowButtonAlerts = this.checkHandBelowButtons(hand.allDetections);
      alerts.push(...belowButtonAlerts);
    }

    return alerts;
  }

  /**
   * 손이 버튼 바로 아래에 있는지 체크하고 강조 색상 설정
   */
  checkHandBelowButtons(detections: YOLODetection[]): SafetyAlert[] {
    const alerts: SafetyAlert[] = [];

    // 손과 버튼을 분리
    const handDetections = detections.filter(d => d.className === 'fingertip');
    const buttonDetections = detections.filter(d => d.className !== 'fingertip' && d.className !== 'segment');

    if (handDetections.length === 0 || buttonDetections.length === 0) {
      return alerts;
    }

    // 각 손에 대해 바로 위에 있는 버튼 찾기
    for (const hand of handDetections) {
      for (const button of buttonDetections) {
        // 손이 버튼 아래에 있는지 확인:
        // 1. 손의 중심이 버튼보다 아래에 있어야 함 (Y 좌표가 큼)
        // 2. 손의 중심이 버튼의 X 범위 내에 있어야 함 (수평으로 정렬)
        // 3. 수직 거리가 적절해야 함 (너무 멀지 않아야 함)
        
        const handCenterX = hand.bbox.centerX;
        const handCenterY = hand.bbox.centerY;
        const buttonCenterX = button.bbox.centerX;
        const buttonCenterY = button.bbox.centerY;
        const buttonBottom = button.bbox.y + button.bbox.height;

        // X축 정렬 확인: 손이 버튼의 수평 범위 내에 있는지
        const horizontalDistance = Math.abs(handCenterX - buttonCenterX);
        const horizontalThreshold = button.bbox.width * 0.8; // 버튼 너비의 80% 이내

        // Y축 거리 확인: 손이 버튼 아래에 있고 적절한 거리 내에 있는지
        const verticalDistance = handCenterY - buttonBottom;
        const maxVerticalDistance = button.bbox.height * 2; // 버튼 높이의 2배 이내
        const minVerticalDistance = -button.bbox.height * 0.3; // 약간 겹쳐도 허용

        const isBelow = verticalDistance > minVerticalDistance && verticalDistance < maxVerticalDistance;
        const isAligned = horizontalDistance < horizontalThreshold;

        if (isBelow && isAligned) {
          // 바운딩 박스 색상을 보라색으로 변경
          hand.highlightColor = '#9C27B0';  // 보라색
          button.highlightColor = '#9C27B0';  // 보라색
          
          // 버튼 이름 가져오기
          const buttonName = BUTTON_NAMES[button.className] || button.className;
          
          // 중복 안내 방지 (1초 이내에 같은 버튼은 다시 안내하지 않음)
          const lastAnnouncedTime = this.lastAnnouncedButton.get(button.className);
          const now = Date.now();
          const shouldAnnounce = !lastAnnouncedTime || (now - lastAnnouncedTime > 1000);
          
          if (shouldAnnounce) {
            console.log(`[SAFETY] 버튼 안내 시작: ${buttonName}`);
            
            // 버튼 이름 읽어주기
            this.accessibilityService.speak(buttonName);
            console.log('[SAFETY] TTS 호출됨:', buttonName);
            
            // 마지막 안내 시간 기록
            this.lastAnnouncedButton.set(button.className, now);
          } else {
            console.log(`[SAFETY] 버튼 안내 스킵 (중복): ${buttonName}, 마지막 안내 시간: ${lastAnnouncedTime}`);
          }
          
          console.log(`[SAFETY] 손이 ${button.className} 아래 감지 - 보라색 강조:`, {
            handCenter: `(${handCenterX.toFixed(0)}, ${handCenterY.toFixed(0)})`,
            buttonCenter: `(${buttonCenterX.toFixed(0)}, ${buttonCenterY.toFixed(0)})`,
            horizontalDistance: horizontalDistance.toFixed(0),
            verticalDistance: verticalDistance.toFixed(0),
            buttonName,
            announced: shouldAnnounce,
          });
        }
      }
    }

    return alerts;
  }

  /**
   * 중복 경보 방지 헬퍼
   */
  private shouldCreateAlert(key: string, intervalMs: number): boolean {
    const lastTime = this.lastAlertTime.get(key);
    const now = Date.now();
    
    if (!lastTime || now - lastTime >= intervalMs) {
      this.lastAlertTime.set(key, now);
      return true;
    }
    
    return false;
  }

  /**
   * 모든 타이머 정리
   */
  cleanup(): void {
    this.lastAlertTime.clear();
    this.lastAnnouncedButton.clear();
  }
}

