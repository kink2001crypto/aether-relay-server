"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SettingsScreen;
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const vector_icons_1 = require("@expo/vector-icons");
const react_native_safe_area_context_1 = require("react-native-safe-area-context");
const expo_linear_gradient_1 = require("expo-linear-gradient");
const useApp_1 = require("../hooks/useApp");
const theme_1 = require("../theme");
const { width } = react_native_1.Dimensions.get('window');
function SettingsScreen() {
    const { serverUrl, setServerUrl, selectedModel, setSelectedModel, availableModels, isConnected } = (0, useApp_1.useApp)();
    const { isDarkMode, toggleTheme, colors } = (0, theme_1.useTheme)();
    const [tempUrl, setTempUrl] = (0, react_1.useState)(serverUrl);
    const [notifications, setNotifications] = (0, react_1.useState)(true);
    (0, react_1.useEffect)(() => {
        setTempUrl(serverUrl);
    }, [serverUrl]);
    const handleSaveUrl = () => {
        if (tempUrl.trim()) {
            setServerUrl(tempUrl.trim());
            react_native_1.Alert.alert('✓ Saved', 'Server URL updated. Reconnecting...');
        }
    };
    const handleResetUrl = () => {
        const defaultUrl = 'http://192.168.0.180:3001';
        setTempUrl(defaultUrl);
        setServerUrl(defaultUrl);
        react_native_1.Alert.alert('✓ Reset', 'Server URL reset to local default');
    };
    const styles = createStyles(colors);
    return (<expo_linear_gradient_1.LinearGradient colors={[colors.background, isDarkMode ? '#0f0f18' : '#f1f5f9']} style={styles.container}>
      <react_native_safe_area_context_1.SafeAreaView style={styles.container} edges={['bottom']}>
        <react_native_1.ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <react_native_1.View style={styles.header}>
            <expo_linear_gradient_1.LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.headerIcon}>
              <vector_icons_1.Ionicons name="settings" size={28} color="#fff"/>
            </expo_linear_gradient_1.LinearGradient>
            <react_native_1.Text style={styles.headerTitle}>Settings</react_native_1.Text>
            <react_native_1.Text style={styles.headerSubtitle}>Configure your AETHER experience</react_native_1.Text>
          </react_native_1.View>

          {/* Connection Status */}
          <react_native_1.View style={styles.section}>
            <react_native_1.Text style={styles.sectionTitle}>CONNECTION</react_native_1.Text>
            <expo_linear_gradient_1.LinearGradient colors={[colors.surfaceLight, colors.surface]} style={styles.card}>
              <react_native_1.View style={styles.statusRow}>
                <react_native_1.View style={styles.statusInfo}>
                  <react_native_1.View style={[styles.statusDot, isConnected ? styles.dotConnected : styles.dotDisconnected]}/>
                  <react_native_1.View>
                    <react_native_1.Text style={styles.statusLabel}>{isConnected ? 'Connected' : 'Disconnected'}</react_native_1.Text>
                    <react_native_1.Text style={styles.statusUrl} numberOfLines={1}>{serverUrl}</react_native_1.Text>
                  </react_native_1.View>
                </react_native_1.View>
                <react_native_1.View style={[styles.statusBadge, isConnected ? styles.badgeSuccess : styles.badgeError]}>
                  <vector_icons_1.Ionicons name={isConnected ? 'checkmark-circle' : 'close-circle'} size={18} color={isConnected ? colors.success : colors.error}/>
                </react_native_1.View>
              </react_native_1.View>
            </expo_linear_gradient_1.LinearGradient>
          </react_native_1.View>

          {/* Server URL */}
          <react_native_1.View style={styles.section}>
            <react_native_1.Text style={styles.sectionTitle}>SERVER URL</react_native_1.Text>
            <expo_linear_gradient_1.LinearGradient colors={[colors.surfaceLight, colors.surface]} style={styles.card}>
              <react_native_1.View style={styles.inputContainer}>
                <vector_icons_1.Ionicons name="globe-outline" size={20} color={colors.textMuted}/>
                <react_native_1.TextInput style={styles.input} value={tempUrl} onChangeText={setTempUrl} placeholder="http://192.168.0.180:3001" placeholderTextColor={colors.textMuted} autoCapitalize="none" autoCorrect={false} keyboardType="url"/>
              </react_native_1.View>
              <react_native_1.View style={styles.buttonRow}>
                <react_native_1.TouchableOpacity style={styles.buttonSecondary} onPress={handleResetUrl}>
                  <vector_icons_1.Ionicons name="refresh" size={18} color={colors.primary}/>
                  <react_native_1.Text style={styles.buttonSecondaryText}>Reset</react_native_1.Text>
                </react_native_1.TouchableOpacity>
                <react_native_1.TouchableOpacity onPress={handleSaveUrl}>
                  <expo_linear_gradient_1.LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.buttonPrimary}>
                    <vector_icons_1.Ionicons name="save" size={18} color="#fff"/>
                    <react_native_1.Text style={styles.buttonPrimaryText}>Save</react_native_1.Text>
                  </expo_linear_gradient_1.LinearGradient>
                </react_native_1.TouchableOpacity>
              </react_native_1.View>
            </expo_linear_gradient_1.LinearGradient>
          </react_native_1.View>

          {/* AI Model */}
          <react_native_1.View style={styles.section}>
            <react_native_1.Text style={styles.sectionTitle}>AI MODEL</react_native_1.Text>
            <expo_linear_gradient_1.LinearGradient colors={[colors.surfaceLight, colors.surface]} style={styles.card}>
              {availableModels.map((model, index) => (<react_native_1.TouchableOpacity key={model} style={[styles.modelOption, selectedModel === model && styles.modelOptionSelected, index < availableModels.length - 1 && styles.modelOptionBorder]} onPress={() => setSelectedModel(model)}>
                  <expo_linear_gradient_1.LinearGradient colors={selectedModel === model ? [colors.primary, colors.primaryDark] : [colors.surfaceLight, colors.surface]} style={styles.modelIcon}>
                    <vector_icons_1.Ionicons name={model === 'gemini' ? 'sparkles' : model === 'ollama' ? 'hardware-chip' : 'cube'} size={22} color={selectedModel === model ? '#fff' : colors.textMuted}/>
                  </expo_linear_gradient_1.LinearGradient>
                  <react_native_1.View style={styles.modelInfo}>
                    <react_native_1.Text style={[styles.modelName, selectedModel === model && styles.modelNameSelected]}>
                      {model.charAt(0).toUpperCase() + model.slice(1)}
                    </react_native_1.Text>
                    <react_native_1.Text style={styles.modelDesc}>
                      {model === 'gemini' ? 'Google AI' : model === 'ollama' ? 'Local LLM' : model === 'claude' ? 'Anthropic' : model === 'deepseek' ? 'DeepSeek AI' : model === 'grok' ? 'xAI Grok' : 'OpenAI GPT'}
                    </react_native_1.Text>
                  </react_native_1.View>
                  {selectedModel === model && (<react_native_1.View style={styles.checkBadge}>
                      <vector_icons_1.Ionicons name="checkmark" size={16} color="#fff"/>
                    </react_native_1.View>)}
                </react_native_1.TouchableOpacity>))}
            </expo_linear_gradient_1.LinearGradient>
          </react_native_1.View>

          {/* Preferences */}
          <react_native_1.View style={styles.section}>
            <react_native_1.Text style={styles.sectionTitle}>PREFERENCES</react_native_1.Text>
            <expo_linear_gradient_1.LinearGradient colors={[colors.surfaceLight, colors.surface]} style={styles.card}>
              <react_native_1.View style={[styles.preferenceRow, styles.preferenceRowBorder]}>
                <react_native_1.View style={styles.preferenceInfo}>
                  <vector_icons_1.Ionicons name={isDarkMode ? 'moon' : 'sunny'} size={22} color={colors.primary}/>
                  <react_native_1.Text style={styles.preferenceName}>{isDarkMode ? 'Dark Mode' : 'Light Mode'}</react_native_1.Text>
                </react_native_1.View>
                <react_native_1.Switch value={isDarkMode} onValueChange={toggleTheme} trackColor={{ false: colors.border, true: colors.primary + '60' }} thumbColor={isDarkMode ? colors.primary : colors.textMuted}/>
              </react_native_1.View>
              <react_native_1.View style={styles.preferenceRow}>
                <react_native_1.View style={styles.preferenceInfo}>
                  <vector_icons_1.Ionicons name="notifications" size={22} color={colors.warning}/>
                  <react_native_1.Text style={styles.preferenceName}>Notifications</react_native_1.Text>
                </react_native_1.View>
                <react_native_1.Switch value={notifications} onValueChange={setNotifications} trackColor={{ false: colors.border, true: colors.warning + '60' }} thumbColor={notifications ? colors.warning : colors.textMuted}/>
              </react_native_1.View>
            </expo_linear_gradient_1.LinearGradient>
          </react_native_1.View>

          {/* About */}
          <react_native_1.View style={styles.section}>
            <react_native_1.Text style={styles.sectionTitle}>ABOUT</react_native_1.Text>
            <expo_linear_gradient_1.LinearGradient colors={[colors.surfaceLight, colors.surface]} style={styles.card}>
              <react_native_1.View style={styles.aboutRow}>
                <react_native_1.Text style={styles.aboutLabel}>Version</react_native_1.Text>
                <react_native_1.Text style={styles.aboutValue}>1.0.0</react_native_1.Text>
              </react_native_1.View>
              <react_native_1.View style={[styles.aboutRow, styles.aboutRowBorder]}>
                <react_native_1.Text style={styles.aboutLabel}>Build</react_native_1.Text>
                <react_native_1.Text style={styles.aboutValue}>2025.12.30</react_native_1.Text>
              </react_native_1.View>
              <react_native_1.View style={styles.aboutRow}>
                <react_native_1.Text style={styles.aboutLabel}>Made with</react_native_1.Text>
                <react_native_1.View style={styles.madeWith}>
                  <react_native_1.Text style={styles.aboutValue}>❤️</react_native_1.Text>
                  <react_native_1.Text style={styles.aboutValue}>React Native</react_native_1.Text>
                </react_native_1.View>
              </react_native_1.View>
            </expo_linear_gradient_1.LinearGradient>
          </react_native_1.View>

          {/* Footer */}
          <react_native_1.View style={styles.footer}>
            <react_native_1.Text style={styles.footerText}>AETHER IDE</react_native_1.Text>
            <react_native_1.Text style={styles.footerSubtext}>Mobile Coding Companion</react_native_1.Text>
          </react_native_1.View>
        </react_native_1.ScrollView>
      </react_native_safe_area_context_1.SafeAreaView>
    </expo_linear_gradient_1.LinearGradient>);
}
const createStyles = (colors) => react_native_1.StyleSheet.create({
    container: { flex: 1 },
    scrollView: { flex: 1 },
    header: { alignItems: 'center', paddingVertical: 32 },
    headerIcon: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    headerTitle: { color: colors.text, fontSize: 28, fontWeight: '800', letterSpacing: 1 },
    headerSubtitle: { color: colors.textMuted, fontSize: 14, marginTop: 6 },
    section: { paddingHorizontal: 16, marginBottom: 24 },
    sectionTitle: { color: colors.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 1.5, marginBottom: 12, marginLeft: 4 },
    card: { borderRadius: 20, padding: 16, borderWidth: 1, borderColor: colors.border },
    statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    statusInfo: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
    statusDot: { width: 14, height: 14, borderRadius: 7 },
    dotConnected: { backgroundColor: colors.success },
    dotDisconnected: { backgroundColor: colors.error },
    statusLabel: { color: colors.text, fontSize: 16, fontWeight: '600' },
    statusUrl: { color: colors.textMuted, fontSize: 12, marginTop: 3, maxWidth: 180 },
    statusBadge: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    badgeSuccess: { backgroundColor: colors.success + '20' },
    badgeError: { backgroundColor: colors.error + '20' },
    inputContainer: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.background, borderRadius: 14, paddingHorizontal: 16, borderWidth: 1, borderColor: colors.border },
    input: { flex: 1, color: colors.text, fontSize: 15, paddingVertical: 14 },
    buttonRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 16 },
    buttonSecondary: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12, backgroundColor: colors.primary + '20', borderWidth: 1, borderColor: colors.primary + '40' },
    buttonSecondaryText: { color: colors.primary, fontSize: 14, fontWeight: '600' },
    buttonPrimary: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
    buttonPrimaryText: { color: '#fff', fontSize: 14, fontWeight: '600' },
    modelOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 14 },
    modelOptionSelected: {},
    modelOptionBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
    modelIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    modelInfo: { flex: 1 },
    modelName: { color: colors.text, fontSize: 16, fontWeight: '600' },
    modelNameSelected: { color: colors.primaryLight },
    modelDesc: { color: colors.textMuted, fontSize: 12, marginTop: 3 },
    checkBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    preferenceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
    preferenceRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
    preferenceInfo: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    preferenceName: { color: colors.text, fontSize: 16, fontWeight: '500' },
    aboutRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
    aboutRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
    aboutLabel: { color: colors.textMuted, fontSize: 14 },
    aboutValue: { color: colors.text, fontSize: 14, fontWeight: '500' },
    madeWith: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    footer: { alignItems: 'center', paddingVertical: 32 },
    footerText: { color: colors.textMuted, fontSize: 16, fontWeight: '700', letterSpacing: 2 },
    footerSubtext: { color: colors.textMuted, fontSize: 12, marginTop: 4, opacity: 0.6 },
});
//# sourceMappingURL=SettingsScreen.js.map