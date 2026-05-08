// ==UserScript==
// @name         海角视频 M3U8 获取器ui 0.2.0
// @name:zh-CN   海角视频 M3U8 获取器ui 0.2.0
// @name:en      HAIJIO Video M3U8 Extractor
// @namespace    http://tampermonkey.net/
// @version      0.2.0
// @description  Extract M3U8 video URLs from HAIJIO website
// @match        *://www.haijiao.com/*
// @grant        GM_xmlhttpRequest
// @license      MIT
// @connect      *
// @updateURL    https://raw.githubusercontent.com/Amor-Aprca/-/main/%E6%B5%B7%E8%A7%92%E8%A7%86%E9%A2%91%20M3U8%20%E8%8E%B7%E5%8F%96%E5%99%A8.js
// @downloadURL  https://raw.githubusercontent.com/Amor-Aprca/-/main/%E6%B5%B7%E8%A7%92%E8%A7%86%E9%A2%91%20M3U8%20%E8%8E%B7%E5%8F%96%E5%99%A8.js
// ==/UserScript==

(function() {
    'use strict';

    // 全局变量
    let tsUrls = [];
    let currentTsUrl = '';
    let resultPanel = null;
    let hasExtracted = false;

    // 添加按钮
    function addButton() {
        const existingBtn = document.getElementById('hjExtractBtn');
        if (existingBtn) existingBtn.remove();

        const btn = document.createElement('button');
        btn.id = 'hjExtractBtn';
        btn.textContent = '提取 M3U8';
        btn.style.cssText = `
            position: fixed;
            top: 50px;
            right: 30px;
            padding: 12px 18px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: bold;
            z-index: 999999;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            transition: background 0.3s;
        `;

        if ('ontouchstart' in window) {
            btn.style.padding = '14px 20px';
            btn.style.fontSize = '16px';
        }

        btn.onmouseover = () => btn.style.background = '#0056b3';
        btn.onmouseout = () => btn.style.background = '#007bff';

        btn.onclick = extractM3u8;
        document.body.appendChild(btn);
    }

    // 提取M3U8
    function extractM3u8() {
        if (hasExtracted) return;

        const btn = document.getElementById('hjExtractBtn');
        btn.textContent = '提取中...';
        btn.disabled = true;
        btn.style.background = '#6c757d';

        tsUrls = [];
        hasExtracted = true;

        // 查找TS
        findTsInPage();
        monitorNetworkRequests();
        findTsInPerformance();

        // 5秒后如果没找到TS，提示
        setTimeout(() => {
            if (tsUrls.length === 0) {
                showResult('❌ 未找到TS链接', '', '');
                btn.textContent = '提取 M3U8';
                btn.disabled = false;
                btn.style.background = '#007bff';
                hasExtracted = false;
            }
        }, 5000);

        // 8秒后停止监听
        setTimeout(() => stopMonitoring(), 8000);
    }

    // 从页面查找TS
    function findTsInPage() {
        const html = document.body.innerHTML;
        const tsPattern = /https:\/\/[^"'\s]+?\.ts[^"'\s]*/gi;
        const matches = html.match(tsPattern);

        if (matches) {
            matches.forEach(url => {
                if (/ts\d*\.hj/.test(url) && !tsUrls.includes(url)) {
                    tsUrls.push(url);
                    currentTsUrl = url;
                }
            });
            if (tsUrls.length > 0) generateM3u8();
        }
    }

    // 监听网络请求
    function monitorNetworkRequests() {
        const originalFetch = window.fetch;
        window.fetch = function(...args) {
            const url = args[0];
            if (typeof url === 'string' && url.includes('.ts') && /ts\d*\.hj/.test(url)) {
                addTsUrl(url);
            }
            return originalFetch.apply(this, args);
        };

        const originalXHROpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function(method, url, ...args) {
            if (typeof url === 'string' && url.includes('.ts') && /ts\d*\.hj/.test(url)) {
                addTsUrl(url);
            }
            return originalXHROpen.apply(this, [method, url, ...args]);
        };

        window._originalFetch = originalFetch;
        window._originalXHROpen = originalXHROpen;
    }

    // 从Performance API查找
    function findTsInPerformance() {
        if (window.performance && window.performance.getEntries) {
            setTimeout(() => {
                const resources = performance.getEntries();
                resources.forEach(resource => {
                    if (resource.name.includes('.ts') && /ts\d*\.hj/.test(resource.name)) {
                        addTsUrl(resource.name);
                    }
                });
            }, 1000);
        }
    }

    // 添加TS URL
    function addTsUrl(url) {
        if (!tsUrls.includes(url)) {
            tsUrls.push(url);
            currentTsUrl = url;
            if (tsUrls.length === 1) generateM3u8();
        }
    }

    // 生成M3U8
    function generateM3u8() {
        const tsUrl = currentTsUrl || tsUrls[0];
        console.log('处理TS:', tsUrl);

        try {
            const urlParts = tsUrl.split('/');
            const path = urlParts.slice(0, -1).join('/');
            const fileName = urlParts[urlParts.length - 1];

            const lastUnderscore = fileName.lastIndexOf('_');
            if (lastUnderscore === -1) throw new Error('无法解析文件名');

            const numberPart = fileName.substring(lastUnderscore + 1);
            const charsToDelete = numberPart.length;

            const m3u8Url = path + '/' + fileName.substring(0, lastUnderscore + 1) + 'i.m3u8';
            console.log('生成M3U8:', m3u8Url);

            verifyAndShow(m3u8Url);

        } catch (error) {
            showResult('❌ 生成失败: ' + error.message, tsUrl, '');
        }
    }

    // 验证并Ping测试
    function verifyAndShow(m3u8Url) {
        showResult('🔄 测试中...', m3u8Url, '请稍候...');

        GM_xmlhttpRequest({
            method: 'GET',
            url: m3u8Url,
            timeout: 15000,
            headers: { 'Range': 'bytes=0-1023' },
            onload: response => {
                if (response.status === 200 || response.status === 206) {
                    const text = response.responseText;
                    const lineCount = (text.match(/#EXTINF:/g) || []).length;
                    const duration = calculateDuration(text);
                    const displayCount = response.status === 206 ? lineCount + '+' : lineCount;

                    showResult('✅ 成功！', m3u8Url, `${duration} | ${displayCount}个片段`);

                    setTimeout(() => testPlay(m3u8Url, duration, displayCount), 1000);
                } else {
                    showResult('❌ 无法访问 (HTTP ' + response.status + ')', m3u8Url, '');
                }
            },
            onerror: () => showResult('❌ 请求失败', m3u8Url, ''),
            ontimeout: () => showResult('❌ 请求超时', m3u8Url, '')
        });
    }

    // 测试播放
    function testPlay(m3u8Url, duration, lineCount) {
        const video = document.createElement('video');
        video.style.cssText = `
            position: fixed;
            bottom: 10px;
            right: 10px;
            width: 100%;
            max-width: 400px;
            height: 225px;
            border: 3px solid #4caf50;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            z-index: 999998;
            background: #000;
        `;
        video.controls = true;
        video.muted = true;

        const source = document.createElement('source');
        source.src = m3u8Url;
        source.type = 'application/x-mpegURL';
        video.appendChild(source);

        document.body.appendChild(video);

        const playTimeout = setTimeout(() => {
            if (video.parentNode) video.parentNode.removeChild(video);
        }, 5000);

        video.addEventListener('loadedmetadata', () => {
            clearTimeout(playTimeout);
            showResult('✅ 视频已加载', m3u8Url, `${duration} | ${lineCount}个片段`);
        });

        video.addEventListener('canplay', () => {
            showResult('✅ 可以播放', m3u8Url, `${duration} | ${lineCount}个片段`);
        });

        video.addEventListener('error', () => {
            clearTimeout(playTimeout);
            if (video.parentNode) video.parentNode.removeChild(video);
            showResult('⚠️ 播放可能有问题', m3u8Url, `${duration} | ${lineCount}个片段`);
        });

        setTimeout(() => {
            if (video.parentNode) {
                video.parentNode.removeChild(video);
            }
        }, 10000);
    }

    // 计算时长
    function calculateDuration(m3u8Text) {
        const matches = m3u8Text.match(/#EXTINF:([0-9.]+)/g);
        if (!matches) return '未知';

        let total = 0;
        matches.forEach(match => {
            total += parseFloat(match.split(':')[1]);
        });

        const min = Math.floor(total / 60);
        const sec = Math.floor(total % 60);
        return `${min}:${sec.toString().padStart(2, '0')}`;
    }

    // 停止监听
    function stopMonitoring() {
        if (window._originalFetch) window.fetch = window._originalFetch;
        if (window._originalXHROpen) XMLHttpRequest.prototype.open = window._originalXHROpen;
    }

    // 显示结果
    function showResult(title, url, info) {
        if (resultPanel) resultPanel.remove();

        resultPanel = document.createElement('div');
        resultPanel.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            width: 340px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            z-index: 1000000;
            overflow: hidden;
        `;

        const header = document.createElement('div');
        header.style.cssText = `
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px;
            font-weight: bold;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;
        header.innerHTML = `
            <span>🎬 海角视频</span>
            <button onclick="this.closest('div').parentElement.remove()" style="
                background: rgba(255,255,255,0.2);
                border: none;
                color: white;
                width: 28px;
                height: 28px;
                border-radius: 50%;
                cursor: pointer;
                font-size: 16px;
            ">×</button>
        `;

        const content = document.createElement('div');
        content.style.cssText = 'padding: 20px;';

        content.innerHTML = `
            <div style="margin-bottom: 15px;">
                <div style="font-size: 13px; color: #666; margin-bottom: 8px;">
                    ${title}
                </div>
                <div style="background: #f5f5f5; padding: 10px; border-radius: 6px; font-size: 12px; word-break: break-all; margin-bottom: 15px;">
                    ${url}
                </div>
            </div>
            <div style="display: flex; gap: 8px;">
                <button onclick="navigator.clipboard.writeText('${url}').then(() => { this.textContent='已复制'; setTimeout(() => this.textContent='复制', 1500); })" style="
                    flex: 1;
                    padding: 12px;
                    background: #2196f3;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: bold;
                ">复制</button>
                <button onclick="download('${url}')" style="
                    flex: 1;
                    padding: 12px;
                    background: #4caf50;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: bold;
                ">下载</button>
            </div>
            ${info ? `<div style="text-align: center; margin-top: 10px; font-size: 12px; color: #666;">${info}</div>` : ''}
        `;

        resultPanel.appendChild(header);
        resultPanel.appendChild(content);
        document.body.appendChild(resultPanel);

        // 10秒后自动关闭
        setTimeout(() => {
            if (resultPanel) resultPanel.remove();
        }, 10000);
    }

    // 下载
    window.download = function(url) {
        GM_xmlhttpRequest({
            method: 'GET',
            url: url,
            onload: response => {
                if (response.status === 200) {
                    const blob = new Blob([response.responseText], { type: 'application/x-mpegURL' });
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = `hj_video_${Date.now()}.m3u8`;
                    a.click();
                    URL.revokeObjectURL(a.href);
                }
            }
        });
    };

    // 监听路由变化
    new MutationObserver(() => {
        if (!document.getElementById('hjExtractBtn')) {
            addButton();
        }
    }).observe(document, { subtree: true, childList: true });

    // 初始化
    addButton();
})();
