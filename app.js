// ======== הרשאת התראות (חד-פעמית) ========
if ('Notification' in window) {
    Notification.requestPermission();
}

// ======== Register Service Worker ========
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js')
        .then(reg => console.log('Service Worker registered'))
        .catch(err => console.log('Service Worker registration failed'));
}

// ======== PWA Install Prompt ========
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

// ======== TIMER STATE ========
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

// ======== SETTINGS ========
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

    soundCheckbox.classList.toggle('checked', settings.sound);
    vibrateCheckbox.classList.toggle('checked', settings.vibrate);

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
    settings[key] = Math.max(1, Math.min(6, settings[key] + delta));
    saveSettings();
    updateSettingsUI();

    if (navigator.vibrate) {
        navigator.vibrate(50);
    }
}

// ======== UI HELPERS ========
function updateEndTimeMessage() {
    if (endTime) {
        const endDate = new Date(endTime);
        const timeString =
            String(endDate.getHours()).padStart(2, '0') + ':' +
            String(endDate.getMinutes()).padStart(2, '0');

        document.getElementById('endTimeMessage').textContent =
            `אתה תהיה חלבי בשעה ${timeString}`;
    } else {
        document.getElementById('endTimeMessage').textContent = '';
    }
}

// ======== TIMER CONTROL ========
function cancelTimer() {
    if (!confirm('האם אתה בטוח שברצונך לבטל את הטיימר?')) return;

    if (timerInterval) clearInterval(timerInterval);
    if (statusTimeout) clearTimeout(statusTimeout);

    timerInterval = null;
    statusTimeout = null;
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

function resetButtons() {
    const buttons = document.querySelectorAll('.timer-button');
    buttons.forEach(btn => btn.classList.remove('active'));

    const chickenBtn = document.querySelector('.timer-button:nth-child(1)');
    const beefBtn = document.querySelector('.timer-button:nth-child(2)');

    chickenBtn.innerHTML =
        `<div class="icon">🍗</div><div>עוף</div>
         <div id="chickenHoursDisplay" style="font-size: 16px; opacity: 0.9;">
         ${formatHours(settings.chickenHours)}</div>`;

    beefBtn.innerHTML =
        `<div class="icon">🥩</div><div>בקר</div>
         <div id="beefHoursDisplay" style="font-size: 16px; opacity: 0.9;">
         ${formatHours(settings.beefHours)}</div>`;
}

function startTimer(type) {
    const hours = type === 'chicken' ? settings.chickenHours : settings.beefHours;
    const typeHebrew = type === 'chicken' ? 'עוף' : 'בקר';

    if (timerInterval && endTime) {
        const confirmRestart = confirm(
            `טיימר ${currentType === 'chicken' ? 'עוף' : 'בקר'} כבר פועל. להפעיל חדש?`
        );
        if (!confirmRestart) return;
    }

    if (timerInterval) clearInterval(timerInterval);
    if (statusTimeout) clearTimeout(statusTimeout);

    currentType = type;
    endTime = Date.now() + hours * 60 * 60 * 1000;

    document.getElementById('pageTitle').classList.add('hidden');
    document.body.classList.add('timer-active');
    document.getElementById('cancelBtn').style.display = 'inline-block';

    resetButtons();

    const buttons = document.querySelectorAll('.timer-button');
    const activeBtn = type === 'chicken' ? buttons[0] : buttons[1];

    if (activeBtn) {
        activeBtn.classList.add('active');
        activeBtn.innerHTML =
            `<div class="icon">✓</div><div>${typeHebrew}</div>
             <div style="font-size: 16px; opacity: 0.9;">פועל...</div>`;
    }

    document.getElementById('status').textContent =
        `טיימר ${typeHebrew} של ${formatHours(hours)} מתחיל עכשיו!`;

    updateEndTimeMessage();
    updateDisplay();
    timerInterval = setInterval(updateDisplay, 1000);

    if (navigator.vibrate) navigator.vibrate(200);

    // 🔹 שמירה + הודעה ל-Service Worker
    localStorage.setItem('timerEndTime', endTime);
    localStorage.setItem('timerType', type);

    if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
            type: 'START_TIMER',
            endTime,
            timerType: type,
            settings
        });
    }
}

// ======== סיום טיימר ========
function updateDisplay() {
    const now = Date.now();
    const distance = endTime - now;

    if (distance < 0) {
        clearInterval(timerInterval);
        timerInterval = null;

        document.getElementById('timeDisplay').textContent = '00:00:00';
        document.getElementById('completionMessage').textContent =
            'הסתיימה ההמתנה! אתה חלבי 🥳';
        document.getElementById('completionMessage').classList.add('show');

        resetButtons();

        // 🔹 הודעה ל-Service Worker לשליחת התראה
        if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
                type: 'TIMER_FINISHED',
                settings
            });
        }

        localStorage.removeItem('timerEndTime');
        localStorage.removeItem('timerType');
        return;
    }

    const hours = Math.floor(distance / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    document.getElementById('timeDisplay').textContent =
        String(hours).padStart(2, '0') + ':' +
        String(minutes).padStart(2, '0') + ':' +
        String(seconds).padStart(2, '0');
}

// ======== שחזור אחרי רענון ========
window.onload = function () {
    loadSettings();

    const savedEndTime = localStorage.getItem('timerEndTime');
    const savedType = localStorage.getItem('timerType');

    if (savedEndTime && savedType) {
        endTime = parseInt(savedEndTime);
        currentType = savedType;

        if (endTime > Date.now()) {
            document.body.classList.add('timer-active');
            document.getElementById('cancelBtn').style.display = 'inline-block';

            updateEndTimeMessage();
            updateDisplay();
            timerInterval = setInterval(updateDisplay, 1000);
        } else {
            localStorage.removeItem('timerEndTime');
            localStorage.removeItem('timerType');
        }
    }
};
