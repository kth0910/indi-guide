/**
 * 메인 애플리케이션 컴포넌트
 */

import React, { useEffect } from 'react';
import { StatusBar, LogBox, PermissionsAndroid, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppNavigator } from '@/navigation/AppNavigator';
import { BluetoothClassicService } from '@/services/BluetoothClassicService';
import { AccessibilityService } from '@/services/AccessibilityService';
import { useAppStore } from '@/store/useAppStore';

// Frame Processor 관련 로그 무시
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'VisionCamera',
]);

const App: React.FC = () => {
  const { setBleConnected, setCameraReady } = useAppStore();
  
  const bluetoothService = BluetoothClassicService.getInstance();
  const accessibilityService = AccessibilityService.getInstance();

  useEffect(() => {
    // 앱 초기화
    const initialize = async () => {
      // Android 12+ 블루투스 권한 요청
      if (Platform.OS === 'android' && Platform.Version >= 31) {
        try {
          const granted = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          ]);
          
          console.log('[App] 블루투스 권한 요청 결과:', granted);
          
          const allGranted = Object.values(granted).every(
            (result) => result === PermissionsAndroid.RESULTS.GRANTED
          );
          
          if (!allGranted) {
            console.warn('[App] 일부 블루투스 권한이 거부되었습니다.');
          }
        } catch (error) {
          console.error('[App] 블루투스 권한 요청 실패:', error);
        }
      }
      
      // 블루투스 초기화
      const bluetoothInitialized = await bluetoothService.initialize();
      if (bluetoothInitialized) {
        // indiguide 블루투스 자동 스캔 및 연결
        const connected = await bluetoothService.scanAndConnect(
          (deviceName) => {
            console.log('[App] indiguide 디바이스 발견:', deviceName);
          }
        );
        setBleConnected(connected);
        
        if (connected) {
          console.log('[App] indiguide 연결 성공');
        } else {
          console.warn('[App] indiguide 연결 실패 - 페어링을 확인하세요');
        }
      }

      // 카메라는 HomeScreen 또는 CookingScreen에서 초기화
      // 여기서는 기본값으로 준비 상태 설정
      setCameraReady(true);
    };

    initialize();

    // 정리
    return () => {
      bluetoothService.cleanup();
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

