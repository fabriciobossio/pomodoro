document.addEventListener('DOMContentLoaded', () => {
    // DOM elements
    const minutesEl = document.getElementById('minutes');
    const secondsEl = document.getElementById('seconds');
    const startBtn = document.getElementById('start-btn');
    const pauseBtn = document.getElementById('pause-btn');
    const resetBtn = document.getElementById('reset-btn');
    const pomodoroBtn = document.getElementById('pomodoro-btn');
    const shortBreakBtn = document.getElementById('short-break-btn');
    const longBreakBtn = document.getElementById('long-break-btn');
    const sessionCountEl = document.getElementById('session-count');
    const modeToggleBtn = document.getElementById('mode-toggle');

    // Timer settings (in minutes)
    const POMODORO_TIME = 25;
    const SHORT_BREAK_TIME = 5;
    const LONG_BREAK_TIME = 15;
    
    // Timer variables
    let currentMode = 'pomodoro';
    let timeLeft = POMODORO_TIME * 60; // in seconds
    let timerInterval = null;
    let isRunning = false;
    let sessionCount = 0;
    let isRestMode = false;
    
    // Audio notification
    const alarmSound = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-alarm-digital-clock-beep-989.mp3');
    
    // Initialize timer display
    updateTimerDisplay();
    
    // Event listeners
    startBtn.addEventListener('click', startTimer);
    pauseBtn.addEventListener('click', pauseTimer);
    resetBtn.addEventListener('click', resetTimer);
    pomodoroBtn.addEventListener('click', () => switchMode('pomodoro'));
    shortBreakBtn.addEventListener('click', () => switchMode('shortBreak'));
    longBreakBtn.addEventListener('click', () => switchMode('longBreak'));
    modeToggleBtn.addEventListener('click', toggleMode);
    
    // Request notification permission
    if ('Notification' in window) {
        Notification.requestPermission();
    }
    
    // Mode toggle function
    function toggleMode() {
        isRestMode = !isRestMode;
        
        if (isRestMode) {
            // Switch to rest mode
            document.body.classList.add('rest-mode');
            modeToggleBtn.classList.add('rest-mode');
            modeToggleBtn.title = "Switch to work mode";
            modeToggleBtn.innerHTML = '<i class="fas fa-sun"></i>';
            
            // If in pomodoro mode, switch to short break
            if (currentMode === 'pomodoro' && !isRunning) {
                switchMode('shortBreak');
            }
        } else {
            // Switch to work mode
            document.body.classList.remove('rest-mode');
            modeToggleBtn.classList.remove('rest-mode');
            modeToggleBtn.title = "Switch to rest mode";
            modeToggleBtn.innerHTML = '<i class="fas fa-moon"></i>';
            
            // If in break mode, switch to pomodoro
            if ((currentMode === 'shortBreak' || currentMode === 'longBreak') && !isRunning) {
                switchMode('pomodoro');
            }
        }
    }
    
    // Timer functions
    function startTimer() {
        if (isRunning) return;
        
        isRunning = true;
        startBtn.disabled = true;
        pauseBtn.disabled = false;
        
        timerInterval = setInterval(() => {
            timeLeft--;
            updateTimerDisplay();
            
            if (timeLeft <= 0) {
                completeTimer();
            }
        }, 1000);
    }
    
    function pauseTimer() {
        if (!isRunning) return;
        
        isRunning = false;
        clearInterval(timerInterval);
        startBtn.disabled = false;
        pauseBtn.disabled = true;
    }
    
    function resetTimer() {
        pauseTimer();
        setTimerForCurrentMode();
        updateTimerDisplay();
    }
    
    function completeTimer() {
        pauseTimer();
        playAlarmSound();
        showNotification();
        
        if (currentMode === 'pomodoro') {
            sessionCount++;
            sessionCountEl.textContent = sessionCount;
            
            // After 4 pomodoros, suggest a long break
            if (sessionCount % 4 === 0) {
                switchMode('longBreak');
            } else {
                switchMode('shortBreak');
            }
        } else {
            switchMode('pomodoro');
        }
    }
    
    function switchMode(mode) {
        // Don't switch if timer is running
        if (isRunning) {
            pauseTimer();
        }
        
        currentMode = mode;
        setTimerForCurrentMode();
        updateTimerDisplay();
        
        // Update active button
        [pomodoroBtn, shortBreakBtn, longBreakBtn].forEach(btn => btn.classList.remove('active'));
        
        if (mode === 'pomodoro') {
            pomodoroBtn.classList.add('active');
            if (!isRestMode) {
                document.body.style.backgroundColor = '#f5f5f5';
            }
        } else if (mode === 'shortBreak') {
            shortBreakBtn.classList.add('active');
            document.body.style.backgroundColor = '#e8f5e9';
        } else {
            longBreakBtn.classList.add('active');
            document.body.style.backgroundColor = '#e3f2fd';
        }
    }
    
    function setTimerForCurrentMode() {
        switch (currentMode) {
            case 'pomodoro':
                timeLeft = POMODORO_TIME * 60;
                break;
            case 'shortBreak':
                timeLeft = SHORT_BREAK_TIME * 60;
                break;
            case 'longBreak':
                timeLeft = LONG_BREAK_TIME * 60;
                break;
        }
    }
    
    function updateTimerDisplay() {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        
        minutesEl.textContent = minutes.toString().padStart(2, '0');
        secondsEl.textContent = seconds.toString().padStart(2, '0');
        
        // Update page title
        document.title = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} - Pomodoro Timer`;
    }
    
    function playAlarmSound() {
        alarmSound.play();
    }
    
    function showNotification() {
        if ('Notification' in window && Notification.permission === 'granted') {
            let message = '';
            
            if (currentMode === 'pomodoro') {
                message = 'Pomodoro completed! Take a break.';
            } else {
                message = 'Break time is over! Back to work.';
            }
            
            new Notification('Pomodoro Timer', {
                body: message,
                icon: 'https://cdn-icons-png.flaticon.com/512/6062/6062646.png'
            });
        }
    }
}); 