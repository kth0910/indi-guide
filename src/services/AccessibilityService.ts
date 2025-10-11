/**
 * 접근성 서비스 (TTS, 진동)
 */

import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { AccessibilitySettings } from '@/types';

type VibrationPattern = 'light' | 'medium' | 'strong';

export class AccessibilityService {
  private static instance: AccessibilityService;
  private settings: AccessibilitySettings;
  private isSpeaking: boolean = false;
  private speechQueue: string[] = [];

  private constructor() {
    this.settings = {
      ttsEnabled: true,
      ttsLanguage: 'ko',
      ttsSpeed: 1.0,
      vibrationEnabled: true,
      vibrationIntensity: 'medium',
      largeButtons: true,
      highContrast: false,
    };
    
    this.initializeTts();
  }

  static getInstance(): AccessibilityService {
    if (!AccessibilityService.instance) {
      AccessibilityService.instance = new AccessibilityService();
    }
    return AccessibilityService.instance;
  }

  /**
   * TTS 초기화
   */
  private async initializeTts(): Promise<void> {
    try {
      // expo-speech는 별도의 초기화가 필요 없습니다
      console.log('TTS 초기화 완료');
    } catch (error) {
      console.error('TTS 초기화 실패:', error);
    }
  }

  /**
   * 음성 안내 (큐 방식으로 처리)
   */
  async speak(message: string, force: boolean = false): Promise<void> {
    if (!this.settings.ttsEnabled) {
      return;
    }

    // 긴급 메시지는 현재 음성을 중단하고 즉시 재생
    if (force) {
      this.stopSpeaking();
      this.speechQueue = [];
      this.isSpeaking = true;
      
      try {
        await Speech.speak(message, {
          language: this.settings.ttsLanguage === 'ko' ? 'ko-KR' : 'en-US',
          rate: this.settings.ttsSpeed,
          onDone: () => {
            this.isSpeaking = false;
            this.processNextInQueue();
          },
          onStopped: () => {
            this.isSpeaking = false;
            this.processNextInQueue();
          },
        });
      } catch (error) {
        console.error('TTS 재생 실패:', error);
        this.isSpeaking = false;
      }
      return;
    }

    // 큐에 추가
    if (this.isSpeaking) {
      this.speechQueue.push(message);
    } else {
      this.isSpeaking = true;
      try {
        await Speech.speak(message, {
          language: this.settings.ttsLanguage === 'ko' ? 'ko-KR' : 'en-US',
          rate: this.settings.ttsSpeed,
          onDone: () => {
            this.isSpeaking = false;
            this.processNextInQueue();
          },
          onStopped: () => {
            this.isSpeaking = false;
            this.processNextInQueue();
          },
        });
      } catch (error) {
        console.error('TTS 재생 실패:', error);
        this.isSpeaking = false;
      }
    }
  }

  /**
   * 다음 음성 안내 처리
   */
  private async processNextInQueue(): Promise<void> {
    if (this.speechQueue.length > 0) {
      const nextMessage = this.speechQueue.shift();
      if (nextMessage) {
        this.isSpeaking = true;
        try {
          await Speech.speak(nextMessage, {
            language: this.settings.ttsLanguage === 'ko' ? 'ko-KR' : 'en-US',
            rate: this.settings.ttsSpeed,
            onDone: () => {
              this.isSpeaking = false;
              this.processNextInQueue();
            },
            onStopped: () => {
              this.isSpeaking = false;
              this.processNextInQueue();
            },
          });
        } catch (error) {
          console.error('TTS 재생 실패:', error);
          this.isSpeaking = false;
        }
      }
    }
  }

  /**
   * 음성 중단
   */
  stopSpeaking(): void {
    Speech.stop();
    this.isSpeaking = false;
  }

  /**
   * 진동 피드백
   */
  async vibrate(pattern: VibrationPattern): Promise<void> {
    if (!this.settings.vibrationEnabled) {
      return;
    }

    try {
      switch (pattern) {
        case 'light':
          // 정보성 알림: 짧게 1회
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        
        case 'medium':
          // 주의: 2회
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setTimeout(async () => {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }, 200);
          break;
        
        case 'strong':
          // 긴급: 길게 연속
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          setTimeout(async () => {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          }, 300);
          setTimeout(async () => {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          }, 600);
          break;
      }
    } catch (error) {
      console.error('진동 피드백 실패:', error);
    }
  }

  /**
   * 설정 업데이트
   */
  async updateSettings(newSettings: Partial<AccessibilitySettings>): Promise<void> {
    this.settings = { ...this.settings, ...newSettings };
    
    // expo-speech는 speak 호출 시 설정을 전달하므로 별도 업데이트 불필요
    console.log('설정 업데이트:', this.settings);
  }

  /**
   * 현재 설정 반환
   */
  getSettings(): AccessibilitySettings {
    return { ...this.settings };
  }

  /**
   * 정리
   */
  cleanup(): void {
    this.stopSpeaking();
    this.speechQueue = [];
  }
}
