document.addEventListener('DOMContentLoaded', () => {
    // Login elements
    const loginContainer = document.getElementById('login-container');
    const appContainer = document.getElementById('app-container');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.getElementById('login-btn');
    const loginError = document.getElementById('login-error');
    
    // Login credentials
    const VALID_USERNAME = 'fabricio';
    const VALID_PASSWORD = 'fabricio';
    
    // Check if user is already logged in
    if (localStorage.getItem('pomodoroLoggedIn') === 'true') {
        showApp();
    }
    
    // Login event listener
    loginBtn.addEventListener('click', attemptLogin);
    
    // Login on Enter key
    passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            attemptLogin();
        }
    });
    
    function attemptLogin() {
        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();
        
        if (username === VALID_USERNAME && password === VALID_PASSWORD) {
            // Save login state
            localStorage.setItem('pomodoroLoggedIn', 'true');
            showApp();
        } else {
            loginError.textContent = 'Usuario o contraseña incorrectos';
            passwordInput.value = '';
        }
    }
    
    function showApp() {
        loginContainer.style.display = 'none';
        appContainer.style.display = 'block';
    }

    // Pomodoro Timer DOM elements
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
        if (currentMode === 'pomodoro') {
            // If in pomodoro mode, switch to short break
            switchMode('shortBreak');
        } else {
            // If in any break mode, switch to pomodoro
            switchMode('pomodoro');
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
        
        // Update toggle icon based on mode
        if (mode === 'pomodoro') {
            pomodoroBtn.classList.add('active');
            document.body.style.backgroundColor = '#f5f5f5';
            
            // Update toggle to show rest icon
            modeToggleBtn.innerHTML = '<i class="fas fa-moon"></i>';
            modeToggleBtn.title = "Switch to rest mode";
            isRestMode = false;
            document.body.classList.remove('rest-mode');
            modeToggleBtn.classList.remove('rest-mode');
        } else {
            // Short break or long break
            if (mode === 'shortBreak') {
                shortBreakBtn.classList.add('active');
                document.body.style.backgroundColor = '#e8f5e9';
            } else {
                longBreakBtn.classList.add('active');
                document.body.style.backgroundColor = '#e3f2fd';
            }
            
            // Update toggle to show work icon
            modeToggleBtn.innerHTML = '<i class="fas fa-sun"></i>';
            modeToggleBtn.title = "Switch to work mode";
            isRestMode = true;
            document.body.classList.add('rest-mode');
            modeToggleBtn.classList.add('rest-mode');
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