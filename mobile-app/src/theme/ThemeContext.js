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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThemeContext = void 0;
exports.ThemeProvider = ThemeProvider;
exports.useTheme = useTheme;
exports.useColors = useColors;
exports.useSyntaxColors = useSyntaxColors;
const react_1 = __importStar(require("react"));
const async_storage_1 = __importDefault(require("@react-native-async-storage/async-storage"));
const colors_1 = require("./colors");
const syntaxColors_1 = require("./syntaxColors");
const THEME_STORAGE_KEY = '@aether/theme_mode';
const ThemeContext = (0, react_1.createContext)(null);
exports.ThemeContext = ThemeContext;
function ThemeProvider({ children }) {
    const [isDarkMode, setIsDarkMode] = (0, react_1.useState)(true);
    const [isLoaded, setIsLoaded] = (0, react_1.useState)(false);
    // Load saved theme preference on mount
    (0, react_1.useEffect)(() => {
        const loadTheme = async () => {
            try {
                const savedTheme = await async_storage_1.default.getItem(THEME_STORAGE_KEY);
                if (savedTheme !== null) {
                    setIsDarkMode(savedTheme === 'dark');
                }
            }
            catch (error) {
                console.warn('Failed to load theme preference:', error);
            }
            finally {
                setIsLoaded(true);
            }
        };
        loadTheme();
    }, []);
    // Save theme preference when it changes
    const saveTheme = (0, react_1.useCallback)(async (isDark) => {
        try {
            await async_storage_1.default.setItem(THEME_STORAGE_KEY, isDark ? 'dark' : 'light');
        }
        catch (error) {
            console.warn('Failed to save theme preference:', error);
        }
    }, []);
    const toggleTheme = (0, react_1.useCallback)(() => {
        setIsDarkMode(prev => {
            const newValue = !prev;
            saveTheme(newValue);
            return newValue;
        });
    }, [saveTheme]);
    const setTheme = (0, react_1.useCallback)((isDark) => {
        setIsDarkMode(isDark);
        saveTheme(isDark);
    }, [saveTheme]);
    // Memoize colors to prevent unnecessary re-renders
    const colors = (0, react_1.useMemo)(() => isDarkMode ? colors_1.darkPalette : colors_1.lightPalette, [isDarkMode]);
    const syntaxColors = (0, react_1.useMemo)(() => isDarkMode ? syntaxColors_1.darkSyntaxColors : syntaxColors_1.lightSyntaxColors, [isDarkMode]);
    const value = (0, react_1.useMemo)(() => ({
        isDarkMode,
        colors,
        syntaxColors,
        toggleTheme,
        setTheme,
    }), [isDarkMode, colors, syntaxColors, toggleTheme, setTheme]);
    // Don't render until theme is loaded to prevent flash
    if (!isLoaded) {
        return null;
    }
    return (<ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>);
}
// Main hook for full theme access
function useTheme() {
    const context = (0, react_1.useContext)(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within ThemeProvider');
    }
    return context;
}
// Convenience hook for just colors (most common use case)
function useColors() {
    const { colors } = useTheme();
    return colors;
}
// Convenience hook for syntax colors
function useSyntaxColors() {
    const { syntaxColors } = useTheme();
    return syntaxColors;
}
//# sourceMappingURL=ThemeContext.js.map