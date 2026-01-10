"use strict";
/**
 * HTTP Client for VS Code Extension
 * Uses native https module (fetch not available in all VS Code versions)
 */
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
exports.httpGet = httpGet;
exports.httpPost = httpPost;
exports.fetchJson = fetchJson;
const https = __importStar(require("https"));
const http = __importStar(require("http"));
function parseUrl(url) {
    const urlObj = new URL(url);
    return {
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        protocol: urlObj.protocol
    };
}
function httpGet(url) {
    return new Promise((resolve) => {
        const { hostname, port, path, protocol } = parseUrl(url);
        const client = protocol === 'https:' ? https : http;
        const options = {
            hostname,
            port,
            path,
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        };
        const req = client.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const data = JSON.parse(body);
                    resolve({ success: true, data, statusCode: res.statusCode });
                }
                catch {
                    resolve({ success: true, data: body, statusCode: res.statusCode });
                }
            });
        });
        req.on('error', (e) => {
            console.error('HTTP GET error:', e.message);
            resolve({ success: false, error: e.message });
        });
        req.end();
    });
}
function httpPost(url, data) {
    return new Promise((resolve) => {
        const { hostname, port, path, protocol } = parseUrl(url);
        const client = protocol === 'https:' ? https : http;
        const postData = JSON.stringify(data);
        const options = {
            hostname,
            port,
            path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData),
                'Accept': 'application/json'
            }
        };
        const req = client.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const responseData = JSON.parse(body);
                    resolve({ success: true, data: responseData, statusCode: res.statusCode });
                }
                catch {
                    resolve({ success: true, data: body, statusCode: res.statusCode });
                }
            });
        });
        req.on('error', (e) => {
            console.error('HTTP POST error:', e.message);
            resolve({ success: false, error: e.message });
        });
        req.write(postData);
        req.end();
    });
}
// Wrapper that mimics fetch API for easier migration
async function fetchJson(url, options) {
    const method = options?.method || 'GET';
    if (method === 'POST') {
        const data = options?.body ? JSON.parse(options.body) : {};
        const result = await httpPost(url, data);
        if (!result.success)
            throw new Error(result.error);
        return { ok: true, json: async () => result.data };
    }
    else {
        const result = await httpGet(url);
        if (!result.success)
            throw new Error(result.error);
        return { ok: true, json: async () => result.data };
    }
}
//# sourceMappingURL=httpClient.js.map