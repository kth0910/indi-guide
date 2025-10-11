/**
 * 홈 화면 - 조리 시작 전 대기 화면
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useAppStore } from '@/store/useAppStore';
import { CookingState } from '@/types';

interface HomeScreenProps {
  navigation: any;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { cookingState, bleConnected, cameraReady, startSession } = useAppStore();

  const handleStartCooking = () => {
    startSession();
    navigation.navigate('Cooking');
  };

  const canStart = bleConnected && cameraReady;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>IndiGuide</Text>
        <Text style={styles.subtitle}>안전한 조리를 시작하세요</Text>

        {/* 상태 표시 */}
        <View style={styles.statusContainer}>
          <StatusItem
            label="카메라"
            status={cameraReady ? '준비됨' : '연결 안됨'}
            isReady={cameraReady}
          />
          <StatusItem
            label="하드웨어"
            status={bleConnected ? '연결됨' : '연결 안됨'}
            isReady={bleConnected}
          />
        </View>

        {/* 시작 버튼 */}
        <TouchableOpacity
          style={[
            styles.startButton,
            !canStart && styles.startButtonDisabled,
          ]}
          onPress={handleStartCooking}
          disabled={!canStart}
          accessibilityLabel="조리 시작 버튼"
          accessibilityHint="조리를 시작하려면 두 번 탭하세요"
        >
          <Text style={styles.startButtonText}>
            {canStart ? '조리 시작' : '하드웨어 연결 필요'}
          </Text>
        </TouchableOpacity>

        {/* 메뉴 버튼들 */}
        <View style={styles.menuContainer}>
          <MenuButton
            title="설정"
            onPress={() => navigation.navigate('Settings')}
          />
          <MenuButton
            title="조리 기록"
            onPress={() => navigation.navigate('Logs')}
          />
          <MenuButton
            title="도움말"
            onPress={() => navigation.navigate('Help')}
          />
        </View>
      </ScrollView>
    </View>
  );
};

const StatusItem: React.FC<{
  label: string;
  status: string;
  isReady: boolean;
}> = ({ label, status, isReady }) => (
  <View style={styles.statusItem}>
    <View style={[
      styles.statusIndicator,
      isReady ? styles.statusReady : styles.statusNotReady,
    ]} />
    <Text style={styles.statusLabel}>{label}</Text>
    <Text style={styles.statusText}>{status}</Text>
  </View>
);

const MenuButton: React.FC<{
  title: string;
  onPress: () => void;
}> = ({ title, onPress }) => (
  <TouchableOpacity
    style={styles.menuButton}
    onPress={onPress}
    accessibilityLabel={`${title} 버튼`}
  >
    <Text style={styles.menuButtonText}>{title}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginTop: 60,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 20,
    color: '#666666',
    marginBottom: 60,
  },
  statusContainer: {
    width: '100%',
    marginBottom: 40,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    marginBottom: 12,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  statusReady: {
    backgroundColor: '#4CAF50',
  },
  statusNotReady: {
    backgroundColor: '#F44336',
  },
  statusLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    flex: 1,
  },
  statusText: {
    fontSize: 16,
    color: '#666666',
  },
  startButton: {
    width: '100%',
    backgroundColor: '#2196F3',
    paddingVertical: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 40,
  },
  startButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  startButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  menuContainer: {
    width: '100%',
  },
  menuButton: {
    width: '100%',
    backgroundColor: '#F5F5F5',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  menuButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
});

