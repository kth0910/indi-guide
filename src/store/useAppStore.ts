/**
 * 전역 상태 관리 스토어 (Zustand)
 */

import { create } from 'zustand';
import {
  AppState,
  CookingState,
  BurnerState,
  SafetyAlert,
  AlertLevel,
  BurnerPosition,
  CookingLog,
  AccessibilitySettings,
  SystemConfig,
  VisionResult,
} from '@/types';
import { APP_CONFIG } from '@/utils/constants';

interface AppStore extends AppState {
  // 상태 업데이트 액션들
  setCookingState: (state: CookingState) => void;
  updateBurner: (position: BurnerPosition, updates: Partial<BurnerState>) => void;
  addAlert: (alert: SafetyAlert) => void;
  removeAlert: (timestamp: number) => void;
  clearAlerts: () => void;
  setBleConnected: (connected: boolean) => void;
  setCameraReady: (ready: boolean) => void;
  startSession: () => void;
  endSession: () => void;
  addLog: (log: CookingLog) => void;
  
  // Vision 설정
  visionMockMode: boolean;
  setVisionMockMode: (enabled: boolean) => void;
  
  // Vision 결과 저장
  latestVisionResult?: VisionResult;
  setLatestVisionResult: (result: VisionResult) => void;
  
  // 접근성 설정
  accessibilitySettings: AccessibilitySettings;
  updateAccessibilitySettings: (settings: Partial<AccessibilitySettings>) => void;
  
  // 시스템 설정
  systemConfig: SystemConfig;
  updateSystemConfig: (config: Partial<SystemConfig>) => void;
}

const initialBurners: BurnerState[] = [
  {
    position: BurnerPosition.FRONT_LEFT,
    temperature: 0,
    powerLevel: 0,
    isActive: false,
    hasResidualHeat: false,
  },
  {
    position: BurnerPosition.FRONT_RIGHT,
    temperature: 0,
    powerLevel: 0,
    isActive: false,
    hasResidualHeat: false,
  },
  {
    position: BurnerPosition.REAR_LEFT,
    temperature: 0,
    powerLevel: 0,
    isActive: false,
    hasResidualHeat: false,
  },
  {
    position: BurnerPosition.REAR_RIGHT,
    temperature: 0,
    powerLevel: 0,
    isActive: false,
    hasResidualHeat: false,
  },
];

const defaultAccessibilitySettings: AccessibilitySettings = {
  ttsEnabled: true,
  ttsLanguage: 'ko',
  ttsSpeed: 1.0,
  vibrationEnabled: true,
  vibrationIntensity: 'medium',
  largeButtons: true,
  highContrast: false,
};

const defaultSystemConfig: SystemConfig = {
  residualHeatThreshold: 60,
  safeTemperature: 45,
  overheatingThreshold: 300,
  ocrConfidenceThreshold: 0.8,
  poseErrorThreshold: 1.5,
  inactivityWarningTime: 600,
};

export const useAppStore = create<AppStore>((set, get) => ({
  // 초기 상태
  cookingState: CookingState.IDLE,
  burners: initialBurners,
  currentAlerts: [],
  bleConnected: false,
  cameraReady: false,
  sessionStartTime: undefined,
  logs: [],
  accessibilitySettings: defaultAccessibilitySettings,
  systemConfig: defaultSystemConfig,
  visionMockMode: APP_CONFIG.VISION_MOCK_MODE, // 초기값은 constants에서
  latestVisionResult: undefined,

  // 액션들
  setCookingState: (state: CookingState) => {
    set({ cookingState: state });
  },

  updateBurner: (position: BurnerPosition, updates: Partial<BurnerState>) => {
    set((state) => ({
      burners: state.burners.map((burner) =>
        burner.position === position
          ? { ...burner, ...updates }
          : burner
      ),
    }));
  },

  addAlert: (alert: SafetyAlert) => {
    set((state) => ({
      currentAlerts: [...state.currentAlerts, alert],
    }));
  },

  removeAlert: (timestamp: number) => {
    set((state) => ({
      currentAlerts: state.currentAlerts.filter(
        (alert) => alert.timestamp !== timestamp
      ),
    }));
  },

  clearAlerts: () => {
    set({ currentAlerts: [] });
  },

  setBleConnected: (connected: boolean) => {
    set({ bleConnected: connected });
  },

  setCameraReady: (ready: boolean) => {
    set({ cameraReady: ready });
  },

  startSession: () => {
    set({
      sessionStartTime: Date.now(),
      cookingState: CookingState.PRE_CHECK,
      currentAlerts: [],
      visionMockMode: false, // 조리 시작 시 실제 카메라 모드로 전환
    });
  },

  endSession: () => {
    const state = get();
    const sessionLog: CookingLog = {
      sessionId: `session_${Date.now()}`,
      startTime: state.sessionStartTime || Date.now(),
      endTime: Date.now(),
      maxTemperature: Math.max(...state.burners.map((b) => b.temperature)),
      alerts: state.currentAlerts,
      burnerUsage: state.burners.map((burner) => ({
        burner: burner.position,
        totalTime: 0, // TODO: 실제 사용 시간 추적 구현 필요
        maxPowerLevel: burner.powerLevel,
      })),
    };

    set({
      cookingState: CookingState.IDLE,
      sessionStartTime: undefined,
      currentAlerts: [],
      logs: [...state.logs, sessionLog],
    });
  },

  addLog: (log: CookingLog) => {
    set((state) => ({
      logs: [...state.logs, log],
    }));
  },

  updateAccessibilitySettings: (settings: Partial<AccessibilitySettings>) => {
    set((state) => ({
      accessibilitySettings: { ...state.accessibilitySettings, ...settings },
    }));
  },

  updateSystemConfig: (config: Partial<SystemConfig>) => {
    set((state) => ({
      systemConfig: { ...state.systemConfig, ...config },
    }));
  },

  setVisionMockMode: (enabled: boolean) => {
    set({ visionMockMode: enabled });
  },

  setLatestVisionResult: (result: VisionResult) => {
    set({ latestVisionResult: result });
  },
}));

