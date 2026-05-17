// Popup script for BobTester Recorder Extension
let isRecording = false;
let recordedActions = [];

// DOM elements
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const actionsCount = document.getElementById('actionsCount');
const urlInput = document.getElementById('urlInput');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const copyBtn = document.getElementById('copyBtn');
const clearBtn = document.getElementById('clearBtn');
const codePreview = document.getElementById('codePreview');
const startSection = document.getElementById('startSection');
const recordingSection = document.getElementById('recordingSection');

// Initialize
updateStatus();

// Event listeners
startBtn.addEventListener('click', startRecording);
stopBtn.addEventListener('click', stopRecording);
copyBtn.addEventListener('click', copyCode);
clearBtn.addEventListener('click', clearRecording);

// Listen for updates from background script
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'ACTIONS_UPDATED') {
    recordedActions = message.actions;
    updateActionsDisplay();
  }
});

function updateStatus() {
  chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response) => {
    if (response) {
      isRecording = response.isRecording;
      
      if (isRecording) {
        statusDot.classList.add('recording');
        statusText.textContent = 'Recording in progress...';
        startSection.classList.add('hidden');
        recordingSection.classList.remove('hidden');
        
        // Get current recorded code
        chrome.runtime.sendMessage({ type: 'GET_RECORDED_CODE' }, (codeResponse) => {
          if (codeResponse) {
            recordedActions = codeResponse.actions;
            updateActionsDisplay();
          }
        });
      } else {
        statusDot.classList.remove('recording');
        statusText.textContent = 'Ready to record';
        startSection.classList.remove('hidden');
        recordingSection.classList.add('hidden');
      }
      
      actionsCount.textContent = `${response.actionsCount || 0} actions recorded`;
    }
  });
}

function startRecording() {
  const url = urlInput.value.trim();
  
  if (!url) {
    alert('Please enter a URL');
    return;
  }
  
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    alert('URL must start with http:// or https://');
    return;
  }
  
  startBtn.disabled = true;
  startBtn.textContent = 'Starting...';
  
  chrome.runtime.sendMessage({ 
    type: 'START_RECORDING', 
    url: url 
  }, (response) => {
    startBtn.disabled = false;
    startBtn.textContent = '⏺️ Start Recording';
    
    if (response && response.success) {
      isRecording = true;
      updateStatus();
    } else {
      alert('Failed to start recording: ' + (response?.error || 'Unknown error'));
    }
  });
}

function stopRecording() {
  stopBtn.disabled = true;
  stopBtn.textContent = 'Stopping...';
  
  chrome.runtime.sendMessage({ type: 'STOP_RECORDING' }, (response) => {
    stopBtn.disabled = false;
    stopBtn.textContent = '⏹️ Stop Recording';
    
    if (response && response.success) {
      isRecording = false;
      recordedActions = response.actions || [];
      updateStatus();
      updateActionsDisplay();
      
      // Show success message
      statusText.textContent = 'Recording stopped!';
      setTimeout(() => {
        statusText.textContent = 'Ready to record';
      }, 2000);
    }
  });
}

function copyCode() {
  chrome.runtime.sendMessage({ type: 'GET_RECORDED_CODE' }, (response) => {
    if (response && response.code) {
      navigator.clipboard.writeText(response.code).then(() => {
        copyBtn.textContent = '✅ Copied!';
        setTimeout(() => {
          copyBtn.textContent = '📋 Copy Code';
        }, 2000);
      }).catch(err => {
        alert('Failed to copy: ' + err.message);
      });
    }
  });
}

function clearRecording() {
  if (confirm('Are you sure you want to clear all recorded actions?')) {
    chrome.runtime.sendMessage({ type: 'CLEAR_RECORDING' }, (response) => {
      if (response && response.success) {
        recordedActions = [];
        updateActionsDisplay();
        actionsCount.textContent = '0 actions recorded';
      }
    });
  }
}

function updateActionsDisplay() {
  if (!recordedActions || recordedActions.length === 0) {
    codePreview.textContent = '// No actions recorded yet...';
    actionsCount.textContent = '0 actions recorded';
    return;
  }
  
  chrome.runtime.sendMessage({ type: 'GET_RECORDED_CODE' }, (response) => {
    if (response && response.code) {
      codePreview.textContent = response.code;
      actionsCount.textContent = `${recordedActions.length} actions recorded`;
    }
  });
}

// Update status every second
setInterval(updateStatus, 1000);

// Made with Bob
