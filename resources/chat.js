// AETHER AI Chat Panel Frontend Logic

const vscode = acquireVsCodeApi();

// State
let messages = [];
let conversations = [];
let isRecording = false;
let recognition = null;
let currentModel = 'gemini';
let modelVariants = {};
let showingHistory = false;

// Elements
const messagesContainer = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const micButton = document.getElementById('micButton');
const clearButton = document.getElementById('clearButton');
const modelSelect = document.getElementById('modelSelect');
const variantSelect = document.getElementById('variantSelect');
const statusDot = document.getElementById('statusDot');
const mobileDot = document.getElementById('mobileDot');
const historyBtn = document.getElementById('historyBtn');
const settingsBtn = document.getElementById('settingsBtn');
const historyPanel = document.getElementById('historyPanel');
const settingsPanel = document.getElementById('settingsPanel');
const conversationsList = document.getElementById('conversationsList');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Notify webview is ready
    vscode.postMessage({ type: 'ready' });

    // Setup event listeners
    sendButton.addEventListener('click', sendMessage);
    clearButton.addEventListener('click', clearChat);
    micButton.addEventListener('click', toggleMic);
    modelSelect.addEventListener('change', changeModel);
    
    if (variantSelect) {
        variantSelect.addEventListener('change', changeVariant);
    }
    
    if (historyBtn) {
        historyBtn.addEventListener('click', toggleHistory);
    }
    
    if (settingsBtn) {
        settingsBtn.addEventListener('click', toggleSettings);
    }

    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Auto-resize textarea
    messageInput.addEventListener('input', () => {
        messageInput.style.height = 'auto';
        messageInput.style.height = Math.min(messageInput.scrollHeight, 150) + 'px';
    });

    // Initialize speech recognition if available
    initSpeechRecognition();
});

// Handle messages from extension
window.addEventListener('message', (event) => {
    const message = event.data;

    switch (message.type) {
        case 'addMessage':
            addMessage(message.role, message.content);
            break;
        case 'loadMessages':
            loadMessages(message.messages);
            break;
        case 'clearMessages':
            clearMessages();
            break;
        case 'status':
            updateStatus(message.connected);
            break;
        case 'mobileStatus':
            updateMobileStatus(message.connected);
            break;
        case 'conversations':
            updateConversations(message.conversations);
            break;
        case 'models':
            updateModels(message.models);
            break;
        case 'currentModel':
            currentModel = message.model;
            if (modelSelect) modelSelect.value = message.model;
            break;
        case 'currentVariant':
            if (variantSelect) variantSelect.value = message.variant;
            break;
    }
});

function sendMessage() {
    const content = messageInput.value.trim();
    if (!content) return;

    vscode.postMessage({ type: 'sendMessage', content });

    messageInput.value = '';
    messageInput.style.height = 'auto';

    // Show loading
    showLoading();
}

function addMessage(role, content) {
    // Remove welcome message if exists
    const welcome = document.querySelector('.welcome');
    if (welcome) welcome.remove();

    // Remove loading if exists
    const loading = document.querySelector('.loading');
    if (loading) loading.remove();

    const messageEl = document.createElement('div');
    messageEl.className = `message ${role}`;

    // Parse content for code blocks
    const parsedContent = parseContent(content);

    messageEl.innerHTML = `
        <div class="message-header">
            <span>${role === 'user' ? '👤 You' : '🧠 AETHER'}</span>
        </div>
        <div class="message-content">${parsedContent}</div>
    `;

    messagesContainer.appendChild(messageEl);
    scrollToBottom();
}

function parseContent(content) {
    // Parse code blocks
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let parsed = content;
    let match;
    let blockId = 0;

    while ((match = codeBlockRegex.exec(content)) !== null) {
        const language = match[1] || 'text';
        const code = match[2].trim();

        // Extract filename from first line comment
        const lines = code.split('\n');
        let filename = null;
        const filenameMatch = lines[0].match(/^(?:\/\/|#|\/\*|<!--)\s*([^\s*\->]+\.[a-zA-Z]+)/);
        if (filenameMatch) {
            filename = filenameMatch[1];
        }

        const blockHtml = `
            <div class="code-block" data-id="${blockId}">
                <div class="code-header">
                    <span class="code-language">${filename || language.toUpperCase()}</span>
                    <div class="code-actions">
                        <button class="code-action-btn" onclick="copyCode(${blockId})">📋</button>
                        ${filename && !['bash', 'shell', 'terminal', 'delete', 'git'].includes(language.toLowerCase())
                ? `<button class="code-action-btn apply" onclick="applyCode(${blockId}, '${filename}')">✅ Apply</button>`
                : ''}
                        ${['bash', 'shell', 'sh'].includes(language.toLowerCase())
                ? `<button class="code-action-btn run" onclick="runCommand(${blockId})">▶ Run</button>`
                : ''}
                    </div>
                </div>
                <pre><code id="code-${blockId}">${escapeHtml(code)}</code></pre>
            </div>
        `;

        parsed = parsed.replace(match[0], blockHtml);
        blockId++;
    }

    // Parse inline code
    parsed = parsed.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Parse bold
    parsed = parsed.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Parse links
    parsed = parsed.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');

    // Parse newlines
    parsed = parsed.replace(/\n/g, '<br>');

    return parsed;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function copyCode(blockId) {
    const codeEl = document.getElementById(`code-${blockId}`);
    if (codeEl) {
        navigator.clipboard.writeText(codeEl.textContent);
    }
}

function applyCode(blockId, filePath) {
    const codeEl = document.getElementById(`code-${blockId}`);
    if (codeEl) {
        vscode.postMessage({
            type: 'applyCode',
            code: codeEl.textContent,
            filePath
        });
    }
}

function runCommand(blockId) {
    const codeEl = document.getElementById(`code-${blockId}`);
    if (codeEl) {
        vscode.postMessage({
            type: 'runCommand',
            command: codeEl.textContent
        });
    }
}

function loadMessages(msgs) {
    clearMessages();
    msgs.forEach(msg => addMessage(msg.role, msg.content));
}

function clearMessages() {
    messagesContainer.innerHTML = `
        <div class="welcome">
            <div class="welcome-icon">🚀</div>
            <div class="welcome-title">Welcome to AETHER AI</div>
            <div class="welcome-text">Ask me to write code, fix bugs, or explain concepts!</div>
        </div>
    `;
}

function clearChat() {
    vscode.postMessage({ type: 'clearChat' });
}

function changeModel() {
    currentModel = modelSelect.value;
    vscode.postMessage({ type: 'changeModel', model: modelSelect.value });
    // Request variants for this model
    vscode.postMessage({ type: 'getVariants', model: modelSelect.value });
}

function changeVariant() {
    if (variantSelect) {
        vscode.postMessage({ type: 'changeVariant', variant: variantSelect.value });
    }
}

function toggleHistory() {
    showingHistory = !showingHistory;
    if (historyPanel) {
        historyPanel.classList.toggle('visible', showingHistory);
    }
    if (settingsPanel) {
        settingsPanel.classList.remove('visible');
    }
    if (showingHistory) {
        vscode.postMessage({ type: 'getConversations' });
    }
}

function toggleSettings() {
    if (settingsPanel) {
        settingsPanel.classList.toggle('visible');
    }
    if (historyPanel) {
        historyPanel.classList.remove('visible');
        showingHistory = false;
    }
}

function updateConversations(convos) {
    conversations = convos;
    if (conversationsList) {
        if (convos.length === 0) {
            conversationsList.innerHTML = '<div class="empty-history">No conversations yet</div>';
        } else {
            conversationsList.innerHTML = convos.map(c => `
                <div class="conversation-item" onclick="loadConversation('${c.projectPath}')">
                    <div class="conversation-info">
                        <div class="conversation-name">📁 ${c.projectName}</div>
                        <div class="conversation-meta">${c.messageCount} messages</div>
                    </div>
                    <button class="delete-btn" onclick="event.stopPropagation(); deleteConversation('${c.projectPath}')">✕</button>
                </div>
            `).join('');
        }
    }
}

function loadConversation(projectPath) {
    vscode.postMessage({ type: 'loadConversation', projectPath });
    toggleHistory();
}

function deleteConversation(projectPath) {
    vscode.postMessage({ type: 'deleteConversation', projectPath });
}

function updateModels(models) {
    modelVariants = models;
    // Update variant select if current model has variants
    if (variantSelect && models[currentModel]) {
        variantSelect.innerHTML = models[currentModel].map(m => 
            `<option value="${m.id}">${m.name}</option>`
        ).join('');
    }
}

function showLoading() {
    const loading = document.createElement('div');
    loading.className = 'loading';
    loading.innerHTML = `
        <div class="loading-dots">
            <span></span>
            <span></span>
            <span></span>
        </div>
        <span>AETHER is thinking...</span>
    `;
    messagesContainer.appendChild(loading);
    scrollToBottom();
}

function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function updateStatus(connected) {
    statusDot.classList.toggle('connected', connected);
}

function updateMobileStatus(connected) {
    mobileDot.classList.toggle('connected', connected);
}

// Speech Recognition
function initSpeechRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'fr-FR';

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            messageInput.value += transcript;
            messageInput.style.height = 'auto';
            messageInput.style.height = Math.min(messageInput.scrollHeight, 150) + 'px';
        };

        recognition.onend = () => {
            isRecording = false;
            micButton.classList.remove('recording');
            micButton.textContent = '🎤';
        };

        recognition.onerror = () => {
            isRecording = false;
            micButton.classList.remove('recording');
            micButton.textContent = '🎤';
        };
    }
}

function toggleMic() {
    if (!recognition) {
        alert('Speech recognition not supported in this browser');
        return;
    }

    if (isRecording) {
        recognition.stop();
    } else {
        recognition.start();
        isRecording = true;
        micButton.classList.add('recording');
        micButton.textContent = '🔴';
    }
}

// Save API key
function saveApiKey(provider) {
    const input = document.getElementById(`apiKey-${provider}`);
    if (input) {
        vscode.postMessage({ type: 'saveApiKey', provider, key: input.value });
    }
}

// Make functions globally accessible
window.copyCode = copyCode;
window.applyCode = applyCode;
window.runCommand = runCommand;
window.loadConversation = loadConversation;
window.deleteConversation = deleteConversation;
window.saveApiKey = saveApiKey;
