/**
 * 앱 네비게이션 구조
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { HomeScreen } from '@/screens/HomeScreen';
import { CookingScreen } from '@/screens/CookingScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { LogsScreen } from '@/screens/LogsScreen';
import { HelpScreen } from '@/screens/HelpScreen';

export type RootStackParamList = {
  Home: undefined;
  Cooking: undefined;
  Settings: undefined;
  Logs: undefined;
  Help: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#2196F3',
          },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: {
            fontWeight: 'bold',
            fontSize: 20,
          },
          headerBackTitle: '뒤로',
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{
            title: 'IndiGuide',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="Cooking"
          component={CookingScreen}
          options={{
            title: '조리 중',
            headerLeft: () => null, // 뒤로가기 비활성화 (종료 버튼으로만 종료)
          }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: '설정' }}
        />
        <Stack.Screen
          name="Logs"
          component={LogsScreen}
          options={{ title: '조리 기록' }}
        />
        <Stack.Screen
          name="Help"
          component={HelpScreen}
          options={{ title: '도움말' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

