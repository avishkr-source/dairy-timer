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

async function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission();
    }
}

// Audio - USING HTML AUDIO ELEMENT (works better in PWA!)
let buzzerAudio = null;
let beepInterval = null;

function initAudio() {
    if (!buzzerAudio) {
        buzzerAudio = document.getElementById('nbaBuzzer');
        if (buzzerAudio) {
            buzzerAudio.volume = 1.0;
            buzzerAudio.load();
            console.log('✅ NBA Buzzer audio loaded from HTML element');
        } else {
            console.error('❌ Audio element not found!');
        }
    }
}

function playBeep(volume = 1.0) {
    try {
        console.log('🔊 playBeep called with volume:', volume);
        
        initAudio();
        
        if (!buzzerAudio) {
            console.error('❌ Buzzer audio not initialized!');
            return;
        }
        
        console.log('📊 Audio element state:', {
            paused: buzzerAudio.paused,
            readyState: buzzerAudio.readyState,
            currentTime: buzzerAudio.currentTime,
            duration: buzzerAudio.duration,
            src: buzzerAudio.src
        });
        
        buzzerAudio.volume = volume;
        buzzerAudio.currentTime = 0;
        
        console.log('▶️ Calling play()...');
        const playPromise = buzzerAudio.play();
        
        if (playPromise !== undefined) {
            playPromise
                .then(() => {
                    console.log('✅ NBA Buzzer played successfully!');
                })
                .catch(error => {
                    console.error('❌ Play failed:', error);
                    console.error('Error name:', error.name);
                    console.error('Error message:', error.message);
                    
                    // Try to resume audio context if suspended
                    if (error.name === 'NotAllowedError') {
                        console.log('⚠️ NotAllowedError - user interaction may be required');
                    }
                });
        } else {
            console.log('⚠️ play() returned undefined');
        }
    } catch (e) {
        console.error('❌ Beep exception:', e);
        console.error('Exception stack:', e.stack);
    }
}

function startContinuousBeep() {
    stopContinuousBeep();
    
    const volume = settings.volume;
    console.log('🔊 Starting continuous NBA buzzer (8 times) with volume:', volume);
    
    let beepCount = 0;
    const maxBeeps = 8;
    
    // Play immediately
    playBeep(volume);
    beepCount++;
    
    // Continue playing every 3 seconds, up to 8 times
    beepInterval = setInterval(() => {
        if (beepCount < maxBeeps) {
            playBeep(volume);
            beepCount++;
            console.log(`🔔 Beep ${beepCount}/${maxBeeps}`);
        } else {
            console.log('✅ Finished 8 beeps, stopping');
            stopContinuousBeep();
        }
    }, 3000);
}

function stopContinuousBeep() {
    if (beepInterval) {
        clearInterval(beepInterval);
        beepInterval = null;
        console.log('🔇 Stopped continuous beep');
    }
    
    // Stop any playing audio
    if (buzzerAudio && !buzzerAudio.paused) {
        buzzerAudio.pause();
        buzzerAudio.currentTime = 0;
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
    vibrate: false,
    volume: 1.0,
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
        updateButtonsForMode();
        
        alert(debugMode ? 'מצב Debug הופעל! ⚡\n\nכפתור העוף הופך ל-10 שניות' : 'מצב Debug כבוי');
        tapCount = 0;
    } else {
        tapTimer = setTimeout(() => { tapCount = 0; }, 1000);
    }
}

function updateDebugUI() {
    const title = document.getElementById('pageTitle');
    if (!title) return;
    
    if (debugMode) {
        title.style.color = '#ffeb3b';
        title.textContent = 'מה אכלת? ⚡';
    } else {
        title.style.color = 'white';
        title.textContent = 'מה אכלת?';
    }
}

function updateButtonsForMode() {
    const chickenBtn = document.querySelector('.timer-button.chicken');
    const beefBtn = document.querySelector('.timer-button.beef');
    const meatBtn = document.querySelector('.timer-button.meat');
    
    if (settings.separateTimes) {
        if (chickenBtn) chickenBtn.style.display = 'flex';
        if (beefBtn) beefBtn.style.display = 'flex';
        if (meatBtn) meatBtn.style.display = 'none';
    } else {
        if (chickenBtn) chickenBtn.style.display = 'none';
        if (beefBtn) beefBtn.style.display = 'none';
        if (meatBtn) meatBtn.style.display = 'flex';
    }
    
    // Update chicken button for debug mode
    if (chickenBtn && debugMode && settings.separateTimes) {
        chickenBtn.innerHTML = `<div class="icon">⚡</div><div>Debug</div><div id="chickenHoursDisplay" style="font-size: 16px; opacity: 0.9;">10 שניות</div>`;
        chickenBtn.style.background = 'linear-gradient(135deg, #ffeb3b 0%, #ffc107 100%)';
    } else if (chickenBtn && settings.separateTimes) {
        chickenBtn.innerHTML = `<div class="icon">🍗</div><div>עוף</div><div id="chickenHoursDisplay" style="font-size: 16px; opacity: 0.9;">${formatHours(settings.chickenHours)}</div>`;
        chickenBtn.style.background = '#D2B48C';
    }
    
    // Update meat button for debug mode
    if (meatBtn && debugMode && !settings.separateTimes) {
        meatBtn.innerHTML = `<div class="icon">⚡</div><div>Debug</div><div id="meatHoursDisplay" style="font-size: 16px; opacity: 0.9;">10 שניות</div>`;
        meatBtn.style.background = 'linear-gradient(135deg, #ffeb3b 0%, #ffc107 100%)';
    } else if (meatBtn && !settings.separateTimes) {
        meatBtn.innerHTML = `<div class="icon">🍗🥩</div><div>בשר</div><div id="meatHoursDisplay" style="font-size: 16px; opacity: 0.9;">${formatHours(settings.meatHours)}</div>`;
        meatBtn.style.background = '#D2B48C';
    }
}

function updateSettingsUI() {
    const soundCheckbox = document.getElementById('soundCheckbox');
    const vibrateCheckbox = document.getElementById('vibrateCheckbox');
    const separateCheckbox = document.getElementById('separateCheckbox');
    const volumeControl = document.getElementById('volumeControl');
    const volumeValue = document.getElementById('volumeValue');
    const volumeSlider = document.getElementById('volumeSlider');
    
    if (soundCheckbox) {
        soundCheckbox.classList.toggle('checked', settings.sound);
    }
    
    if (vibrateCheckbox) {
        vibrateCheckbox.classList.toggle('checked', settings.vibrate);
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
    
    const meatTime = document.getElementById('meatTime');
    const chickenTime = document.getElementById('chickenTime');
    const beefTime = document.getElementById('beefTime');
    
    if (meatTime) meatTime.textContent = formatHours(settings.meatHours);
    if (chickenTime) chickenTime.textContent = formatHours(settings.chickenHours);
    if (beefTime) beefTime.textContent = formatHours(settings.beefHours);
    
    const meatDisplay = document.getElementById('meatHoursDisplay');
    const chickenDisplay = document.getElementById('chickenHoursDisplay');
    const beefDisplay = document.getElementById('beefHoursDisplay');
    
    if (meatDisplay && !debugMode) meatDisplay.textContent = formatHours(settings.meatHours);
    if (chickenDisplay && !debugMode) chickenDisplay.textContent = formatHours(settings.chickenHours);
    if (beefDisplay) beefDisplay.textContent = formatHours(settings.beefHours);
    
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
        initAudio();
        playBeep(settings.volume);
    }
    
    if (type === 'vibrate' && settings[type] && 'vibrate' in navigator) {
        navigator.vibrate([200, 100, 200]);
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
    updateButtonsForMode();
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
        
        const currentStatusMsg = document.getElementById('currentStatusMsg');
        currentStatusMsg.textContent = '';
        currentStatusMsg.classList.remove('dairy');
        
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
    
    // Reset everything to initial state
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
    
    const currentStatusMsg = document.getElementById('currentStatusMsg');
    currentStatusMsg.textContent = '';
    currentStatusMsg.classList.remove('dairy');
    
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

function resetButtons() {
    const buttons = document.querySelectorAll('.timer-button');
    buttons.forEach(btn => btn.classList.remove('active'));
    
    updateButtonsForMode();
}

function startTimer(type) {
    let hours, typeHebrew, timeText;
    
    // In debug mode, chicken button becomes 10 seconds
    if (debugMode && type === 'chicken') {
        hours = 10 / 3600; // 10 seconds in hours
        typeHebrew = 'Debug';
        timeText = '10 שניות';
    } else if (debugMode && type === 'meat') {
        hours = 10 / 3600;
        typeHebrew = 'Debug';
        timeText = '10 שניות';
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
    
    // Initialize audio on user interaction
    initAudio();
    
    if (timerInterval && endTime) {
        const confirmRestart = confirm(`טיימר כבר פועל. האם להתחיל טיימר ${typeHebrew} חדש?`);
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
    
    const currentStatusMsg = document.getElementById('currentStatusMsg');
    currentStatusMsg.classList.remove('dairy');
    
    document.getElementById('pageTitle').classList.add('hidden');
    document.body.classList.add('timer-active');
    document.getElementById('cancelBtn').style.display = 'inline-block';
    document.getElementById('completionMessage').textContent = '';
    document.getElementById('completionMessage').classList.remove('show');
    document.getElementById('stopBeepBtn').style.display = 'none';
    
    resetButtons();
    
    let activeBtn;
    if (type === 'meat') {
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

function showNotification() {
    if ('Notification' in window && Notification.permission === 'granted') {
        console.log('📢 Showing notification...');
        
        // Check if we have service worker
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            // Use Service Worker notification for PWA
            navigator.serviceWorker.ready.then(function(registration) {
                registration.showNotification('טיימר בשרי-חלבי', {
                    body: 'הסתיימה ההמתנה! אתה חלבי 🥳',
                    icon: './icon-192.png',
                    badge: './icon-192.png',
                    tag: 'timer-complete',
                    requireInteraction: true,
                    vibrate: [200, 100, 200, 100, 200]
                }).then(() => {
                    console.log('✅ Notification shown via Service Worker');
                }).catch(error => {
                    console.error('❌ Notification failed:', error);
                });
            });
        } else {
            // Fallback for browser (not PWA)
            try {
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
                
                console.log('✅ Notification shown via constructor');
            } catch (e) {
                console.error('❌ Notification constructor failed:', e);
            }
        }
    } else {
        console.log('⚠️ Notifications not permitted or not available');
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
        
        console.log('⏰ Timer finished!');
        console.log('Sound enabled:', settings.sound);
        console.log('Volume:', settings.volume);
        
        document.getElementById('timeDisplay').textContent = '00:00:00';
        document.getElementById('status').textContent = '';
        document.getElementById('status').classList.remove('fade-out');
        document.getElementById('permanentStatus').textContent = '';
        document.getElementById('permanentStatus').classList.remove('show');
        
        const completionMsg = document.getElementById('completionMessage');
        completionMsg.textContent = 'הסתיימה ההמתנה';
        completionMsg.classList.add('show');
        
        document.getElementById('endTimeMessage').textContent = '';
        
        const currentStatusMsg = document.getElementById('currentStatusMsg');
        currentStatusMsg.textContent = '🎉 אתה חלבי ☕';
        currentStatusMsg.classList.add('dairy');
        
        resetButtons();
        
        showNotification();
        
        // Always show stop button to reset everything
        document.getElementById('stopBeepBtn').style.display = 'inline-block';
        
        if (settings.sound) {
            console.log('🔊 Starting continuous beep...');
            startContinuousBeep();
        } else {
            console.log('🔇 Sound is disabled');
        }
        
        if (settings.vibrate && 'vibrate' in navigator) {
            console.log('📳 Vibrating...');
            // Vibrate pattern: 3 long pulses
            navigator.vibrate([500, 200, 500, 200, 500]);
        } else {
            console.log('Vibrate disabled or not supported');
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
            if (savedType === 'meat') {
                activeBtn = document.querySelector('.timer-button.meat');
            } else if (savedType === 'chicken') {
                activeBtn = document.querySelector('.timer-button.chicken');
            } else {
                activeBtn = document.querySelector('.timer-button.beef');
            }
            
            if (activeBtn) {
                activeBtn.classList.add('active');
                const typeHebrew = savedType === 'meat' ? 'בשר' :
                                 savedType === 'chicken' ? 'עוף' : 'בקר';
                activeBtn.innerHTML = `<div class="icon">✓</div><div>${typeHebrew}</div><div style="font-size: 16px; opacity: 0.9;">פועל...</div>`;
            }
            
            const typeHebrew = savedType === 'meat' ? 'בשר' :
                             savedType === 'chicken' ? 'עוף' : 'בקר';
            let timeText;
            
            if (savedType === 'meat') {
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
