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
exports.default = TerminalScreen;
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const vector_icons_1 = require("@expo/vector-icons");
const react_native_safe_area_context_1 = require("react-native-safe-area-context");
const expo_linear_gradient_1 = require("expo-linear-gradient");
const expo_blur_1 = require("expo-blur");
const useApp_1 = require("../hooks/useApp");
const theme_1 = require("../theme");
const MAX_TERMINALS = 3;
function TerminalScreen() {
    const { terminalOutput, executeCommand, isConnected, currentProject } = (0, useApp_1.useApp)();
    const { isDarkMode, colors } = (0, theme_1.useTheme)();
    const [command, setCommand] = (0, react_1.useState)('');
    const [historyIndex, setHistoryIndex] = (0, react_1.useState)(-1);
    const scrollViewRef = (0, react_1.useRef)(null);
    // Multi-terminal state
    const [terminals, setTerminals] = (0, react_1.useState)([
        { id: 1, name: 'Terminal 1', output: [], history: [] }
    ]);
    const [activeTerminalId, setActiveTerminalId] = (0, react_1.useState)(1);
    const activeTerminal = terminals.find(t => t.id === activeTerminalId) || terminals[0];
    (0, react_1.useEffect)(() => {
        // Sync global terminal output with active terminal
        if (terminalOutput.length > 0) {
            setTerminals(prev => prev.map(t => t.id === activeTerminalId
                ? { ...t, output: [...t.output, ...terminalOutput.slice(t.output.length)] }
                : t));
        }
        scrollViewRef.current?.scrollToEnd({ animated: true });
    }, [terminalOutput]);
    const handleExecute = () => {
        if (command.trim()) {
            executeCommand(command.trim());
            setTerminals(prev => prev.map(t => t.id === activeTerminalId
                ? { ...t, history: [command.trim(), ...t.history.slice(0, 49)] }
                : t));
            setCommand('');
            setHistoryIndex(-1);
        }
    };
    const handleHistoryUp = () => {
        const history = activeTerminal.history;
        if (historyIndex < history.length - 1) {
            const newIndex = historyIndex + 1;
            setHistoryIndex(newIndex);
            setCommand(history[newIndex]);
        }
    };
    const handleHistoryDown = () => {
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            setCommand(activeTerminal.history[newIndex]);
        }
        else if (historyIndex === 0) {
            setHistoryIndex(-1);
            setCommand('');
        }
    };
    const handleClearTerminal = () => {
        setTerminals(prev => prev.map(t => t.id === activeTerminalId ? { ...t, output: [] } : t));
    };
    const addTerminal = () => {
        if (terminals.length >= MAX_TERMINALS) {
            react_native_1.Alert.alert('📟 Limite atteinte', `Maximum ${MAX_TERMINALS} terminaux`);
            return;
        }
        const newId = Math.max(...terminals.map(t => t.id)) + 1;
        setTerminals(prev => [...prev, {
                id: newId,
                name: `Terminal ${newId}`,
                output: [],
                history: []
            }]);
        setActiveTerminalId(newId);
    };
    const closeTerminal = (id) => {
        if (terminals.length === 1) {
            react_native_1.Alert.alert('⚠️', 'Tu dois garder au moins 1 terminal');
            return;
        }
        setTerminals(prev => prev.filter(t => t.id !== id));
        if (activeTerminalId === id) {
            const remaining = terminals.filter(t => t.id !== id);
            setActiveTerminalId(remaining[0].id);
        }
    };
    const quickCommands = [
        { label: 'ls', command: 'ls -la', icon: 'folder-outline' },
        { label: 'npm', command: 'npm run dev', icon: 'play' },
        { label: 'git', command: 'git status', icon: 'git-branch' },
        { label: 'pwd', command: 'pwd', icon: 'locate' },
    ];
    const formatOutput = (line, index) => {
        let textColor = colors.text;
        let prefix = '';
        if (line.startsWith('$') || line.startsWith('>')) {
            textColor = colors.success;
            prefix = '➜ ';
        }
        else if (line.toLowerCase().includes('error') || line.toLowerCase().includes('failed')) {
            textColor = colors.error;
        }
        else if (line.toLowerCase().includes('warning') || line.toLowerCase().includes('warn')) {
            textColor = colors.warning;
        }
        else if (line.toLowerCase().includes('success') || line.toLowerCase().includes('done')) {
            textColor = colors.success;
        }
        else if (line.startsWith('  ') || line.startsWith('\t')) {
            textColor = colors.textSecondary;
        }
        return (<react_native_1.View key={index} style={styles.outputLine}>
        {prefix ? <react_native_1.Text style={[styles.outputPrefix, { color: colors.success }]}>{prefix}</react_native_1.Text> : null}
        <react_native_1.Text style={[styles.outputText, { color: textColor }]}>{line}</react_native_1.Text>
      </react_native_1.View>);
    };
    const styles = createStyles(colors);
    if (!isConnected) {
        return (<expo_linear_gradient_1.LinearGradient colors={[colors.background, isDarkMode ? '#0f0f18' : '#f1f5f9']} style={styles.container}>
        <react_native_safe_area_context_1.SafeAreaView style={styles.container} edges={['bottom']}>
          <react_native_1.View style={styles.disconnectedContainer}>
            <expo_linear_gradient_1.LinearGradient colors={[colors.surfaceLight, colors.surface]} style={styles.disconnectedIcon}>
              <vector_icons_1.Ionicons name="terminal" size={48} color={colors.textMuted}/>
            </expo_linear_gradient_1.LinearGradient>
            <react_native_1.Text style={[styles.disconnectedTitle, { color: colors.text }]}>Terminal Offline</react_native_1.Text>
            <react_native_1.Text style={[styles.disconnectedText, { color: colors.textMuted }]}>Connect to server in Settings to use terminal</react_native_1.Text>
          </react_native_1.View>
        </react_native_safe_area_context_1.SafeAreaView>
      </expo_linear_gradient_1.LinearGradient>);
    }
    return (<expo_linear_gradient_1.LinearGradient colors={[colors.background, isDarkMode ? '#0f0f18' : '#f1f5f9']} style={styles.container}>
      <react_native_safe_area_context_1.SafeAreaView style={styles.container} edges={['bottom']}>
        {/* Header */}
        <react_native_1.View style={[styles.header, { borderBottomColor: colors.border }]}>
          <react_native_1.View style={styles.headerLeft}>
            <expo_linear_gradient_1.LinearGradient colors={[colors.success, '#059669']} style={styles.headerIcon}>
              <vector_icons_1.Ionicons name="terminal" size={22} color="#fff"/>
            </expo_linear_gradient_1.LinearGradient>
            <react_native_1.View>
              <react_native_1.Text style={[styles.headerTitle, { color: colors.text }]}>Terminal</react_native_1.Text>
              <react_native_1.Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>{currentProject?.name || 'No project'}</react_native_1.Text>
            </react_native_1.View>
          </react_native_1.View>
          <react_native_1.View style={styles.headerRight}>
            <react_native_1.TouchableOpacity style={[styles.headerBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={handleClearTerminal}>
              <vector_icons_1.Ionicons name="trash-outline" size={20} color={colors.textMuted}/>
            </react_native_1.TouchableOpacity>
          </react_native_1.View>
        </react_native_1.View>

        {/* Terminal Tabs */}
        <react_native_1.View style={[styles.tabsContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <react_native_1.ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
            {terminals.map((terminal) => (<react_native_1.TouchableOpacity key={terminal.id} onPress={() => setActiveTerminalId(terminal.id)} onLongPress={() => closeTerminal(terminal.id)} style={[
                styles.tab,
                {
                    backgroundColor: activeTerminalId === terminal.id ? colors.primary + '20' : 'transparent',
                    borderColor: activeTerminalId === terminal.id ? colors.primary : colors.border
                }
            ]}>
                <react_native_1.View style={[styles.tabDot, { backgroundColor: activeTerminalId === terminal.id ? colors.success : colors.textMuted }]}/>
                <react_native_1.Text style={[
                styles.tabText,
                { color: activeTerminalId === terminal.id ? colors.primary : colors.textSecondary }
            ]}>
                  {terminal.name}
                </react_native_1.Text>
                {terminals.length > 1 && (<react_native_1.TouchableOpacity onPress={() => closeTerminal(terminal.id)} style={styles.tabClose}>
                    <vector_icons_1.Ionicons name="close" size={14} color={colors.textMuted}/>
                  </react_native_1.TouchableOpacity>)}
              </react_native_1.TouchableOpacity>))}

            {/* Add Terminal Button */}
            {terminals.length < MAX_TERMINALS && (<react_native_1.TouchableOpacity onPress={addTerminal} style={[styles.addTabBtn, { borderColor: colors.border }]}>
                <vector_icons_1.Ionicons name="add" size={20} color={colors.primary}/>
              </react_native_1.TouchableOpacity>)}
          </react_native_1.ScrollView>

          {/* Terminal Count Badge */}
          <react_native_1.View style={[styles.terminalCount, { backgroundColor: colors.primary }]}>
            <react_native_1.Text style={styles.terminalCountText}>{terminals.length}/{MAX_TERMINALS}</react_native_1.Text>
          </react_native_1.View>
        </react_native_1.View>

        {/* Quick Commands */}
        <react_native_1.View style={[styles.quickCommands, { borderBottomColor: colors.border }]}>
          <react_native_1.ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <react_native_1.View style={styles.quickCommandsInner}>
              {quickCommands.map((cmd, i) => (<react_native_1.TouchableOpacity key={i} onPress={() => setCommand(cmd.command)}>
                  <expo_linear_gradient_1.LinearGradient colors={[colors.surfaceLight, colors.surface]} style={[styles.quickCommand, { borderColor: colors.border }]}>
                    <vector_icons_1.Ionicons name={cmd.icon} size={16} color={colors.primaryLight}/>
                    <react_native_1.Text style={[styles.quickCommandText, { color: colors.text }]}>{cmd.label}</react_native_1.Text>
                  </expo_linear_gradient_1.LinearGradient>
                </react_native_1.TouchableOpacity>))}
            </react_native_1.View>
          </react_native_1.ScrollView>
        </react_native_1.View>

        {/* Terminal Output */}
        <react_native_1.View style={styles.terminalContainer}>
          <expo_linear_gradient_1.LinearGradient colors={[isDarkMode ? '#0d0d12' : '#f8fafc', colors.background]} style={styles.terminalGradient}>
            <react_native_1.ScrollView ref={scrollViewRef} style={styles.terminalOutput} showsVerticalScrollIndicator={false} contentContainerStyle={styles.terminalOutputContent}>
              {/* Welcome Message */}
              <react_native_1.View style={styles.welcomeMessage}>
                <react_native_1.Text style={[styles.welcomeText, { color: colors.textMuted }]}>┌───────────────────────────────────┐</react_native_1.Text>
                <react_native_1.Text style={[styles.welcomeText, { color: colors.textMuted }]}>│  <react_native_1.Text style={{ color: colors.primaryLight }}>AETHER</react_native_1.Text> Terminal v1.0            │</react_native_1.Text>
                <react_native_1.Text style={[styles.welcomeText, { color: colors.textMuted }]}>│  {activeTerminal.name.padEnd(27)}   │</react_native_1.Text>
                <react_native_1.Text style={[styles.welcomeText, { color: colors.textMuted }]}>└───────────────────────────────────┘</react_native_1.Text>
              </react_native_1.View>

              {/* Output Lines */}
              {activeTerminal.output.map((line, index) => formatOutput(line, index))}

              {/* Current Directory Indicator */}
              <react_native_1.View style={styles.promptLine}>
                <react_native_1.Text style={[styles.promptPath, { color: colors.primaryLight }]}>{currentProject?.name || '~'}</react_native_1.Text>
                <react_native_1.Text style={[styles.promptSymbol, { color: colors.success }]}> ❯ </react_native_1.Text>
                <react_native_1.Text style={[styles.promptCursor, { color: colors.text }]}>_</react_native_1.Text>
              </react_native_1.View>
            </react_native_1.ScrollView>
          </expo_linear_gradient_1.LinearGradient>
        </react_native_1.View>

        {/* Input Area */}
        <expo_blur_1.BlurView intensity={60} tint={isDarkMode ? 'dark' : 'light'} style={[styles.inputArea, { borderTopColor: colors.border }]}>
          {/* History Arrows */}
          <react_native_1.View style={styles.historyButtons}>
            <react_native_1.TouchableOpacity style={[styles.historyBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={handleHistoryUp}>
              <vector_icons_1.Ionicons name="chevron-up" size={18} color={colors.textMuted}/>
            </react_native_1.TouchableOpacity>
            <react_native_1.TouchableOpacity style={[styles.historyBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={handleHistoryDown}>
              <vector_icons_1.Ionicons name="chevron-down" size={18} color={colors.textMuted}/>
            </react_native_1.TouchableOpacity>
          </react_native_1.View>

          {/* Input */}
          <react_native_1.View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <react_native_1.Text style={[styles.inputPrompt, { color: colors.success }]}>❯</react_native_1.Text>
            <react_native_1.TextInput style={[styles.input, { color: colors.text }]} value={command} onChangeText={setCommand} placeholder="Enter command..." placeholderTextColor={colors.textMuted} autoCapitalize="none" autoCorrect={false} onSubmitEditing={handleExecute} returnKeyType="send"/>
          </react_native_1.View>

          {/* Execute Button */}
          <react_native_1.TouchableOpacity onPress={handleExecute} disabled={!command.trim()}>
            <expo_linear_gradient_1.LinearGradient colors={command.trim() ? [colors.success, '#059669'] : [colors.surfaceLight, colors.surface]} style={styles.executeBtn}>
              <vector_icons_1.Ionicons name="play" size={22} color={command.trim() ? '#fff' : colors.textMuted}/>
            </expo_linear_gradient_1.LinearGradient>
          </react_native_1.TouchableOpacity>
        </expo_blur_1.BlurView>
      </react_native_safe_area_context_1.SafeAreaView>
    </expo_linear_gradient_1.LinearGradient>);
}
const createStyles = (colors) => react_native_1.StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    headerIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700' },
    headerSubtitle: { fontSize: 12, marginTop: 2 },
    headerRight: { flexDirection: 'row', gap: 10 },
    headerBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
    // Terminal Tabs
    tabsContainer: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderBottomWidth: 1 },
    tabsScroll: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 50 },
    tab: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
    tabDot: { width: 8, height: 8, borderRadius: 4 },
    tabText: { fontSize: 13, fontWeight: '600' },
    tabClose: { marginLeft: 4, padding: 2 },
    addTabBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
    terminalCount: { position: 'absolute', right: 12, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    terminalCountText: { color: '#fff', fontSize: 11, fontWeight: '700' },
    quickCommands: { paddingVertical: 10, borderBottomWidth: 1 },
    quickCommandsInner: { flexDirection: 'row', paddingHorizontal: 16, gap: 10 },
    quickCommand: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
    quickCommandText: { fontSize: 12, fontWeight: '600' },
    terminalContainer: { flex: 1 },
    terminalGradient: { flex: 1 },
    terminalOutput: { flex: 1 },
    terminalOutputContent: { padding: 16 },
    welcomeMessage: { marginBottom: 16 },
    welcomeText: { fontSize: 11, fontFamily: react_native_1.Platform.OS === 'ios' ? 'Menlo' : 'monospace', lineHeight: 16 },
    outputLine: { flexDirection: 'row', marginVertical: 2 },
    outputPrefix: { fontSize: 12, fontFamily: react_native_1.Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
    outputText: { fontSize: 12, fontFamily: react_native_1.Platform.OS === 'ios' ? 'Menlo' : 'monospace', lineHeight: 18, flex: 1 },
    promptLine: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
    promptPath: { fontSize: 12, fontFamily: react_native_1.Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontWeight: '600' },
    promptSymbol: { fontSize: 12, fontFamily: react_native_1.Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
    promptCursor: { fontSize: 12, fontFamily: react_native_1.Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
    inputArea: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, gap: 10, borderTopWidth: 1 },
    historyButtons: { flexDirection: 'column', gap: 4 },
    historyBtn: { width: 30, height: 22, borderRadius: 6, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
    inputContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, minHeight: 46 },
    inputPrompt: { fontSize: 14, fontWeight: '700', marginRight: 8 },
    input: { flex: 1, fontSize: 14, paddingVertical: 12, fontFamily: react_native_1.Platform.OS === 'ios' ? 'Menlo' : 'monospace', minHeight: 44 },
    executeBtn: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    disconnectedContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
    disconnectedIcon: { width: 100, height: 100, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
    disconnectedTitle: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
    disconnectedText: { fontSize: 15, textAlign: 'center' },
});
//# sourceMappingURL=TerminalScreen.js.map