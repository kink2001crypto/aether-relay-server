/**
 * HTTP Client for VS Code Extension
 * Uses native https module (fetch not available in all VS Code versions)
 */

import * as https from 'https';
import * as http from 'http';

interface HttpResponse {
    success: boolean;
    data?: any;
    error?: string;
    statusCode?: number;
}

function parseUrl(url: string) {
    const urlObj = new URL(url);
    return {
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        protocol: urlObj.protocol
    };
}

export function httpGet(url: string): Promise<HttpResponse> {
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
                } catch {
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

export function httpPost(url: string, data: any): Promise<HttpResponse> {
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
                } catch {
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
export async function fetchJson(url: string, options?: { method?: string; body?: string; headers?: any }): Promise<any> {
    const method = options?.method || 'GET';

    if (method === 'POST') {
        const data = options?.body ? JSON.parse(options.body) : {};
        const result = await httpPost(url, data);
        if (!result.success) throw new Error(result.error);
        return { ok: true, json: async () => result.data };
    } else {
        const result = await httpGet(url);
        if (!result.success) throw new Error(result.error);
        return { ok: true, json: async () => result.data };
    }
}
