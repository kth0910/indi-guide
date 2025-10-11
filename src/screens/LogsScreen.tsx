/**
 * 조리 기록 화면
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useAppStore } from '@/store/useAppStore';

export const LogsScreen: React.FC = () => {
  const { logs } = useAppStore();

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('ko-KR');
  };

  const formatDuration = (start: number, end?: number) => {
    if (!end) return '-';
    const minutes = Math.floor((end - start) / 60000);
    return `${minutes}분`;
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>조리 기록</Text>
      
      {logs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>조리 기록이 없습니다</Text>
        </View>
      ) : (
        logs.map((log, index) => (
          <View key={log.sessionId} style={styles.logCard}>
            <View style={styles.logHeader}>
              <Text style={styles.logTitle}>세션 #{logs.length - index}</Text>
              <Text style={styles.logDate}>{formatDate(log.startTime)}</Text>
            </View>
            
            <View style={styles.logRow}>
              <Text style={styles.logLabel}>조리 시간</Text>
              <Text style={styles.logValue}>
                {formatDuration(log.startTime, log.endTime)}
              </Text>
            </View>
            
            <View style={styles.logRow}>
              <Text style={styles.logLabel}>최대 온도</Text>
              <Text style={styles.logValue}>{log.maxTemperature}°C</Text>
            </View>
            
            <View style={styles.logRow}>
              <Text style={styles.logLabel}>경보 발생</Text>
              <Text style={styles.logValue}>{log.alerts.length}건</Text>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
};

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
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    fontSize: 18,
    color: '#999999',
  },
  logCard: {
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  logTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  logDate: {
    fontSize: 14,
    color: '#666666',
  },
  logRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  logLabel: {
    fontSize: 16,
    color: '#666666',
  },
  logValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
});

