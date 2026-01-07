import React from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import ChatScreen from './src/screens/ChatScreen';
import FilesScreen from './src/screens/FilesScreen';
import TerminalScreen from './src/screens/TerminalScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import { AppProvider } from './src/hooks/useApp';
import { ThemeProvider, useTheme } from './src/theme';

const Tab = createBottomTabNavigator();

function AppContent() {
  const { isDarkMode, colors } = useTheme();

  // Custom navigation theme based on our colors
  const navigationTheme = {
    dark: isDarkMode,
    colors: {
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      notification: colors.error,
    },
    fonts: DefaultTheme.fonts,
  };

  return (
    <>
      <NavigationContainer theme={navigationTheme}>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ focused, color, size }) => {
              let iconName: keyof typeof Ionicons.glyphMap = 'chatbubble';
              if (route.name === 'Chat') iconName = focused ? 'chatbubble' : 'chatbubble-outline';
              else if (route.name === 'History') iconName = focused ? 'time' : 'time-outline';
              else if (route.name === 'Files') iconName = focused ? 'folder' : 'folder-outline';
              else if (route.name === 'Terminal') iconName = focused ? 'terminal' : 'terminal-outline';
              else if (route.name === 'Settings') iconName = focused ? 'settings' : 'settings-outline';
              return <Ionicons name={iconName} size={size} color={color} />;
            },
            tabBarActiveTintColor: colors.primary,
            tabBarInactiveTintColor: colors.textMuted,
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.text,
            tabBarStyle: {
              backgroundColor: colors.surface,
              borderTopColor: colors.border,
            },
          })}
        >
          <Tab.Screen name="Chat" component={ChatScreen} />
          <Tab.Screen name="History" component={HistoryScreen} />
          <Tab.Screen name="Files" component={FilesScreen} />
          <Tab.Screen name="Terminal" component={TerminalScreen} />
          <Tab.Screen name="Settings" component={SettingsScreen} />
        </Tab.Navigator>
      </NavigationContainer>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppProvider>
          <AppContent />
        </AppProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
