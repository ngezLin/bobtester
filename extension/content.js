// Content script that runs on all pages to capture user interactions
(function() {
  'use strict';

  console.log('[BobTester Recorder] Content script loaded');

  let isRecording = false;
  let lastUrl = window.location.href;

  // Check if recording is active
  chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response) => {
    if (response && response.isRecording) {
      isRecording = true;
      initRecorder();
    }
  });

  // Listen for recording start/stop commands
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'START_RECORDING') {
      isRecording = true;
      initRecorder();
      sendResponse({ success: true });
    } else if (message.type === 'STOP_RECORDING') {
      isRecording = false;
      sendResponse({ success: true });
    }
  });

  function initRecorder() {
    console.log('[BobTester Recorder] Initializing recorder');
    
    // Record initial page load
    recordAction({
      type: 'goto',
      url: window.location.href,
      timestamp: Date.now()
    });

    // Add visual indicator
    addRecordingIndicator();
  }

  function recordAction(action) {
    if (!isRecording) return;
    
    console.log('[BobTester Recorder] Recording action:', action);
    chrome.runtime.sendMessage({
      type: 'ACTION_RECORDED',
      action: action
    });
  }

  function getSelector(element) {
    // Try to get the best selector for the element
    if (element.id) {
      return `#${element.id}`;
    }
    
    if (element.name) {
      return `[name="${element.name}"]`;
    }
    
    if (element.className && typeof element.className === 'string') {
      const classes = element.className.trim().split(/\s+/).join('.');
      if (classes) {
        return `${element.tagName.toLowerCase()}.${classes}`;
      }
    }
    
    // Try data-testid
    if (element.getAttribute('data-testid')) {
      return `[data-testid="${element.getAttribute('data-testid')}"]`;
    }
    
    // Try aria-label
    if (element.getAttribute('aria-label')) {
      return `[aria-label="${element.getAttribute('aria-label')}"]`;
    }
    
    // Try placeholder
    if (element.getAttribute('placeholder')) {
      return `[placeholder="${element.getAttribute('placeholder')}"]`;
    }
    
    // Fallback to text content for buttons/links
    if ((element.tagName === 'BUTTON' || element.tagName === 'A') && element.textContent) {
      const text = element.textContent.trim().substring(0, 30);
      return `${element.tagName.toLowerCase()}:has-text("${text}")`;
    }
    
    // Last resort: generate xpath or nth-child selector
    return generateCssPath(element);
  }

  function generateCssPath(element) {
    if (element.tagName === 'HTML') return 'html';
    if (element.tagName === 'BODY') return 'body';
    
    let path = element.tagName.toLowerCase();
    const parent = element.parentElement;
    
    if (parent) {
      const siblings = Array.from(parent.children).filter(e => e.tagName === element.tagName);
      if (siblings.length > 1) {
        const index = siblings.indexOf(element) + 1;
        path += `:nth-of-type(${index})`;
      }
      return generateCssPath(parent) + ' > ' + path;
    }
    
    return path;
  }

  // Click event listener
  document.addEventListener('click', (e) => {
    if (!isRecording) return;
    
    const target = e.target;
    const selector = getSelector(target);
    
    recordAction({
      type: 'click',
      selector: selector,
      tagName: target.tagName,
      text: target.textContent?.trim().substring(0, 50),
      timestamp: Date.now()
    });
  }, true);

  // Input event listener (for text fields)
  document.addEventListener('input', (e) => {
    if (!isRecording) return;
    
    const target = e.target;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      const selector = getSelector(target);
      
      recordAction({
        type: 'fill',
        selector: selector,
        value: target.value,
        timestamp: Date.now()
      });
    }
  }, true);

  // Change event listener (for selects, checkboxes, radios)
  document.addEventListener('change', (e) => {
    if (!isRecording) return;
    
    const target = e.target;
    const selector = getSelector(target);
    
    if (target.tagName === 'SELECT') {
      recordAction({
        type: 'select',
        selector: selector,
        value: target.value,
        timestamp: Date.now()
      });
    } else if (target.type === 'checkbox') {
      recordAction({
        type: target.checked ? 'check' : 'uncheck',
        selector: selector,
        timestamp: Date.now()
      });
    } else if (target.type === 'radio') {
      recordAction({
        type: 'check',
        selector: selector,
        timestamp: Date.now()
      });
    }
  }, true);

  // Keypress event listener (for Enter key, etc.)
  document.addEventListener('keydown', (e) => {
    if (!isRecording) return;
    
    // Only record special keys
    if (['Enter', 'Tab', 'Escape'].includes(e.key)) {
      const target = e.target;
      const selector = getSelector(target);
      
      recordAction({
        type: 'press',
        selector: selector,
        key: e.key,
        timestamp: Date.now()
      });
    }
  }, true);

  // Monitor URL changes (for SPAs)
  setInterval(() => {
    if (!isRecording) return;
    
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      recordAction({
        type: 'goto',
        url: currentUrl,
        timestamp: Date.now()
      });
    }
  }, 500);

  function addRecordingIndicator() {
    // Remove existing indicator if any
    const existing = document.getElementById('bobtester-recording-indicator');
    if (existing) existing.remove();
    
    const indicator = document.createElement('div');
    indicator.id = 'bobtester-recording-indicator';
    indicator.innerHTML = `
      <div style="
        position: fixed;
        top: 10px;
        right: 10px;
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        color: white;
        padding: 12px 20px;
        border-radius: 25px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 14px;
        font-weight: 600;
        z-index: 999999;
        box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
        display: flex;
        align-items: center;
        gap: 8px;
        animation: pulse 2s infinite;
      ">
        <span style="
          width: 8px;
          height: 8px;
          background: white;
          border-radius: 50%;
          animation: blink 1s infinite;
        "></span>
        Recording...
      </div>
      <style>
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      </style>
    `;
    document.body.appendChild(indicator);
  }
})();

// Made with Bob
