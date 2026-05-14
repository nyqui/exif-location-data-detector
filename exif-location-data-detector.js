// ==UserScript==
// @name        EXIF Location Data Detector
// @namespace   https://github.com/nyqui/exif-location-data-detector
// @version     1.0.0
// @author      nyqui
// @description UserScript that dynamically detects location data within the EXIF headers of images loaded on a webpage and provides an interactive UI to view it.
// @license     MIT

// @match       *://*/*
// @require     https://cdn.jsdelivr.net/npm/exifr@7.1.3/dist/full.umd.js
// @grant       GM_xmlhttpRequest
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       GM_registerMenuCommand
// ==/UserScript==

(function() {
    'use strict';

    // Load user settings
    let minWidth = GM_getValue('EXIF_MIN_WIDTH', 300);
    let minHeight = GM_getValue('EXIF_MIN_HEIGHT', 300);
    let highlightImage = GM_getValue('EXIF_HIGHLIGHT_IMAGE', true);
    let flashHighlight = GM_getValue('EXIF_FLASH_HIGHLIGHT', true);
    let highlightColor = GM_getValue('EXIF_HIGHLIGHT_COLOR', '#ff0055');

    const FETCH_BYTES = 131072; // 128KB buffer
    const processedImages = new WeakSet();

    const style = document.createElement('style');
    style.textContent = `
        @keyframes exif-flash-pattern {
            0%, 76.9%   { outline-color: var(--exif-hl-color); }
            77%, 84.6%  { outline-color: transparent; }
            84.7%, 92.3% { outline-color: var(--exif-hl-color); }
            92.4%, 100%  { outline-color: transparent; }
        }
    `;
    document.head.appendChild(style);

    // --- SETTINGS UI ---

    const settingsDialog = document.createElement('dialog');
    settingsDialog.style.cssText = `
        padding: 20px;
        border: none;
        border-radius: 8px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.5);
        font-family: system-ui, -apple-system, sans-serif;
        background: #1e1e1e;
        color: #fff;
        width: 280px;
    `;

    settingsDialog.addEventListener('click', (e) => {
        const rect = settingsDialog.getBoundingClientRect();
        const isInDialog = (rect.top <= e.clientY && e.clientY <= rect.top + rect.height && rect.left <= e.clientX && e.clientX <= rect.left + rect.width);
        if (!isInDialog) settingsDialog.close();
    });

    settingsDialog.innerHTML = `
        <h3 style="margin: 0 0 15px 0; font-size: 16px; border-bottom: 1px solid #444; padding-bottom: 10px;">
            EXIF Viewer Settings
        </h3>

        <div style="margin-bottom: 12px;">
            <label style="display: block; font-size: 13px; color: #aaa; margin-bottom: 5px;">Minimum Width (px)</label>
            <input type="number" id="exif-setting-width" value="${minWidth}" style="width: 100%; box-sizing: border-box; padding: 8px; background: #2a2a2a; border: 1px solid #444; color: #fff; border-radius: 4px;">
        </div>
        <div style="margin-bottom: 15px;">
            <label style="display: block; font-size: 13px; color: #aaa; margin-bottom: 5px;">Minimum Height (px)</label>
            <input type="number" id="exif-setting-height" value="${minHeight}" style="width: 100%; box-sizing: border-box; padding: 8px; background: #2a2a2a; border: 1px solid #444; color: #fff; border-radius: 4px;">
        </div>

        <div style="margin-bottom: 8px; display: flex; align-items: center; border-top: 1px solid #444; padding-top: 15px;">
            <input type="checkbox" id="exif-setting-highlight" ${highlightImage ? 'checked' : ''} style="margin-right: 8px; cursor: pointer;">
            <label for="exif-setting-highlight" style="font-size: 13px; color: #eee; cursor: pointer;">Highlight Image Border</label>
        </div>

        <div style="margin-bottom: 15px; display: flex; align-items: center; padding-left: 20px;">
            <input type="checkbox" id="exif-setting-flash" ${flashHighlight ? 'checked' : ''} style="margin-right: 8px; cursor: pointer;">
            <label for="exif-setting-flash" style="font-size: 13px; color: #ccc; cursor: pointer;">Flash Sequence (2s on, 0.2s pulse)</label>
        </div>

        <div style="margin-bottom: 25px; display: flex; align-items: center; justify-content: space-between;">
            <label style="font-size: 13px; color: #aaa;">Border Color</label>
            <input type="color" id="exif-setting-color" value="${highlightColor}" style="background: none; border: none; cursor: pointer; height: 30px; width: 50px; padding: 0;">
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 10px;">
            <button id="exif-settings-cancel" style="background: transparent; color: #aaa; border: none; cursor: pointer; padding: 8px 12px; border-radius: 4px;">Cancel</button>
            <button id="exif-settings-save" style="background: #4a90e2; color: white; border: none; cursor: pointer; padding: 8px 15px; border-radius: 4px; font-weight: bold;">Save</button>
        </div>
    `;

    document.body.appendChild(settingsDialog);

    settingsDialog.querySelector('#exif-settings-cancel').onclick = () => settingsDialog.close();

    settingsDialog.querySelector('#exif-settings-save').onclick = () => {
        const newWidth = parseInt(settingsDialog.querySelector('#exif-setting-width').value, 10);
        const newHeight = parseInt(settingsDialog.querySelector('#exif-setting-height').value, 10);
        const newHighlight = settingsDialog.querySelector('#exif-setting-highlight').checked;
        const newFlash = settingsDialog.querySelector('#exif-setting-flash').checked;
        const newColor = settingsDialog.querySelector('#exif-setting-color').value;

        if (!isNaN(newWidth) && !isNaN(newHeight)) {
            GM_setValue('EXIF_MIN_WIDTH', newWidth);
            GM_setValue('EXIF_MIN_HEIGHT', newHeight);
            minWidth = newWidth;
            minHeight = newHeight;
        }

        GM_setValue('EXIF_HIGHLIGHT_IMAGE', newHighlight);
        GM_setValue('EXIF_FLASH_HIGHLIGHT', newFlash);
        GM_setValue('EXIF_HIGHLIGHT_COLOR', newColor);

        highlightImage = newHighlight;
        flashHighlight = newFlash;
        highlightColor = newColor;

        settingsDialog.close();
    };

    GM_registerMenuCommand('Settings...', () => {
        settingsDialog.querySelector('#exif-setting-width').value = minWidth;
        settingsDialog.querySelector('#exif-setting-height').value = minHeight;
        settingsDialog.querySelector('#exif-setting-highlight').checked = highlightImage;
        settingsDialog.querySelector('#exif-setting-flash').checked = flashHighlight;
        settingsDialog.querySelector('#exif-setting-color').value = highlightColor;
        settingsDialog.showModal();
    });

    // --- DATA UI ---

    const dialog = document.createElement('dialog');
    dialog.style.cssText = `
        padding: 20px;
        border: none;
        border-radius: 8px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.5);
        font-family: system-ui, -apple-system, sans-serif;
        background: #1e1e1e;
        color: #fff;
        width: 300px;
        max-width: 90vw;
    `;

    document.body.appendChild(dialog);

    dialog.addEventListener('click', (e) => {
        const rect = dialog.getBoundingClientRect();
        const isInDialog = (rect.top <= e.clientY && e.clientY <= rect.top + rect.height && rect.left <= e.clientX && e.clientX <= rect.left + rect.width);
        if (!isInDialog) dialog.close();
    });

    function showDialog(exifData, e) {
        e.stopPropagation();

        const mapsLink = `https://www.google.com/maps?q=${exifData.latitude},${exifData.longitude}`;
        const alt = exifData.altitude ?? exifData.GPSAltitude;
        const hasAlt = alt !== undefined && alt !== null;

        let extraExifHtml = '<div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #444; font-size: 12px; color: #ccc; max-height: 200px; overflow-y: auto;">';
        const skipKeys = ['latitude', 'longitude', 'altitude', 'GPSAltitude', 'GPSAltitudeRef'];

        for (const [key, value] of Object.entries(exifData)) {
            if (!skipKeys.includes(key) && typeof value !== 'object' && value !== null) {
                extraExifHtml += `<div style="margin-bottom: 6px; line-height: 1.3;">
                    <strong style="color: #fff;">${key}:</strong> ${value}
                </div>`;
            }
        }
        extraExifHtml += '</div>';

        dialog.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #444; padding-bottom: 10px; margin-bottom: 15px;">
                <h3 style="margin: 0; font-size: 16px;">📍 Location Data</h3>
                <button id="exif-close-btn" style="background: none; border: none; color: #aaa; font-size: 16px; cursor: pointer; padding: 0; transition: color 0.2s;">✕</button>
            </div>

            <div style="font-size: 14px; margin-bottom: 8px;">
                <span style="color: #aaa;">Lat:</span> ${exifData.latitude.toFixed(6)}
            </div>
            <div style="font-size: 14px; margin-bottom: ${hasAlt ? '8px' : '15px'};">
                <span style="color: #aaa;">Lon:</span> ${exifData.longitude.toFixed(6)}
            </div>
            ${hasAlt ? `
            <div style="font-size: 14px; margin-bottom: 15px;">
                <span style="color: #aaa;">Alt:</span> ${Number(alt).toFixed(2)} m
            </div>
            ` : ''}

            <a href="${mapsLink}" target="_blank" style="
                display: block;
                text-align: center;
                background: #4a90e2;
                color: white;
                text-decoration: none;
                padding: 10px;
                border-radius: 4px;
                font-weight: bold;
                font-size: 14px;
                transition: background 0.2s;
            " onmouseover="this.style.background='#357abd'" onmouseout="this.style.background='#4a90e2'">Open in Google Maps</a>

            ${extraExifHtml}
        `;

        dialog.querySelector('#exif-close-btn').onclick = () => dialog.close();
        const closeBtn = dialog.querySelector('#exif-close-btn');
        closeBtn.onmouseenter = () => closeBtn.style.color = '#fff';
        closeBtn.onmouseleave = () => closeBtn.style.color = '#aaa';

        dialog.showModal();
    }

    function markImage(img, exifData) {
        if (highlightImage) {
            img.style.setProperty('--exif-hl-color', highlightColor);
            img.style.outline = `4px solid var(--exif-hl-color)`;
            img.style.outlineOffset = '-4px';


            if (flashHighlight) {
                img.style.animation = 'exif-flash-pattern 2.6s infinite';
            } else {
                img.style.animation = 'none';
            }
        }

        const marker = document.createElement('div');
        marker.innerHTML = '📍';
        marker.style.cssText = `
            position: absolute;
            z-index: 999999;
            cursor: pointer;
            background: rgba(0, 0, 0, 0.7);
            border: 2px solid #ff3333;
            border-radius: 50%;
            padding: 6px 7px;
            font-size: 16px;
            line-height: 1;
            box-shadow: 0 3px 8px rgba(0,0,0,0.4);
            transition: transform 0.2s;
            user-select: none;
        `;

        marker.onmouseenter = () => marker.style.transform = 'scale(1.15)';
        marker.onmouseleave = () => marker.style.transform = 'scale(1)';
        marker.onclick = (e) => showDialog(exifData, e);

        document.body.appendChild(marker);

        const updatePosition = () => {
            const rect = img.getBoundingClientRect();
            if (rect.width > 0) {
                marker.style.display = 'block';
                marker.style.top = `${rect.top + window.scrollY + 10}px`;
                marker.style.left = `${rect.left + window.scrollX + 10}px`;
            } else {
                marker.style.display = 'none';
            }
        };

        updatePosition();

        const ro = new ResizeObserver(updatePosition);
        ro.observe(img);
        window.addEventListener('resize', updatePosition);
    }

    // --- EXIF Parse ---

    function fetchAndParseExif(img) {
        GM_xmlhttpRequest({
            method: 'GET',
            url: img.src,
            headers: { 'Range': `bytes=0-${FETCH_BYTES}` },
            responseType: 'arraybuffer',
            onload: async function(response) {
                if (response.status >= 200 && response.status < 300 || response.status === 206) {
                    try {
                        const exifData = await exifr.parse(response.response, { xmp: false, icc: false });
                        if (exifData && exifData.latitude && exifData.longitude) {
                            markImage(img, exifData);
                        }
                    } catch (err) { /* silent fail */ }
                }
            }
        });
    }

    function evaluateImage(img) {
        if (img.naturalWidth >= minWidth && img.naturalHeight >= minHeight) {
            fetchAndParseExif(img);
        }
    }

    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                observer.unobserve(img);
                if (img.complete) {
                    evaluateImage(img);
                } else {
                    img.addEventListener('load', () => evaluateImage(img), { once: true });
                }
            }
        });
    }, { rootMargin: '300px 0px' });

    function observeImage(img) {
        if (!img || img.tagName !== 'IMG' || !img.src || img.src.startsWith('data:') || processedImages.has(img)) return;
        processedImages.add(img);
        imageObserver.observe(img);
    }

    document.querySelectorAll('img').forEach(observeImage);

    const domObserver = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    if (node.tagName === 'IMG') {
                        observeImage(node);
                    } else if (node.querySelectorAll) {
                        node.querySelectorAll('img').forEach(observeImage);
                    }
                }
            });
        });
    });

    domObserver.observe(document.body, { childList: true, subtree: true });

})();
