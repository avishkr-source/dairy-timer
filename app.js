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

// Request notification permission on first interaction
async function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission();
    }
}

// Timer Logic
let endTime = null;
let timerInterval = null;
let currentType = null;
let statusTimeout = null;

let settings = {
    sound: false,
    vibrate: false,
    chickenHours: 5,
    beefHours: 6
};

function loadSettings() {
    const saved = localStorage.getItem('timerSettings');
    if (saved) {
        settings = JSON.parse(saved);
    }
    updateSettingsUI();
}

function saveSettings() {
    localStorage.setItem('timerSettings', JSON.stringify(settings));
}

function updateSettingsUI() {
    const soundCheckbox = document.getElementById('soundCheckbox');
    const vibrateCheckbox = document.getElementById('vibrateCheckbox');
    
    if (settings.sound) {
        soundCheckbox.classList.add('checked');
    } else {
        soundCheckbox.classList.remove('checked');
    }
    
    if (settings.vibrate) {
        vibrateCheckbox.classList.add('checked');
    } else {
        vibrateCheckbox.classList.remove('checked');
    }
    
    document.getElementById('chickenTime').textContent = formatHours(settings.chickenHours);
    document.getElementById('beefTime').textContent = formatHours(settings.beefHours);
    
    document.getElementById('chickenHoursDisplay').textContent = formatHours(settings.chickenHours);
    document.getElementById('beefHoursDisplay').textContent = formatHours(settings.beefHours);
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
    settings[type] = !settings[type];
    saveSettings();
    updateSettingsUI();
    
    if (navigator.vibrate && type === 'vibrate' && settings[type]) {
        navigator.vibrate(100);
    }
}

function adjustTime(type, delta) {
    const key = type + 'Hours';
    settings[key] = Math.max(0.5, Math.min(6, settings[key] + delta));
    saveSettings();
    updateSettingsUI();
    
    if (navigator.vibrate) {
        navigator.vibrate(50);
    }
}

function openNotificationSettings() {
    document.getElementById('notificationModal').classList.add('show');
}

function closeNotificationSettings() {
    document.getElementById('notificationModal').classList.remove('show');
}

function updateEndTimeMessage() {
    if (endTime) {
        const endDate = new Date(endTime);
        const hours = endDate.getHours();
        const minutes = endDate.getMinutes();
        const timeString = String(hours).padStart(2, '0') + ':' + String(minutes).padStart(2, '0');
        document.getElementById('endTimeMessage').textContent = `אתה תהיה חלבי בשעה ${timeString}`;
    } else {
        document.getElementById('endTimeMessage').textContent = '';
    }
}

function cancelTimer() {
    if (confirm('האם אתה בטוח שברצונך לבטל את הטיימר?')) {
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
        updateEndTimeMessage();
        
        document.getElementById('pageTitle').classList.remove('hidden');
        document.body.classList.remove('timer-active');
        
        resetButtons();
        
        localStorage.removeItem('timerEndTime');
        localStorage.removeItem('timerType');
    }
}

function resetButtons() {
    const buttons = document.querySelectorAll('.timer-button');
    buttons.forEach(btn => {
        btn.classList.remove('active');
    });
    
    const chickenBtn = document.querySelector('.timer-button:nth-child(1)');
    const beefBtn = document.querySelector('.timer-button:nth-child(2)');
    
    chickenBtn.innerHTML = `<div class="icon">🍗</div><div>עוף</div><div id="chickenHoursDisplay" style="font-size: 16px; opacity: 0.9;">${formatHours(settings.chickenHours)}</div>`;
    beefBtn.innerHTML = `<div class="icon">🥩</div><div>בקר</div><div id="beefHoursDisplay" style="font-size: 16px; opacity: 0.9;">${formatHours(settings.beefHours)}</div>`;
}

function startTimer(type) {
    const hours = type === 'chicken' ? settings.chickenHours : settings.beefHours;
    const typeHebrew = type === 'chicken' ? 'עוף' : 'בקר';
    
    if (timerInterval && endTime) {
        const confirmRestart = confirm(`טיימר ${currentType === 'chicken' ? 'עוף' : 'בקר'} כבר פועל. האם להפסיק ולהתחיל טיימר ${typeHebrew} חדש?`);
        if (!confirmRestart) {
            return;
        }
    }
    
    // Request notification permission when starting timer
    requestNotificationPermission();
    
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    if (statusTimeout) {
        clearTimeout(statusTimeout);
        statusTimeout = null;
    }

    currentType = type;
    endTime = new Date().getTime() + (hours * 60 * 60 * 1000);
    
    document.getElementById('pageTitle').classList.add('hidden');
    document.body.classList.add('timer-active');
    
    document.getElementById('cancelBtn').style.display = 'inline-block';
    document.getElementById('completionMessage').textContent = '';
    document.getElementById('completionMessage').classList.remove('show');
    
    resetButtons();
    
    const buttons = document.querySelectorAll('.timer-button');
    const activeBtn = type === 'chicken' ? buttons[0] : buttons[1];
        
    if (activeBtn) {
        activeBtn.classList.add('active');
        const emoji = type === 'chicken' ? '🍗' : '🥩';
        activeBtn.innerHTML = `<div class="icon">✓</div><div>${typeHebrew}</div><div style="font-size: 16px; opacity: 0.9;">פועל...</div>`;
    }
    
    const statusEl = document.getElementById('status');
    const permanentStatusEl = document.getElementById('permanentStatus');
    
    statusEl.textContent = `טיימר ${typeHebrew} של ${formatHours(hours)} מתחיל עכשיו!`;
    statusEl.classList.remove('fade-out');
    permanentStatusEl.textContent = `טיימר ${typeHebrew} של ${formatHours(hours)} פעיל`;
    permanentStatusEl.classList.remove('show');
    
    statusTimeout = setTimeout(() => {
        statusEl.classList.add('fade-out');
        permanentStatusEl.classList.add('show');
    }, 3000);
    
    updateEndTimeMessage();
    updateDisplay();
    timerInterval = setInterval(updateDisplay, 1000);
    
    if (navigator.vibrate) {
        navigator.vibrate(200);
    }

    localStorage.setItem('timerEndTime', endTime);
    localStorage.setItem('timerType', type);
}

// Beep sound function
function playBeep() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {
        console.log('Audio not supported');
    }
}

// Show notification - works even when app is in background!
function showNotification() {
    if ('Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification('טיימר בשרי-חלבי', {
            body: 'הסתיימה ההמתנה! אתה חלבי 🥳',
            icon: './icon-192.png',
            badge: './icon-192.png',
            tag: 'timer-complete',
            requireInteraction: true,
            vibrate: [200, 100, 200, 100, 200, 100, 200]
        });
        
        notification.onclick = () => {
            window.focus();
            notification.close();
        };
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
        completionMsg.textContent = 'הסתיימה ההמתנה! אתה חלבי 🥳';
        completionMsg.classList.add('show');
        
        document.getElementById('endTimeMessage').textContent = '';
        
        resetButtons();
        
        // Show notification - works in background!
        showNotification();
        
        // Play sound if enabled
        if (settings.sound) {
            playBeep();
            setTimeout(() => playBeep(), 300);
            setTimeout(() => playBeep(), 600);
        }
        
        // Vibrate if enabled
        if (settings.vibrate && navigator.vibrate) {
            navigator.vibrate([200, 100, 200, 100, 200, 100, 200]);
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
            
            const buttons = document.querySelectorAll('.timer-button');
            const activeBtn = savedType === 'chicken' ? buttons[0] : buttons[1];
            
            if (activeBtn) {
                activeBtn.classList.add('active');
                const typeHebrew = savedType === 'chicken' ? 'עוף' : 'בקר';
                activeBtn.innerHTML = `<div class="icon">✓</div><div>${typeHebrew}</div><div style="font-size: 16px; opacity: 0.9;">פועל...</div>`;
            }
            
            const typeHebrew = savedType === 'chicken' ? 'עוף' : 'בקר';
            const hours = savedType === 'chicken' ? settings.chickenHours : settings.beefHours;
            
            document.getElementById('permanentStatus').textContent = `טיימר ${typeHebrew} של ${formatHours(hours)} פעיל`;
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
