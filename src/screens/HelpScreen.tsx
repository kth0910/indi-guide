/**
 * 도움말 화면
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';

export const HelpScreen: React.FC = () => {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>도움말</Text>
      
      <Section title="시작하기">
        <Text style={styles.text}>
          1. 하드웨어 거치대를 인덕션 상판 위에 설치합니다.{'\n'}
          2. 앱을 실행하고 Bluetooth를 켭니다.{'\n'}
          3. "조리 시작" 버튼을 눌러 안전 점검을 시작합니다.
        </Text>
      </Section>
      
      <Section title="안전 경보">
        <Text style={styles.text}>
          • <Text style={styles.bold}>정보 (녹색)</Text>: 잔열 정보 안내 (짧은 진동 1회){'\n'}
          • <Text style={styles.bold}>주의 (주황색)</Text>: 과열 의심 또는 무조작 경고 (진동 2회){'\n'}
          • <Text style={styles.bold}>긴급 (빨강색)</Text>: 손이 뜨거운 버너 위에 있거나 초과온 (연속 진동)
        </Text>
      </Section>
      
      <Section title="버튼 인식">
        <Text style={styles.text}>
          손을 터치 패널의 버튼 위에 올리면 음성으로 버튼 이름을 안내합니다.{'\n'}
          2초 이상 손을 두면 버튼 기능을 추가로 설명합니다.
        </Text>
      </Section>
      
      <Section title="잔열 관리">
        <Text style={styles.text}>
          조리 종료 후에도 상판이 45°C 이하로 내려갈 때까지 계속 모니터링합니다.{'\n'}
          안전 온도에 도달하면 음성과 진동으로 알려드립니다.
        </Text>
      </Section>
      
      <Section title="문제 해결">
        <Text style={styles.text}>
          • <Text style={styles.bold}>카메라 경고</Text>: 거치대를 상판 중앙에 다시 맞춰주세요.{'\n'}
          • <Text style={styles.bold}>BLE 연결 끊김</Text>: 앱이 자동으로 재연결을 시도합니다.{'\n'}
          • <Text style={styles.bold}>센서 오류</Text>: 센서를 청소하거나 교체가 필요합니다.
        </Text>
      </Section>
      
      <Section title="연락처">
        <Text style={styles.text}>
          문의사항은 support@indiguide.com으로 연락주세요.
        </Text>
      </Section>
    </ScrollView>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  text: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333333',
  },
  bold: {
    fontWeight: 'bold',
  },
});

