/**
 * 설정 화면
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
} from 'react-native';
import { useAppStore } from '@/store/useAppStore';
import { AccessibilityService } from '@/services/AccessibilityService';

export const SettingsScreen: React.FC = () => {
  const {
    accessibilitySettings,
    systemConfig,
    updateAccessibilitySettings,
    updateSystemConfig,
  } = useAppStore();

  const accessibilityService = AccessibilityService.getInstance();

  const handleTtsToggle = (value: boolean) => {
    updateAccessibilitySettings({ ttsEnabled: value });
    accessibilityService.updateSettings({ ttsEnabled: value });
  };

  const handleVibrationToggle = (value: boolean) => {
    updateAccessibilitySettings({ vibrationEnabled: value });
    accessibilityService.updateSettings({ vibrationEnabled: value });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>접근성</Text>
        
        <SettingRow
          label="음성 안내"
          value={accessibilitySettings.ttsEnabled}
          onValueChange={handleTtsToggle}
        />
        
        <SettingRow
          label="진동 피드백"
          value={accessibilitySettings.vibrationEnabled}
          onValueChange={handleVibrationToggle}
        />
        
        <SettingRow
          label="큰 버튼"
          value={accessibilitySettings.largeButtons}
          onValueChange={(value) =>
            updateAccessibilitySettings({ largeButtons: value })
          }
        />
        
        <SettingRow
          label="고대비 모드"
          value={accessibilitySettings.highContrast}
          onValueChange={(value) =>
            updateAccessibilitySettings({ highContrast: value })
          }
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>안전 설정</Text>
        
        <View style={styles.valueRow}>
          <Text style={styles.label}>잔열 경고 온도</Text>
          <Text style={styles.value}>{systemConfig.residualHeatThreshold}°C</Text>
        </View>
        
        <View style={styles.valueRow}>
          <Text style={styles.label}>안전 온도</Text>
          <Text style={styles.value}>{systemConfig.safeTemperature}°C</Text>
        </View>
        
        <View style={styles.valueRow}>
          <Text style={styles.label}>과열 임계값</Text>
          <Text style={styles.value}>{systemConfig.overheatingThreshold}°C</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>하드웨어</Text>
        
        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>센서 보정</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>카메라 재설정</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const SettingRow: React.FC<{
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}> = ({ label, value, onValueChange }) => (
  <View style={styles.settingRow}>
    <Text style={styles.label}>{label}</Text>
    <Switch value={value} onValueChange={onValueChange} />
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  valueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  label: {
    fontSize: 18,
    color: '#1A1A1A',
  },
  value: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2196F3',
  },
  button: {
    backgroundColor: '#2196F3',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

