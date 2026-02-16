// Register Service Worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js')
        .then(reg => console.log('Service Worker registered'))
        .catch(err => console.log('Service Worker registration failed'));
}

// PWA Install Prompt
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    document.getElementById('installPrompt').classList.add('show');
});

document.getElementById('installBtn').addEventListener('click', async () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        deferredPrompt = null;
        document.getElementById('installPrompt').classList.remove('show');
    }
});

function closeInstallPrompt() {
    document.getElementById('installPrompt').classList.remove('show');
}

// Request notification permission
async function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission();
    }
}

// Audio management
let audioContext = null;
let beepInterval = null;

function getAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContext;
}

function playBeep(volume = 0.5) {
    try {
        const context = getAudioContext();
        
        if (context.state === 'suspended') {
            context.resume();
        }
        
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(context.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'square'; // Square wave is MUCH louder than sine!
        
        const now = context.currentTime;
        gainNode.gain.setValueAtTime(volume, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        
        oscillator.start(now);
        oscillator.stop(now + 0.3);
        
        console.log('✅ Beep played with volume:', volume);
    } catch (e) {
        console.error('❌ Beep failed:', e);
    }
}

function startContinuousBeep() {
    stopContinuousBeep(); // Stop any existing beep
    
    const volume = settings.volume;
    
    // Play immediately
    playBeep(volume);
    
    // Continue playing every 2 seconds
    beepInterval = setInterval(() => {
        playBeep(volume);
    }, 2000);
}

function stopContinuousBeep() {
    if (beepInterval) {
        clearInterval(beepInterval);
        beepInterval = null;
    }
}

// Timer Logic
let endTime = null;
let timerInterval = null;
let currentType = null;
let statusTimeout = null;
let debugMode = false;

let tapCount = 0;
let tapTimer = null;

let settings = {
    sound: false,
    volume: 0.5,
    separateTimes: false,
    meatHours: 5,
    chickenHours: 5,
    beefHours: 6
};

function loadSettings() {
    const saved = localStorage.getItem('timerSettings');
    if (saved) {
        try {
            const loadedSettings = JSON.parse(saved);
            settings = { ...settings, ...loadedSettings };
        } catch (e) {
            console.error('Failed to load settings:', e);
        }
    }
    
    debugMode = localStorage.getItem('debugMode') === 'true';
    updateDebugUI();
    updateSettingsUI();
    updateButtonsForMode();
}

function saveSettings() {
    localStorage.setItem('timerSettings', JSON.stringify(settings));
}

function toggleDebugMode() {
    tapCount++;
    
    if (tapTimer) clearTimeout(tapTimer);
    
    if (tapCount === 5) {
        debugMode = !debugMode;
        localStorage.setItem('debugMode', debugMode ? 'true' : 'false');
        updateDebugUI();
        playBeep(0.3);
        alert(debugMode ? 'מצב Debug הופעל! ⚡' : 'מצב Debug כבוי');
        tapCount = 0;
    } else {
        tapTimer = setTimeout(() => { tapCount = 0; }, 1000);
    }
}

function updateDebugUI() {
    const debugBtn = document.querySelector('.timer-button.debug');
    const title = document.getElementById('pageTitle');
    
    if (!debugBtn || !title) return;
    
    if (debugMode) {
        debugBtn.style.display = 'flex';
        title.style.color = '#ffeb3b';
        title.textContent = 'מה אכלת? ⚡';
    } else {
        debugBtn.style.display = 'none';
        title.style.color = 'white';
        title.textContent = 'מה אכלת?';
    }
}

function updateButtonsForMode() {
    const chickenBtn = document.querySelector('.timer-button.chicken');
    const beefBtn = document.querySelector('.timer-button.beef');
    const meatBtn = document.querySelector('.timer-button.meat');
    
    if (settings.separateTimes) {
        // Show separate buttons
        if (chickenBtn) chickenBtn.style.display = 'flex';
        if (beefBtn) beefBtn.style.display = 'flex';
        if (meatBtn) meatBtn.style.display = 'none';
    } else {
        // Show combined button
        if (chickenBtn) chickenBtn.style.display = 'none';
        if (beefBtn) beefBtn.style.display = 'none';
        if (meatBtn) meatBtn.style.display = 'flex';
    }
}

function updateSettingsUI() {
    const soundCheckbox = document.getElementById('soundCheckbox');
    const separateCheckbox = document.getElementById('separateCheckbox');
    const volumeControl = document.getElementById('volumeControl');
    const volumeValue = document.getElementById('volumeValue');
    const volumeSlider = document.getElementById('volumeSlider');
    
    if (soundCheckbox) {
        soundCheckbox.classList.toggle('checked', settings.sound);
    }
    
    if (separateCheckbox) {
        separateCheckbox.classList.toggle('checked', settings.separateTimes);
    }
    
    if (volumeControl) {
        volumeControl.style.display = settings.sound ? 'flex' : 'none';
    }
    
    if (volumeSlider) {
        volumeSlider.value = settings.volume * 100;
    }
    
    if (volumeValue) {
        volumeValue.textContent = Math.round(settings.volume * 100) + '%';
    }
    
    // Update time displays
    const meatTime = document.getElementById('meatTime');
    const chickenTime = document.getElementById('chickenTime');
    const beefTime = document.getElementById('beefTime');
    
    if (meatTime) meatTime.textContent = formatHours(settings.meatHours);
    if (chickenTime) chickenTime.textContent = formatHours(settings.chickenHours);
    if (beefTime) beefTime.textContent = formatHours(settings.beefHours);
    
    // Update button displays
    const meatDisplay = document.getElementById('meatHoursDisplay');
    const chickenDisplay = document.getElementById('chickenHoursDisplay');
    const beefDisplay = document.getElementById('beefHoursDisplay');
    
    if (meatDisplay) meatDisplay.textContent = formatHours(settings.meatHours);
    if (chickenDisplay) chickenDisplay.textContent = formatHours(settings.chickenHours);
    if (beefDisplay) beefDisplay.textContent = formatHours(settings.beefHours);
    
    // Show/hide time selectors
    const meatSelector = document.getElementById('meatTimeSelector');
    const separateSelectors = document.getElementById('separateTimeSelectors');
    
    if (settings.separateTimes) {
        if (meatSelector) meatSelector.style.display = 'none';
        if (separateSelectors) separateSelectors.style.display = 'block';
    } else {
        if (meatSelector) meatSelector.style.display = 'flex';
        if (separateSelectors) separateSelectors.style.display = 'none';
    }
}

function formatHours(hours) {
    if (hours === Math.floor(hours)) {
        return hours + ' שעות';
    } else {
        const h = Math.floor(hours);
        return h + ':30 שעות';
    }
}

function toggleNotification(type) {
    if (type === 'separateTimes') {
        settings.separateTimes = !settings.separateTimes;
        updateButtonsForMode();
    } else {
        settings[type] = !settings[type];
    }
    
    saveSettings();
    updateSettingsUI();
    
    if (type === 'sound' && settings[type]) {
        playBeep(settings.volume);
    }
}

function adjustVolume(value) {
    settings.volume = value / 100;
    saveSettings();
    updateSettingsUI();
}

function adjustTime(type, delta) {
    const key = type + 'Hours';
    settings[key] = Math.max(1, Math.min(6, settings[key] + delta));
    saveSettings();
    updateSettingsUI();
}

function openNotificationSettings() {
    document.getElementById('notificationModal').classList.add('show');
}

function closeNotificationSettings() {
    document.getElementById('notificationModal').classList.remove('show');
}

function updateEndTimeMessage() {
    const endTimeMsg = document.getElementById('endTimeMessage');
    const currentStatusMsg = document.getElementById('currentStatusMsg');
    
    if (!endTimeMsg) return;
    
    if (endTime) {
        const endDate = new Date(endTime);
        const hours = endDate.getHours();
        const minutes = endDate.getMinutes();
        const timeString = String(hours).padStart(2, '0') + ':' + String(minutes).padStart(2, '0');
        endTimeMsg.textContent = `אתה תהיה חלבי בשעה ${timeString}`;
        if (currentStatusMsg) currentStatusMsg.textContent = 'אתה בשרי';
    } else {
        endTimeMsg.textContent = '';
        if (currentStatusMsg) currentStatusMsg.textContent = '';
    }
}

function cancelTimer() {
    if (confirm('האם אתה בטוח שברצונך לבטל את הטיימר?')) {
        stopContinuousBeep();
        
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        
        if (statusTimeout) {
            clearTimeout(statusTimeout);
            statusTimeout = null;
        }
        
        endTime = null;
        currentType = null;
        
        document.getElementById('timeDisplay').textContent = '';
        document.getElementById('status').textContent = '';
        document.getElementById('permanentStatus').textContent = '';
        document.getElementById('permanentStatus').classList.remove('show');
        document.getElementById('completionMessage').textContent = '';
        document.getElementById('completionMessage').classList.remove('show');
        document.getElementById('cancelBtn').style.display = 'none';
        document.getElementById('stopBeepBtn').style.display = 'none';
        updateEndTimeMessage();
        
        document.getElementById('pageTitle').classList.remove('hidden');
        document.body.classList.remove('timer-active');
        
        resetButtons();
        
        localStorage.removeItem('timerEndTime');
        localStorage.removeItem('timerType');
    }
}

function stopBeeping() {
    stopContinuousBeep();
    document.getElementById('stopBeepBtn').style.display = 'none';
}

function resetButtons() {
    const buttons = document.querySelectorAll('.timer-button');
    buttons.forEach(btn => btn.classList.remove('active'));
    
    const meatBtn = document.querySelector('.timer-button.meat');
    const chickenBtn = document.querySelector('.timer-button.chicken');
    const beefBtn = document.querySelector('.timer-button.beef');
    const debugBtn = document.querySelector('.timer-button.debug');
    
    if (meatBtn) {
        meatBtn.innerHTML = `<div class="icon">🍗🥩</div><div>בשר</div><div id="meatHoursDisplay" style="font-size: 16px; opacity: 0.9;">${formatHours(settings.meatHours)}</div>`;
    }
    
    if (chickenBtn) {
        chickenBtn.innerHTML = `<div class="icon">🍗</div><div>עוף</div><div id="chickenHoursDisplay" style="font-size: 16px; opacity: 0.9;">${formatHours(settings.chickenHours)}</div>`;
    }
    
    if (beefBtn) {
        beefBtn.innerHTML = `<div class="icon">🥩</div><div>בקר</div><div id="beefHoursDisplay" style="font-size: 16px; opacity: 0.9;">${formatHours(settings.beefHours)}</div>`;
    }
    
    if (debugBtn && debugMode) {
        debugBtn.innerHTML = `<div class="icon">⚡</div><div>Debug</div><div style="font-size: 16px; opacity: 0.9;">1 דק׳</div>`;
    }
}

function startTimer(type) {
    let hours, typeHebrew, timeText;
    
    if (type === 'debug') {
        hours = 1 / 60;
        typeHebrew = 'Debug';
        timeText = '1 דק׳';
    } else if (type === 'meat') {
        hours = settings.meatHours;
        typeHebrew = 'בשר';
        timeText = formatHours(hours);
    } else if (type === 'chicken') {
        hours = settings.chickenHours;
        typeHebrew = 'עוף';
        timeText = formatHours(hours);
    } else {
        hours = settings.beefHours;
        typeHebrew = 'בקר';
        timeText = formatHours(hours);
    }
    
    getAudioContext();
    
    if (timerInterval && endTime) {
        const currentTypeHebrew = currentType === 'debug' ? 'Debug' : 
                                 currentType === 'meat' ? 'בשר' :
                                 currentType === 'chicken' ? 'עוף' : 'בקר';
        const confirmRestart = confirm(`טיימר ${currentTypeHebrew} כבר פועל. האם להפסיק ולהתחיל טיימר ${typeHebrew} חדש?`);
        if (!confirmRestart) return;
    }
    
    requestNotificationPermission();
    
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    
    if (statusTimeout) {
        clearTimeout(statusTimeout);
        statusTimeout = null;
    }
    
    stopContinuousBeep();
    
    currentType = type;
    endTime = new Date().getTime() + (hours * 60 * 60 * 1000);
    
    document.getElementById('pageTitle').classList.add('hidden');
    document.body.classList.add('timer-active');
    document.getElementById('cancelBtn').style.display = 'inline-block';
    document.getElementById('completionMessage').textContent = '';
    document.getElementById('completionMessage').classList.remove('show');
    document.getElementById('stopBeepBtn').style.display = 'none';
    
    resetButtons();
    
    let activeBtn;
    if (type === 'debug') {
        activeBtn = document.querySelector('.timer-button.debug');
    } else if (type === 'meat') {
        activeBtn = document.querySelector('.timer-button.meat');
    } else if (type === 'chicken') {
        activeBtn = document.querySelector('.timer-button.chicken');
    } else {
        activeBtn = document.querySelector('.timer-button.beef');
    }
    
    if (activeBtn) {
        activeBtn.classList.add('active');
        activeBtn.innerHTML = `<div class="icon">✓</div><div>${typeHebrew}</div><div style="font-size: 16px; opacity: 0.9;">פועל...</div>`;
    }
    
    const statusEl = document.getElementById('status');
    const permanentStatusEl = document.getElementById('permanentStatus');
    
    statusEl.textContent = `טיימר ${typeHebrew} של ${timeText} מתחיל עכשיו!`;
    statusEl.classList.remove('fade-out');
    permanentStatusEl.textContent = `טיימר ${typeHebrew} של ${timeText} פעיל`;
    permanentStatusEl.classList.remove('show');
    
    statusTimeout = setTimeout(() => {
        statusEl.classList.add('fade-out');
        permanentStatusEl.classList.add('show');
    }, 3000);
    
    updateEndTimeMessage();
    updateDisplay();
    timerInterval = setInterval(updateDisplay, 1000);
    
    localStorage.setItem('timerEndTime', endTime);
    localStorage.setItem('timerType', type);
}

function showNotification(timeRemaining) {
    if ('Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification('טיימר בשרי-חלבי', {
            body: 'הסתיימה ההמתנה! אתה חלבי 🥳',
            icon: './icon-192.png',
            badge: './icon-192.png',
            tag: 'timer-complete',
            requireInteraction: true
        });
        
        notification.onclick = () => {
            window.focus();
            notification.close();
        };
    }
}

// Update notification in background
function updateBackgroundNotification() {
    if ('Notification' in window && Notification.permission === 'granted' && endTime) {
        const now = new Date().getTime();
        const distance = endTime - now;
        
        if (distance > 0) {
            const hours = Math.floor(distance / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);
            
            const timeString = String(hours).padStart(2, '0') + ':' +
                              String(minutes).padStart(2, '0') + ':' +
                              String(seconds).padStart(2, '0');
            
            // This creates a persistent notification that updates
            const notification = new Notification('טיימר בשרי-חלבי פעיל', {
                body: `⏰ זמן נותר: ${timeString}`,
                icon: './icon-192.png',
                tag: 'timer-running',
                silent: true,
                requireInteraction: false
            });
            
            setTimeout(() => notification.close(), 5000);
        }
    }
}

function updateDisplay() {
    const now = new Date().getTime();
    const distance = endTime - now;
    
    if (distance < 0) {
        clearInterval(timerInterval);
        timerInterval = null;
        
        if (statusTimeout) {
            clearTimeout(statusTimeout);
            statusTimeout = null;
        }
        
        document.getElementById('timeDisplay').textContent = '00:00:00';
        document.getElementById('status').textContent = '';
        document.getElementById('status').classList.remove('fade-out');
        document.getElementById('permanentStatus').textContent = '';
        document.getElementById('permanentStatus').classList.remove('show');
        
        const completionMsg = document.getElementById('completionMessage');
        completionMsg.innerHTML = '🎉🎉🎉<br>הסתיימה ההמתנה!<br>אתה חלבי 🥳<br>🎉🎉🎉';
        completionMsg.classList.add('show');
        
        document.getElementById('endTimeMessage').textContent = '';
        document.getElementById('currentStatusMsg').textContent = '';
        
        resetButtons();
        
        showNotification();
        
        if (settings.sound) {
            startContinuousBeep();
            document.getElementById('stopBeepBtn').style.display = 'inline-block';
        }
        
        localStorage.removeItem('timerEndTime');
        localStorage.removeItem('timerType');
        return;
    }
    
    const hours = Math.floor(distance / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);
    
    const display = 
        String(hours).padStart(2, '0') + ':' +
        String(minutes).padStart(2, '0') + ':' +
        String(seconds).padStart(2, '0');
    
    document.getElementById('timeDisplay').textContent = display;
}

window.onload = function() {
    loadSettings();
    
    const title = document.getElementById('pageTitle');
    if (title) {
        title.addEventListener('click', toggleDebugMode);
        title.style.cursor = 'pointer';
    }
    
    const savedEndTime = localStorage.getItem('timerEndTime');
    const savedType = localStorage.getItem('timerType');
    
    if (savedEndTime && savedType) {
        endTime = parseInt(savedEndTime);
        currentType = savedType;
        const now = new Date().getTime();
        
        if (endTime > now) {
            document.getElementById('pageTitle').classList.add('hidden');
            document.body.classList.add('timer-active');
            document.getElementById('cancelBtn').style.display = 'inline-block';
            
            let activeBtn;
            if (savedType === 'debug') {
                activeBtn = document.querySelector('.timer-button.debug');
            } else if (savedType === 'meat') {
                activeBtn = document.querySelector('.timer-button.meat');
            } else if (savedType === 'chicken') {
                activeBtn = document.querySelector('.timer-button.chicken');
            } else {
                activeBtn = document.querySelector('.timer-button.beef');
            }
            
            if (activeBtn) {
                activeBtn.classList.add('active');
                const typeHebrew = savedType === 'debug' ? 'Debug' :
                                 savedType === 'meat' ? 'בשר' :
                                 savedType === 'chicken' ? 'עוף' : 'בקר';
                activeBtn.innerHTML = `<div class="icon">✓</div><div>${typeHebrew}</div><div style="font-size: 16px; opacity: 0.9;">פועל...</div>`;
            }
            
            const typeHebrew = savedType === 'debug' ? 'Debug' :
                             savedType === 'meat' ? 'בשר' :
                             savedType === 'chicken' ? 'עוף' : 'בקר';
            let timeText;
            
            if (savedType === 'debug') {
                timeText = '1 דק׳';
            } else if (savedType === 'meat') {
                timeText = formatHours(settings.meatHours);
            } else if (savedType === 'chicken') {
                timeText = formatHours(settings.chickenHours);
            } else {
                timeText = formatHours(settings.beefHours);
            }
            
            document.getElementById('permanentStatus').textContent = `טיימר ${typeHebrew} של ${timeText} פעיל`;
            document.getElementById('permanentStatus').classList.add('show');
            
            updateEndTimeMessage();
            updateDisplay();
            timerInterval = setInterval(updateDisplay, 1000);
        } else {
            localStorage.removeItem('timerEndTime');
            localStorage.removeItem('timerType');
        }
    }
};

window.addEventListener('beforeunload', function() {
    if (endTime && currentType) {
        localStorage.setItem('timerEndTime', endTime);
        localStorage.setItem('timerType', currentType);
    }
});

document.addEventListener('click', function(event) {
    const modal = document.getElementById('notificationModal');
    if (event.target === modal) {
        closeNotificationSettings();
    }
});
