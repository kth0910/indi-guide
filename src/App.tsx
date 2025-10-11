/**
 * 메인 애플리케이션 컴포넌트
 */

import React, { useEffect } from 'react';
import { StatusBar, LogBox } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppNavigator } from '@/navigation/AppNavigator';
import { BLEService } from '@/services/BLEService';
import { AccessibilityService } from '@/services/AccessibilityService';
import { useAppStore } from '@/store/useAppStore';

// Frame Processor 관련 로그 무시
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'VisionCamera',
]);

const App: React.FC = () => {
  const { setBleConnected, setCameraReady } = useAppStore();
  
  const bleService = BLEService.getInstance();
  const accessibilityService = AccessibilityService.getInstance();

  useEffect(() => {
    // 앱 초기화
    const initialize = async () => {
      // BLE 초기화
      const bleInitialized = await bleService.initialize();
      if (bleInitialized) {
        // 자동 스캔 및 연결
        const connected = await bleService.scanAndConnect(
          (deviceName) => {
            console.log('디바이스 발견:', deviceName);
          }
        );
        setBleConnected(connected);
      }

      // 카메라는 HomeScreen 또는 CookingScreen에서 초기화
      // 여기서는 기본값으로 준비 상태 설정
      setCameraReady(true);
    };

    initialize();

    // 정리
    return () => {
      bleService.cleanup();
      accessibilityService.cleanup();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" backgroundColor="#2196F3" />
      <AppNavigator />
    </GestureHandlerRootView>
  );
};

export default App;

