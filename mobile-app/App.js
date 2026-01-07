"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = App;
const react_1 = __importDefault(require("react"));
const native_1 = require("@react-navigation/native");
const bottom_tabs_1 = require("@react-navigation/bottom-tabs");
const vector_icons_1 = require("@expo/vector-icons");
const react_native_safe_area_context_1 = require("react-native-safe-area-context");
const expo_status_bar_1 = require("expo-status-bar");
const ChatScreen_1 = __importDefault(require("./src/screens/ChatScreen"));
const FilesScreen_1 = __importDefault(require("./src/screens/FilesScreen"));
const TerminalScreen_1 = __importDefault(require("./src/screens/TerminalScreen"));
const SettingsScreen_1 = __importDefault(require("./src/screens/SettingsScreen"));
const useApp_1 = require("./src/hooks/useApp");
const theme_1 = require("./src/theme");
const Tab = (0, bottom_tabs_1.createBottomTabNavigator)();
function AppContent() {
    const { isDarkMode, colors } = (0, theme_1.useTheme)();
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
        fonts: native_1.DefaultTheme.fonts,
    };
    return (<>
      <native_1.NavigationContainer theme={navigationTheme}>
        <Tab.Navigator screenOptions={({ route }) => ({
            tabBarIcon: ({ focused, color, size }) => {
                let iconName = 'chatbubble';
                if (route.name === 'Chat')
                    iconName = focused ? 'chatbubble' : 'chatbubble-outline';
                else if (route.name === 'Files')
                    iconName = focused ? 'folder' : 'folder-outline';
                else if (route.name === 'Terminal')
                    iconName = focused ? 'terminal' : 'terminal-outline';
                else if (route.name === 'Settings')
                    iconName = focused ? 'settings' : 'settings-outline';
                return <vector_icons_1.Ionicons name={iconName} size={size} color={color}/>;
            },
            tabBarActiveTintColor: colors.primary,
            tabBarInactiveTintColor: colors.textMuted,
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.text,
            tabBarStyle: {
                backgroundColor: colors.surface,
                borderTopColor: colors.border,
            },
        })}>
          <Tab.Screen name="Chat" component={ChatScreen_1.default}/>
          <Tab.Screen name="Files" component={FilesScreen_1.default}/>
          <Tab.Screen name="Terminal" component={TerminalScreen_1.default}/>
          <Tab.Screen name="Settings" component={SettingsScreen_1.default}/>
        </Tab.Navigator>
      </native_1.NavigationContainer>
      <expo_status_bar_1.StatusBar style={isDarkMode ? 'light' : 'dark'}/>
    </>);
}
function App() {
    return (<react_native_safe_area_context_1.SafeAreaProvider>
      <theme_1.ThemeProvider>
        <useApp_1.AppProvider>
          <AppContent />
        </useApp_1.AppProvider>
      </theme_1.ThemeProvider>
    </react_native_safe_area_context_1.SafeAreaProvider>);
}
//# sourceMappingURL=App.js.map