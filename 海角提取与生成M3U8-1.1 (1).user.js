// ==UserScript==
// @name         海角提取与生成M3U8
// @namespace    Amor
// @version      5.4
// @description  【UI显示修复】修复了手机端UI可能不显示的问题，采用更可靠的UI加载机制。
// @author       You
// @match        *://www.haijiao.com/*
// @match        *://*/*
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @connect      *
// ==/UserScript==

(function() {
    'use strict';

    // --- 全局变量与状态 ---
    const TARGET_API_PART = '/ts3.hjbd81.top/hjstore/video/';

    // 核心数据 (全部来自主M3U8文件)
    let keyURI = '', ivValue = '', sourceTs10Url = '';
    
    // 状态标志
    let coreDataReady = false;
    
    // --- 文件名与数据处理 ---

    /**
     * [仅用于模式1] 从页面标题获取并处理文件名
     */
    function getFileNameFromTitle() {
        try {
            const titleSpan = document.querySelector('#details-page .header h2 span');
            if (!titleSpan) return '未找到标题';
            let title = titleSpan.textContent.trim().replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '');
            return title.substring(0, 15) || '无标题';
        } catch (error) {
            return '获取文件名失败';
        }
    }

    /**
     * 解析主m3u8文件，一次性提取所有核心数据
     */
    function extractCoreData(content, baseUrl) {
        if (coreDataReady) return;

        console.log("捕获到主M3U8文件，开始解析所有核心数据...");
        const lines = content.split('\n');

        for (const line of lines) {
            if (line.includes('#EXT-X-KEY')) {
                const uriMatch = line.match(/URI="([^"]+)"/);
                const ivMatch = line.match(/IV=([^,]+)/);
                if (uriMatch) keyURI = new URL(uriMatch[1], baseUrl).href;
                if (ivMatch) ivValue = ivMatch[0];
            }
            if (line.includes('10.ts')) {
                sourceTs10Url = new URL(line.trim(), baseUrl).href.split('?')[0];
            }
        }

        if (keyURI && ivValue && sourceTs10Url) {
            coreDataReady = true;
            console.log("核心数据全部解析成功!");
            updateUIStatus(true);
        } else {
            console.error("核心数据解析失败，部分信息缺失。请检查M3U8文件内容。");
        }
    }
    
    // --- 下载逻辑 ---

    function handleDownloadClick() {
        if (!coreDataReady) {
            alert("核心数据尚未捕获，请等待UI状态变为“就绪”。");
            return;
        }
    
        const selectedRule = document.querySelector('input[name="download-rule"]:checked').value;
    
        if (selectedRule === '1') {
            const fileName = getFileNameFromTitle();
            console.log(`执行模式1下载，文件名: ${fileName}.m3u8`);
            const baseTsPath = sourceTs10Url.replace(/10\.ts$/, '');
            const encryptionInfo = `METHOD=AES-128,URI="${keyURI}",${ivValue}`;
            
            let m3u8Content = "#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-TARGETDURATION:3\n#EXT-X-MEDIA-SEQUENCE:0\n";
            m3u8Content += `#EXT-X-KEY:${encryptionInfo}\n`;
            for (let i = 0; i <= 5000; i++) {
                 m3u8Content += `#EXTINF:3.000,\n${baseTsPath}${i}.ts\n`;
            }
            m3u8Content += "#EXT-X-ENDLIST\n";
            downloadFile(`${fileName}.m3u8`, m3u8Content);
    
        } else if (selectedRule === '2') {
            console.log(`执行模式2下载...`);
            
            const finalUrl = sourceTs10Url.slice(0, -5) + '.m3u8';
            const filename = finalUrl.substring(finalUrl.lastIndexOf('/') + 1);
            
            console.log(`准备从URL下载内容: ${finalUrl}`);
            
            GM_xmlhttpRequest({
                method: "GET",
                url: finalUrl,
                onload: function(response) {
                    if (response.status >= 200 && response.status < 300) {
                        console.log(`内容下载成功，将以文件名 ${filename} 保存。`);
                        downloadFile(filename, response.responseText);
                    } else {
                        alert(`下载源M3U8失败！状态码: ${response.status}`);
                        console.error(`下载源M3U8失败:`, response);
                    }
                },
                onerror: function(error) {
                    alert('下载源M3U8时发生网络错误，请查看控制台。');
                    console.error('下载源M3U8错误:', error);
                }
            });
        }
    }
    
    function downloadFile(filename, content) {
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        console.log(`已成功触发下载: ${filename}`);
    }

    // --- 网络拦截器 ---
    const originalFetch = window.fetch;
    window.fetch = function(input, init) {
        const url = (input instanceof Request) ? input.url : input;
        if (url.includes(TARGET_API_PART)) {
            return originalFetch.apply(this, arguments).then(response => {
                const clonedResponse = response.clone();
                clonedResponse.text().then(text => extractCoreData(text, clonedResponse.url));
                return response;
            });
        }
        return originalFetch.apply(this, arguments);
    };
    
    const originalXhrSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function() {
        this.addEventListener('load', () => {
             const url = this.responseURL;
             if (url && url.includes(TARGET_API_PART)) {
                extractCoreData(this.responseText, url);
             }
        });
        return originalXhrSend.apply(this, arguments);
    };

    // --- UI界面 ---
    function createUI() {
        if (document.getElementById('hj-downloader-ui')) return; // 防止重复创建
        
        const container = document.createElement('div');
        container.id = 'hj-downloader-ui';
        container.innerHTML = `
            <div class="ui-title">M3U8下载器</div>
            <div id="ui-status" class="status-waiting">状态: 等待视频数据...</div>
            <div class="ui-rules">
                <label title="生成一个包含所有ts分片链接的本地M3U8文件，使用页面标题命名。">
                    <input type="radio" name="download-rule" value="1">
                    模式1: 生成列表(用标题命名)
                </label>
                <label title="下载转换后的源M3U8文件本身，并使用其链接派生的名字命名。">
                    <input type="radio" name="download-rule" value="2" checked>
                    模式2: 下载源内容(用URL命名)
                </label>
            </div>
            <button id="ui-download-btn" disabled>捕获数据中...</button>
        `;
        
        document.body.appendChild(container);
        
        const savedRule = GM_getValue('downloadRule', '2');
        container.querySelector(`input[value="${savedRule}"]`).checked = true;

        container.querySelector('#ui-download-btn').addEventListener('click', handleDownloadClick);
        container.querySelectorAll('input[name="download-rule"]').forEach(radio => {
            radio.addEventListener('change', (e) => GM_setValue('downloadRule', e.target.value));
        });
    }
    
    function updateUIStatus(isReady) {
        const statusEl = document.getElementById('ui-status');
        const buttonEl = document.getElementById('ui-download-btn');
        if (isReady && statusEl) {
            statusEl.textContent = '状态: 数据已就绪！';
            statusEl.className = 'status-ready';
            buttonEl.textContent = '下载 M3U8';
            buttonEl.disabled = false;
        }
    }

    GM_addStyle(`
        #hj-downloader-ui {
            position: fixed; bottom: 20px; right: 20px;
            background-color: #2c3e50; color: #ecf0f1;
            padding: 15px; border-radius: 10px; z-index: 99999;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 14px; text-align: left;
            box-shadow: 0 5px 15px rgba(0,0,0,0.4);
            width: 250px;
            transition: all 0.3s ease;
        }
        .ui-title { font-size: 16px; font-weight: bold; margin-bottom: 10px; color: #3498db; border-bottom: 1px solid #34495e; padding-bottom: 5px;}
        #ui-status { margin-bottom: 12px; font-style: italic; transition: color 0.3s; }
        .status-waiting { color: #f1c40f; }
        .status-ready { color: #2ecc71; font-weight: bold; }
        .ui-rules { display: flex; flex-direction: column; gap: 8px; margin-bottom: 15px; }
        .ui-rules label { display: flex; align-items: center; cursor: pointer; }
        .ui-rules input { margin-right: 8px; }
        #ui-download-btn {
            width: 100%; background-color: #3498db; color: white; border: none;
            padding: 10px 12px; border-radius: 5px; cursor: pointer;
            transition: background-color 0.3s, transform 0.1s; font-size: 15px; font-weight: bold;
        }
        #ui-download-btn:hover:not(:disabled) { background-color: #2980b9; transform: scale(1.02); }
        #ui-download-btn:disabled { background-color: #95a5a6; cursor: not-allowed; }

        /* --- 移动端适配样式 --- */
        @media (max-width: 600px) {
            #hj-downloader-ui {
                width: auto;
                max-width: 90vw;
                bottom: 10px;
                right: 10px;
                padding: 10px;
                font-size: 13px;
            }
            .ui-title {
                font-size: 14px;
            }
            #ui-download-btn {
                font-size: 14px;
                padding: 8px 10px;
            }
        }
    `);

    // **核心修正：使用更可靠的UI初始化方法**
    function init() {
        const interval = setInterval(() => {
            if (document.body) {
                clearInterval(interval); // 找到body，立刻停止检查
                createUI(); // 创建UI
            }
        }, 100); // 每100毫秒检查一次
    }

    init(); // 立即开始检查

})();// ==UserScript==
// @name         海角提取与生成M3U8
// @namespace    Amor
// @version      5.4
// @description  【UI显示修复】修复了手机端UI可能不显示的问题，采用更可靠的UI加载机制。
// @author       You
// @match        *://www.haijiao.com/*
// @match        *://*/*
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @connect      *
// ==/UserScript==

(function() {
    'use strict';

    // --- 全局变量与状态 ---
    const TARGET_API_PART = '/ts3.hjbd81.top/hjstore/video/';

    // 核心数据 (全部来自主M3U8文件)
    let keyURI = '', ivValue = '', sourceTs10Url = '';
    
    // 状态标志
    let coreDataReady = false;
    
    // --- 文件名与数据处理 ---

    /**
     * [仅用于模式1] 从页面标题获取并处理文件名
     */
    function getFileNameFromTitle() {
        try {
            const titleSpan = document.querySelector('#details-page .header h2 span');
            if (!titleSpan) return '未找到标题';
            let title = titleSpan.textContent.trim().replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '');
            return title.substring(0, 15) || '无标题';
        } catch (error) {
            return '获取文件名失败';
        }
    }

    /**
     * 解析主m3u8文件，一次性提取所有核心数据
     */
    function extractCoreData(content, baseUrl) {
        if (coreDataReady) return;

        console.log("捕获到主M3U8文件，开始解析所有核心数据...");
        const lines = content.split('\n');

        for (const line of lines) {
            if (line.includes('#EXT-X-KEY')) {
                const uriMatch = line.match(/URI="([^"]+)"/);
                const ivMatch = line.match(/IV=([^,]+)/);
                if (uriMatch) keyURI = new URL(uriMatch[1], baseUrl).href;
                if (ivMatch) ivValue = ivMatch[0];
            }
            if (line.includes('10.ts')) {
                sourceTs10Url = new URL(line.trim(), baseUrl).href.split('?')[0];
            }
        }

        if (keyURI && ivValue && sourceTs10Url) {
            coreDataReady = true;
            console.log("核心数据全部解析成功!");
            updateUIStatus(true);
        } else {
            console.error("核心数据解析失败，部分信息缺失。请检查M3U8文件内容。");
        }
    }
    
    // --- 下载逻辑 ---

    function handleDownloadClick() {
        if (!coreDataReady) {
            alert("核心数据尚未捕获，请等待UI状态变为“就绪”。");
            return;
        }
    
        const selectedRule = document.querySelector('input[name="download-rule"]:checked').value;
    
        if (selectedRule === '1') {
            const fileName = getFileNameFromTitle();
            console.log(`执行模式1下载，文件名: ${fileName}.m3u8`);
            const baseTsPath = sourceTs10Url.replace(/10\.ts$/, '');
            const encryptionInfo = `METHOD=AES-128,URI="${keyURI}",${ivValue}`;
            
            let m3u8Content = "#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-TARGETDURATION:3\n#EXT-X-MEDIA-SEQUENCE:0\n";
            m3u8Content += `#EXT-X-KEY:${encryptionInfo}\n`;
            for (let i = 0; i <= 5000; i++) {
                 m3u8Content += `#EXTINF:3.000,\n${baseTsPath}${i}.ts\n`;
            }
            m3u8Content += "#EXT-X-ENDLIST\n";
            downloadFile(`${fileName}.m3u8`, m3u8Content);
    
        } else if (selectedRule === '2') {
            console.log(`执行模式2下载...`);
            
            const finalUrl = sourceTs10Url.slice(0, -5) + '.m3u8';
            const filename = finalUrl.substring(finalUrl.lastIndexOf('/') + 1);
            
            console.log(`准备从URL下载内容: ${finalUrl}`);
            
            GM_xmlhttpRequest({
                method: "GET",
                url: finalUrl,
                onload: function(response) {
                    if (response.status >= 200 && response.status < 300) {
                        console.log(`内容下载成功，将以文件名 ${filename} 保存。`);
                        downloadFile(filename, response.responseText);
                    } else {
                        alert(`下载源M3U8失败！状态码: ${response.status}`);
                        console.error(`下载源M3U8失败:`, response);
                    }
                },
                onerror: function(error) {
                    alert('下载源M3U8时发生网络错误，请查看控制台。');
                    console.error('下载源M3U8错误:', error);
                }
            });
        }
    }
    
    function downloadFile(filename, content) {
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        console.log(`已成功触发下载: ${filename}`);
    }

    // --- 网络拦截器 ---
    const originalFetch = window.fetch;
    window.fetch = function(input, init) {
        const url = (input instanceof Request) ? input.url : input;
        if (url.includes(TARGET_API_PART)) {
            return originalFetch.apply(this, arguments).then(response => {
                const clonedResponse = response.clone();
                clonedResponse.text().then(text => extractCoreData(text, clonedResponse.url));
                return response;
            });
        }
        return originalFetch.apply(this, arguments);
    };
    
    const originalXhrSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function() {
        this.addEventListener('load', () => {
             const url = this.responseURL;
             if (url && url.includes(TARGET_API_PART)) {
                extractCoreData(this.responseText, url);
             }
        });
        return originalXhrSend.apply(this, arguments);
    };

    // --- UI界面 ---
    function createUI() {
        if (document.getElementById('hj-downloader-ui')) return; // 防止重复创建
        
        const container = document.createElement('div');
        container.id = 'hj-downloader-ui';
        container.innerHTML = `
            <div class="ui-title">M3U8下载器</div>
            <div id="ui-status" class="status-waiting">状态: 等待视频数据...</div>
            <div class="ui-rules">
                <label title="生成一个包含所有ts分片链接的本地M3U8文件，使用页面标题命名。">
                    <input type="radio" name="download-rule" value="1">
                    模式1: 生成m3u8
                </label>
                <label title="下载转换后的源M3U8文件本身，并使用其链接派生的名字命名。">
                    <input type="radio" name="download-rule" value="2" checked>
                    模式2:优先这个
                </label>
            </div>
            <button id="ui-download-btn" disabled>捕获数据中...</button>
        `;
        
        document.body.appendChild(container);
        
        const savedRule = GM_getValue('downloadRule', '2');
        container.querySelector(`input[value="${savedRule}"]`).checked = true;

        container.querySelector('#ui-download-btn').addEventListener('click', handleDownloadClick);
        container.querySelectorAll('input[name="download-rule"]').forEach(radio => {
            radio.addEventListener('change', (e) => GM_setValue('downloadRule', e.target.value));
        });
    }
    
    function updateUIStatus(isReady) {
        const statusEl = document.getElementById('ui-status');
        const buttonEl = document.getElementById('ui-download-btn');
        if (isReady && statusEl) {
            statusEl.textContent = '状态: 数据已就绪！';
            statusEl.className = 'status-ready';
            buttonEl.textContent = '下载 M3U8';
            buttonEl.disabled = false;
        }
    }

    GM_addStyle(`
        #hj-downloader-ui {
            position: fixed; bottom: 20px; right: 20px;
            background-color: #2c3e50; color: #ecf0f1;
            padding: 15px; border-radius: 10px; z-index: 99999;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 14px; text-align: left;
            box-shadow: 0 5px 15px rgba(0,0,0,0.4);
            width: 250px;
            transition: all 0.3s ease;
        }
        .ui-title { font-size: 16px; font-weight: bold; margin-bottom: 10px; color: #3498db; border-bottom: 1px solid #34495e; padding-bottom: 5px;}
        #ui-status { margin-bottom: 12px; font-style: italic; transition: color 0.3s; }
        .status-waiting { color: #f1c40f; }
        .status-ready { color: #2ecc71; font-weight: bold; }
        .ui-rules { display: flex; flex-direction: column; gap: 8px; margin-bottom: 15px; }
        .ui-rules label { display: flex; align-items: center; cursor: pointer; }
        .ui-rules input { margin-right: 8px; }
        #ui-download-btn {
            width: 100%; background-color: #3498db; color: white; border: none;
            padding: 10px 12px; border-radius: 5px; cursor: pointer;
            transition: background-color 0.3s, transform 0.1s; font-size: 15px; font-weight: bold;
        }
        #ui-download-btn:hover:not(:disabled) { background-color: #2980b9; transform: scale(1.02); }
        #ui-download-btn:disabled { background-color: #95a5a6; cursor: not-allowed; }

        /* --- 移动端适配样式 --- */
        @media (max-width: 600px) {
            #hj-downloader-ui {
                width: auto;
                max-width: 90vw;
                bottom: 10px;
                right: 10px;
                padding: 10px;
                font-size: 13px;
            }
            .ui-title {
                font-size: 14px;
            }
            #ui-download-btn {
                font-size: 14px;
                padding: 8px 10px;
            }
        }
    `);

    // **核心修正：使用更可靠的UI初始化方法**
    function init() {
        const interval = setInterval(() => {
            if (document.body) {
                clearInterval(interval); // 找到body，立刻停止检查
                createUI(); // 创建UI
            }
        }, 100); // 每100毫秒检查一次
    }

    init(); // 立即开始检查

})();
