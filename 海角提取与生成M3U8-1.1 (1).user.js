// ==UserScript==
// @name         海角提取与生成M3U8
// @namespace    Amor
// @version      5.3 (注释增强)
// @description  【移动端适配】UI界面已适配手机浏览器，小屏幕下自动调整为紧凑布局。默认选择规则2，并记忆用户选择。
// @author       You
// @match        *://www.haijiao.com/*
// @match        *://hai*.top
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @connect      *
// ==/UserScript==

(function() {
    'use strict';

    // --- 核心逻辑部分(无任何改动) ---
    const TARGET_API_PART = '/ts3.hjbd81.top/hjstore/video/';
    let keyURI = '', ivValue = '', sourceTs10Url = '';
    let coreDataReady = false;

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
                method: "GET", url: finalUrl,
                onload: function(response) {
                    if (response.status >= 200 && response.status < 300) {
                        console.log(`内容下载成功，将以文件名 ${filename} 保存。`);
                        downloadFile(filename, response.responseText);
                    } else {
                        alert(`下载源M3U8失败！状态码: ${response.status}`);
                    }
                },
                onerror: function(error) {
                    alert('下载源M3U8时发生网络错误，请查看控制台。');
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
                    <input type="radio" name="download-rule" value="2">
                    模式2: 优先选择这个m3u8
                </label>
            </div>
            <button id="ui-download-btn" disabled>捕获数据中...</button>
        `;

        document.body.appendChild(container);

        // --- 关键代码在这里 ---
        // 1. 尝试读取用户上次保存的选择。
        // 2. 如果是第一次运行，没有保存过选择，则使用 '2' 作为默认值。
        const savedRule = GM_getValue('downloadRule', '2');
        // 3. 根据这个值（读取的或默认的）来勾选对应的选项。
        container.querySelector(`input[value="${savedRule}"]`).checked = true;

        container.querySelector('#ui-download-btn').addEventListener('click', handleDownloadClick);
        // 当用户切换选项时，保存他的选择，以便下次打开页面时恢复
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

        @media (max-width: 600px) {
            #hj-downloader-ui {
                width: auto; max-width: 90vw; bottom: 10px; right: 10px;
                padding: 10px; font-size: 13px;
            }
            .ui-title { font-size: 14px; }
            #ui-download-btn { font-size: 14px; padding: 8px 10px; }
        }
    `);

    window.addEventListener('load', createUI);
})();
