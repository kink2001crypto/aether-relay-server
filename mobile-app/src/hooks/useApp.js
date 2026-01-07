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
exports.AppProvider = AppProvider;
exports.useApp = useApp;
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const socket_io_client_1 = require("socket.io-client");
const async_storage_1 = __importDefault(require("@react-native-async-storage/async-storage"));
const AppContext = (0, react_1.createContext)(null);
function AppProvider({ children }) {
    const [socket, setSocket] = (0, react_1.useState)(null);
    const [messages, setMessages] = (0, react_1.useState)([]);
    const [files, setFiles] = (0, react_1.useState)([]);
    const [projects, setProjects] = (0, react_1.useState)([]);
    const [currentProject, setCurrentProjectState] = (0, react_1.useState)(null);
    const [currentPath, setCurrentPath] = (0, react_1.useState)('/');
    const [fileContent, setFileContent] = (0, react_1.useState)('');
    const [terminalOutput, setTerminalOutput] = (0, react_1.useState)([]);
    const [isConnected, setIsConnected] = (0, react_1.useState)(false);
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const [serverUrl, setServerUrlState] = (0, react_1.useState)('https://nondeleterious-randee-condemningly.ngrok-free.dev'); // Public Tunnel URL
    const [selectedModel, setSelectedModelState] = (0, react_1.useState)('ollama');
    const [availableModels] = (0, react_1.useState)(['gemini', 'ollama', 'claude', 'openai', 'deepseek', 'grok']);
    // Load saved settings
    (0, react_1.useEffect)(() => {
        const loadSettings = async () => {
            try {
                const savedUrl = await async_storage_1.default.getItem('serverUrl');
                const savedModel = await async_storage_1.default.getItem('selectedModel');
                const savedProject = await async_storage_1.default.getItem('currentProject');
                if (savedUrl)
                    setServerUrlState(savedUrl);
                if (savedModel)
                    setSelectedModelState(savedModel);
                if (savedProject) {
                    try {
                        const parsed = JSON.parse(savedProject);
                        if (parsed && parsed.name && parsed.path) {
                            setCurrentProjectState(parsed);
                        }
                    }
                    catch (e) {
                        // Old format, ignore
                    }
                }
            }
            catch (e) {
                console.log('Error loading settings:', e);
            }
        };
        loadSettings();
    }, []);
    // Connect to server
    (0, react_1.useEffect)(() => {
        if (!serverUrl)
            return;
        const newSocket = (0, socket_io_client_1.io)(serverUrl, {
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            extraHeaders: {
                "ngrok-skip-browser-warning": "true",
                "bypass-tunnel-reminder": "true"
            }
        });
        newSocket.on('connect', () => {
            setIsConnected(true);
            console.log('Connected to server');
            // Register as mobile client so VS Code shows green phone icon
            newSocket.emit('register', { type: 'mobile' });
            // Get projects list
            newSocket.emit('getProjects');
        });
        newSocket.on('disconnect', () => {
            setIsConnected(false);
            console.log('Disconnected from server');
        });
        newSocket.on('projects', (data) => {
            console.log('Received projects:', data.length);
            // Sort to put Core at the top
            const sorted = [...data].sort((a, b) => {
                if (a.name.includes('Core'))
                    return -1;
                if (b.name.includes('Core'))
                    return 1;
                return a.name.localeCompare(b.name);
            });
            setProjects(sorted);
            if (sorted.length > 0 && !currentProject) {
                setCurrentProjectState(sorted[0]);
            }
        });
        newSocket.on('files', (data) => {
            setFiles(data);
        });
        newSocket.on('fileContent', (data) => {
            setFileContent(data.content);
        });
        newSocket.on('aiResponse', (data) => {
            setIsLoading(false);
            const newMessage = {
                id: Date.now().toString(),
                role: 'assistant',
                content: data.content,
                timestamp: new Date(),
                codeBlocks: data.codeBlocks,
            };
            setMessages(prev => [...prev, newMessage]);
        });
        newSocket.on('error', (error) => {
            setIsLoading(false);
            console.error('Socket error:', error);
        });
        // Auto-refresh file list when code is applied (new file created)
        newSocket.on('codeApplied', (data) => {
            if (data.success) {
                console.log('✅ Code applied successfully:', data.path);
                react_native_1.Alert.alert('✅ Code Applied!', data.message || `Saved to ${data.path}`);
                // Refresh the current directory to show new file
                if (currentProject) {
                    newSocket.emit('getFiles', { path: currentPath || '/', projectPath: currentProject.path });
                }
            }
            else {
                console.error('❌ Code apply failed:', data.error);
                react_native_1.Alert.alert('❌ Apply Failed', data.error || 'Unknown error');
            }
        });
        setSocket(newSocket);
        return () => {
            newSocket.disconnect();
        };
    }, [serverUrl]);
    // When project changes, get files
    (0, react_1.useEffect)(() => {
        if (socket && currentProject) {
            socket.emit('getFiles', { path: '/', projectPath: currentProject.path });
            setCurrentPath('/');
        }
    }, [socket, currentProject]);
    const sendMessage = (0, react_1.useCallback)((content) => {
        if (!socket || !content.trim())
            return;
        const userMessage = {
            id: Date.now().toString(),
            role: 'user',
            content,
            timestamp: new Date(),
        };
        setMessages(prev => [...prev, userMessage]);
        setIsLoading(true);
        socket.emit('chat', {
            message: content,
            model: selectedModel,
            projectPath: currentProject?.path, // Send full path for context
        });
    }, [socket, selectedModel, currentProject]);
    const navigateToPath = (0, react_1.useCallback)((path) => {
        if (!socket || !currentProject)
            return;
        setCurrentPath(path);
        setFileContent('');
        socket.emit('getFiles', { path, projectPath: currentProject.path });
    }, [socket, currentProject]);
    const openFile = (0, react_1.useCallback)((path) => {
        if (!socket || !currentProject) {
            return;
        }
        socket.emit('getFileContent', { path, projectPath: currentProject.path });
        // Broadcast file open to sync with VS Code/web
        socket.emit('file:open', { path, projectPath: currentProject.path });
    }, [socket, currentProject]);
    const saveFile = (0, react_1.useCallback)((path, content) => {
        if (!socket || !currentProject)
            return;
        socket.emit('saveFile', { path, content, projectPath: currentProject.path });
        setFileContent(content);
    }, [socket, currentProject]);
    const executeCommand = (0, react_1.useCallback)((command) => {
        if (!socket)
            return;
        // Add command to output
        setTerminalOutput(prev => [...prev, `$ ${command}`]);
        socket.emit('terminal', { command, projectPath: currentProject?.path });
        socket.once('terminalOutput', (data) => {
            if (data.output) {
                const lines = data.output.split('\n');
                setTerminalOutput(prev => [...prev, ...lines]);
            }
        });
    }, [socket, currentProject]);
    const setServerUrl = (0, react_1.useCallback)(async (url) => {
        setServerUrlState(url);
        await async_storage_1.default.setItem('serverUrl', url);
    }, []);
    const setSelectedModel = (0, react_1.useCallback)(async (model) => {
        setSelectedModelState(model);
        await async_storage_1.default.setItem('selectedModel', model);
    }, []);
    const setCurrentProject = (0, react_1.useCallback)(async (project) => {
        setCurrentProjectState(project);
        await async_storage_1.default.setItem('currentProject', JSON.stringify(project));
        // Broadcast project change to relay server for VS Code sync
        if (socket && project) {
            socket.emit('setProject', {
                name: project.name,
                path: project.path,
                folder: project.folder,
            });
        }
    }, [socket]);
    const applyCode = (0, react_1.useCallback)((code, filePath) => {
        if (!socket || !currentProject)
            return;
        socket.emit('applyCode', { code, filePath, projectPath: currentProject.path });
    }, [socket, currentProject]);
    return (<AppContext.Provider value={{
            messages,
            files,
            projects,
            currentProject,
            currentPath,
            fileContent,
            terminalOutput,
            isConnected,
            isLoading,
            serverUrl,
            selectedModel,
            availableModels,
            sendMessage,
            navigateToPath,
            executeCommand,
            setServerUrl,
            setSelectedModel,
            setCurrentProject,
            openFile,
            saveFile,
            applyCode,
        }}>
      {children}
    </AppContext.Provider>);
}
function useApp() {
    const context = (0, react_1.useContext)(AppContext);
    if (!context)
        throw new Error('useApp must be used within AppProvider');
    return context;
}
//# sourceMappingURL=useApp.js.map