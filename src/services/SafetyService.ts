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
} from '@/types';
import { ALERT_MESSAGES, BURNER_NAMES } from '@/utils/constants';
import { AccessibilityService } from './AccessibilityService';

export class SafetyService {
  private static instance: SafetyService;
  private accessibilityService: AccessibilityService;
  private lastAlertTime: Map<string, number> = new Map();
  private inactivityTimer?: NodeJS.Timeout;
  private lastActivityTime: number = Date.now();

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
   * 잔열 체크 및 경보 생성
   */
  checkResidualHeat(
    burners: BurnerState[],
    config: SystemConfig
  ): SafetyAlert[] {
    // 잔열 감지 알림 제거됨
    return [];
  }

  /**
   * 과열 체크 및 경보 생성
   */
  checkOverheating(
    temperature: TemperatureData,
    config: SystemConfig
  ): SafetyAlert[] {
    const alerts: SafetyAlert[] = [];

    // 절대 온도 기준
    if (temperature?.burners) {
      Object.entries(temperature.burners).forEach(([position, temp]) => {
        if (temp && temp >= config.overheatingThreshold) {
          const alert: SafetyAlert = {
            level: AlertLevel.EMERGENCY,
            message: ALERT_MESSAGES.OVERHEATING(
              BURNER_NAMES[position as BurnerPosition]
            ),
            burner: position as BurnerPosition,
            timestamp: Date.now(),
          };
          alerts.push(alert);
          
          // 긴급 경보
          this.accessibilityService.speak(alert.message);
          this.accessibilityService.vibrate('strong');
        }
      });
    }

    // 전체 과열 플래그
    if (temperature?.isOverheating) {
      const alertKey = 'overheating_general';
      if (this.shouldCreateAlert(alertKey, 3000)) {
        const alert: SafetyAlert = {
          level: AlertLevel.WARNING,
          message: '인덕션이 과열되고 있습니다. 주의하세요.',
          timestamp: Date.now(),
        };
        alerts.push(alert);
        this.accessibilityService.speak(alert.message);
        this.accessibilityService.vibrate('medium');
      }
    }

    return alerts;
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

    // 손이 뜨거운 버너 위에 있는 경우
    if (hand.onBurner) {
      const burner = burners.find((b) => b.position === hand.onBurner);
      if (burner && (burner.isActive || burner.hasResidualHeat)) {
        const alert: SafetyAlert = {
          level: AlertLevel.WARNING,
          message: ALERT_MESSAGES.HAND_ON_BURNER(
            BURNER_NAMES[hand.onBurner]
          ),
          burner: hand.onBurner,
          timestamp: Date.now(),
        };
        alerts.push(alert);
        
        // 경고 음성
        this.accessibilityService.speak(alert.message);
        this.accessibilityService.vibrate('medium');
      }
    }

    // 손이 버튼 위에 있는 경우 (정보 안내)
    if (hand.onButton) {
      this.accessibilityService.speak(`손이 ${hand.onButton} 위에 있습니다.`);
    }

    return alerts;
  }

  /**
   * 무조작 시간 체크
   */
  startInactivityMonitor(config: SystemConfig, callback: () => void): void {
    this.resetActivity();
    
    this.inactivityTimer = setInterval(() => {
      const elapsed = Date.now() - this.lastActivityTime;
      if (elapsed >= config.inactivityWarningTime) {
        this.accessibilityService.speak(ALERT_MESSAGES.INACTIVITY);
        this.accessibilityService.vibrate('medium');
        callback();
        this.resetActivity(); // 경고 후 타이머 리셋
      }
    }, 10000); // 10초마다 체크
  }

  stopInactivityMonitor(): void {
    if (this.inactivityTimer) {
      clearInterval(this.inactivityTimer);
      this.inactivityTimer = undefined;
    }
  }

  resetActivity(): void {
    this.lastActivityTime = Date.now();
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
    this.stopInactivityMonitor();
    this.lastAlertTime.clear();
  }
}

