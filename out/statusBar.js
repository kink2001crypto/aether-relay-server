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
exports.StatusBarManager = void 0;
const vscode = __importStar(require("vscode"));
class StatusBarManager {
    constructor(context) {
        this.mobileConnected = false;
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        this.statusBarItem.command = 'aether.showStatus';
        this.statusBarItem.show();
        context.subscriptions.push(this.statusBarItem);
        this.setDisconnected();
    }
    setConnecting() {
        this.statusBarItem.text = '$(sync~spin) AETHER';
        this.statusBarItem.tooltip = 'Connecting to relay server...';
        this.statusBarItem.backgroundColor = undefined;
    }
    setDisconnected() {
        this.mobileConnected = false;
        this.statusBarItem.text = '$(device-mobile) AETHER';
        this.statusBarItem.tooltip = 'AETHER: Disconnected from relay server';
        this.statusBarItem.color = '#ef4444'; // Red
    }
    setConnected() {
        this.statusBarItem.text = '$(device-mobile) AETHER';
        this.statusBarItem.tooltip = 'AETHER: Connected to server';
        this.statusBarItem.color = '#10b981'; // Green
    }
    setMobileStatus(connected) {
        this.mobileConnected = connected;
        if (connected) {
            this.statusBarItem.text = '$(device-mobile) AETHER';
            this.statusBarItem.tooltip = '📱 Mobile connected';
            this.statusBarItem.color = '#10b981'; // Green
        }
        else {
            this.statusBarItem.text = '$(device-mobile) AETHER';
            this.statusBarItem.tooltip = 'Waiting for mobile connection...';
            this.statusBarItem.color = '#f59e0b'; // Orange/Yellow
        }
    }
    isMobileConnected() {
        return this.mobileConnected;
    }
}
exports.StatusBarManager = StatusBarManager;
//# sourceMappingURL=statusBar.js.map