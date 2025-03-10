document.addEventListener('DOMContentLoaded', () => {
    // Verificar si localStorage está disponible
    let isLocalStorageAvailable = true;
    try {
        localStorage.setItem('test', 'test');
        localStorage.removeItem('test');
    } catch (e) {
        isLocalStorageAvailable = false;
        console.error('localStorage no está disponible:', e);
    }

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
    
    // Pomodoro Timer DOM elements
    const minutesEl = document.getElementById('minutes');
    const secondsEl = document.getElementById('seconds');
    const startBtn = document.getElementById('start-btn');
    const pauseBtn = document.getElementById('pause-btn');
    const resetBtn = document.getElementById('reset-btn');
    const pomodoroBtn = document.getElementById('pomodoro-btn');
    const shortBreakBtn = document.getElementById('short-break-btn');
    const longBreakBtn = document.getElementById('long-break-btn');
    const currentTaskDisplay = document.getElementById('current-task-display');
    
    // Task modal elements
    const taskModal = document.getElementById('task-modal');
    const taskInput = document.getElementById('task-input');
    const startTaskBtn = document.getElementById('start-task-btn');
    const currentTaskText = document.getElementById('current-task-text');
    const completedSessionsList = document.getElementById('completed-sessions-list');
    const closeModalBtn = document.getElementById('close-modal');
    const modalPendingTasksContainer = document.getElementById('modal-pending-tasks');

    // Task action buttons
    const finishTaskBtn = document.getElementById('finish-task-btn');
    const addTimeBtn = document.getElementById('add-time-btn');

    // Task management elements
    const newTaskInput = document.getElementById('new-task-input');
    const addTaskBtn = document.getElementById('add-task-btn');
    const pendingTasksContainer = document.getElementById('pending-tasks-container');

    // Timer settings (in minutes)
    const POMODORO_TIME = 25;
    const SHORT_BREAK_TIME = 5;
    const LONG_BREAK_TIME = 15;
    
    // Timer variables
    let currentMode = 'pomodoro';
    let timeLeft = POMODORO_TIME * 60; // in seconds
    let timerInterval = null;
    let isRunning = false;
    let currentTask = '';
    let completedSessions = [];
    let pendingTasks = [];
    let selectedTaskInModal = null;
    let taskStartTime = null; // Para registrar cuando se inició la tarea
    
    // Audio notification
    const alarmSound = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-alarm-digital-clock-beep-989.mp3');
    
    // Initialize timer display
    updateTimerDisplay();
    
    // Check if user is already logged in
    if (isLocalStorageAvailable && localStorage.getItem('pomodoroLoggedIn') === 'true') {
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
    
    // Event listeners for timer controls
    startBtn.addEventListener('click', showTaskModal);
    pauseBtn.addEventListener('click', pauseTimer);
    resetBtn.addEventListener('click', resetTimer);
    pomodoroBtn.addEventListener('click', () => switchMode('pomodoro'));
    shortBreakBtn.addEventListener('click', () => switchMode('shortBreak'));
    longBreakBtn.addEventListener('click', () => switchMode('longBreak'));
    startTaskBtn.addEventListener('click', startTimerWithTask);
    closeModalBtn.addEventListener('click', hideTaskModal);
    
    // Event listeners for task action buttons
    finishTaskBtn.addEventListener('click', finishTask);
    addTimeBtn.addEventListener('click', addFiveMinutes);
    
    // Task management event listeners
    addTaskBtn.addEventListener('click', addNewTask);
    newTaskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addNewTask();
        }
    });
    
    // Task input enter key
    taskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            startTimerWithTask();
        }
    });
    
    // Request notification permission
    if ('Notification' in window) {
        Notification.requestPermission();
    }
    
    function attemptLogin() {
        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();
        
        if (username === VALID_USERNAME && password === VALID_PASSWORD) {
            // Save login state
            if (isLocalStorageAvailable) {
                localStorage.setItem('pomodoroLoggedIn', 'true');
            }
            showApp();
        } else {
            loginError.textContent = 'Usuario o contraseña incorrectos';
            passwordInput.value = '';
        }
    }
    
    function showApp() {
        loginContainer.style.display = 'none';
        appContainer.style.display = 'block';
        
        // Load completed sessions and pending tasks from localStorage
        if (isLocalStorageAvailable) {
            loadCompletedSessions();
            loadPendingTasks();
        }
    }

    // Show task modal
    function showTaskModal() {
        if (currentMode !== 'pomodoro') {
            // If not in pomodoro mode, just start the timer without asking for a task
            startTimer();
            return;
        }
        
        // Clear previous selection
        selectedTaskInModal = null;
        
        // Update modal with pending tasks
        updateModalPendingTasks();
        
        // Clear task input
        taskInput.value = '';
        
        // Show modal
        taskModal.classList.add('show');
        
        // Focus on task input if no pending tasks
        if (pendingTasks.length === 0) {
            taskInput.focus();
        }
    }
    
    // Hide task modal
    function hideTaskModal() {
        taskModal.classList.remove('show');
    }
    
    // Start timer with task
    function startTimerWithTask() {
        // Get task from selection or input
        if (selectedTaskInModal !== null) {
            currentTask = pendingTasks[selectedTaskInModal].text;
            
            // Remove the task from pending tasks
            const taskId = pendingTasks[selectedTaskInModal].id;
            pendingTasks = pendingTasks.filter(task => task.id !== taskId);
            updatePendingTasksUI();
            savePendingTasks();
        } else {
            currentTask = taskInput.value.trim();
            if (currentTask === '') {
                currentTask = 'Sin descripción';
            }
        }
        
        // Update task display
        currentTaskText.textContent = currentTask;
        currentTaskDisplay.style.display = 'block'; // Mostrar el div de tarea actual
        
        // Hide modal
        hideTaskModal();
        
        // Registrar el tiempo de inicio
        taskStartTime = new Date();
        
        // Start the timer
        startTimer();
    }
    
    // Finish current task
    function finishTask() {
        if (!currentTask || !isRunning) return;
        
        // Calcular el tiempo que tomó completar la tarea
        const now = new Date();
        const elapsedTimeInMinutes = Math.round((now - taskStartTime) / 60000);
        
        // Guardar la sesión completada
        const session = {
            task: currentTask,
            timestamp: now.toISOString(),
            formattedTime: formatDate(now),
            duration: elapsedTimeInMinutes
        };
        
        completedSessions.unshift(session);
        
        // Guardar en localStorage
        if (isLocalStorageAvailable) {
            try {
                localStorage.setItem('completedSessions', JSON.stringify(completedSessions));
                updateCompletedSessionsList();
            } catch (error) {
                console.error('Error al guardar sesiones completadas:', error);
            }
        }
        
        // Mostrar notificación
        try {
            new Notification('Tarea completada', {
                body: `Has completado: ${currentTask} (${elapsedTimeInMinutes} min)`,
                icon: 'https://cdn-icons-png.flaticon.com/512/6062/6062646.png'
            });
        } catch (error) {
            console.error('Error al mostrar notificación:', error);
        }
        
        // Reiniciar el temporizador
        resetTimer();
        
        // Ocultar el div de tarea actual
        currentTask = '';
        currentTaskDisplay.style.display = 'none';
    }
    
    // Add five minutes to the timer
    function addFiveMinutes() {
        if (!isRunning) return;
        
        // Añadir 5 minutos (300 segundos) al tiempo restante
        timeLeft += 300;
        updateTimerDisplay();
    }
    
    // Add new pending task
    function addNewTask() {
        const taskText = newTaskInput.value.trim();
        if (taskText === '') return;
        
        const newTask = {
            id: Date.now(),
            text: taskText,
            createdAt: new Date().toISOString()
        };
        
        pendingTasks.push(newTask);
        newTaskInput.value = '';
        newTaskInput.focus();
        
        updatePendingTasksUI();
        savePendingTasks();
    }
    
    // Update pending tasks UI
    function updatePendingTasksUI() {
        pendingTasksContainer.innerHTML = '';
        
        if (pendingTasks.length === 0) {
            // No mostrar ningún mensaje cuando no hay tareas pendientes
            return;
        }
        
        pendingTasks.forEach((task, index) => {
            const taskItem = document.createElement('div');
            taskItem.className = 'task-item';
            taskItem.setAttribute('draggable', 'true');
            taskItem.setAttribute('data-task-id', task.id);
            
            const taskText = document.createElement('div');
            taskText.className = 'task-text';
            taskText.textContent = task.text;
            
            const taskActions = document.createElement('div');
            taskActions.className = 'task-actions';
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-task';
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
            deleteBtn.title = 'Eliminar tarea';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteTask(task.id);
            });
            
            taskActions.appendChild(deleteBtn);
            taskItem.appendChild(taskText);
            taskItem.appendChild(taskActions);
            
            // Drag and drop event listeners
            taskItem.addEventListener('dragstart', handleDragStart);
            taskItem.addEventListener('dragend', handleDragEnd);
            taskItem.addEventListener('dragover', handleDragOver);
            taskItem.addEventListener('dragenter', handleDragEnter);
            taskItem.addEventListener('dragleave', handleDragLeave);
            taskItem.addEventListener('drop', handleDrop);
            
            pendingTasksContainer.appendChild(taskItem);
        });
    }
    
    // Update modal pending tasks
    function updateModalPendingTasks() {
        modalPendingTasksContainer.innerHTML = '';
        
        if (pendingTasks.length === 0) {
            const emptyMessage = document.createElement('p');
            emptyMessage.textContent = 'No hay tareas pendientes';
            emptyMessage.style.color = '#888';
            emptyMessage.style.fontStyle = 'italic';
            modalPendingTasksContainer.appendChild(emptyMessage);
            return;
        }
        
        pendingTasks.forEach((task, index) => {
            const taskItem = document.createElement('div');
            taskItem.className = 'modal-task-item';
            taskItem.textContent = task.text;
            taskItem.setAttribute('data-index', index);
            
            taskItem.addEventListener('click', () => {
                // Remove selected class from all tasks
                document.querySelectorAll('.modal-task-item').forEach(item => {
                    item.classList.remove('selected');
                });
                
                // Add selected class to clicked task
                taskItem.classList.add('selected');
                
                // Update selected task
                selectedTaskInModal = index;
            });
            
            modalPendingTasksContainer.appendChild(taskItem);
        });
    }
    
    // Delete task
    function deleteTask(taskId) {
        pendingTasks = pendingTasks.filter(task => task.id !== taskId);
        updatePendingTasksUI();
        savePendingTasks();
    }
    
    // Save pending tasks to localStorage
    function savePendingTasks() {
        if (isLocalStorageAvailable) {
            try {
                localStorage.setItem('pendingTasks', JSON.stringify(pendingTasks));
            } catch (error) {
                console.error('Error al guardar tareas pendientes:', error);
            }
        }
    }
    
    // Load pending tasks from localStorage
    function loadPendingTasks() {
        try {
            const savedTasks = localStorage.getItem('pendingTasks');
            if (savedTasks) {
                pendingTasks = JSON.parse(savedTasks);
                updatePendingTasksUI();
            }
        } catch (error) {
            console.error('Error loading pending tasks:', error);
            localStorage.removeItem('pendingTasks');
            pendingTasks = [];
        }
    }
    
    // Drag and drop handlers
    function handleDragStart(e) {
        this.classList.add('dragging');
        e.dataTransfer.setData('text/plain', this.getAttribute('data-task-id'));
        e.dataTransfer.effectAllowed = 'move';
    }
    
    function handleDragEnd(e) {
        this.classList.remove('dragging');
    }
    
    function handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }
    
    function handleDragEnter(e) {
        e.preventDefault();
        this.classList.add('drag-over');
    }
    
    function handleDragLeave(e) {
        this.classList.remove('drag-over');
    }
    
    function handleDrop(e) {
        e.preventDefault();
        this.classList.remove('drag-over');
        
        const draggedTaskId = parseInt(e.dataTransfer.getData('text/plain'));
        const targetTaskId = parseInt(this.getAttribute('data-task-id'));
        
        if (draggedTaskId === targetTaskId) return;
        
        // Find indices
        const draggedIndex = pendingTasks.findIndex(task => task.id === draggedTaskId);
        const targetIndex = pendingTasks.findIndex(task => task.id === targetTaskId);
        
        if (draggedIndex === -1 || targetIndex === -1) return;
        
        // Reorder tasks
        const [draggedTask] = pendingTasks.splice(draggedIndex, 1);
        pendingTasks.splice(targetIndex, 0, draggedTask);
        
        // Update UI and save
        updatePendingTasksUI();
        savePendingTasks();
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
        
        // Si hay una tarea en ejecución, devolverla a la lista de pendientes
        if (currentTask && currentTask !== 'Sin descripción') {
            const newTask = {
                id: Date.now(),
                text: currentTask,
                createdAt: new Date().toISOString()
            };
            
            pendingTasks.push(newTask);
            updatePendingTasksUI();
            savePendingTasks();
        }
        
        // Reiniciar el temporizador
        setTimerForCurrentMode();
        updateTimerDisplay();
        
        // Ocultar el div de tarea actual al resetear el temporizador
        currentTask = '';
        currentTaskDisplay.style.display = 'none';
    }
    
    function completeTimer() {
        pauseTimer();
        playAlarmSound();
        showNotification();
        
        if (currentMode === 'pomodoro') {
            // Save completed session
            if (isLocalStorageAvailable) {
                saveCompletedSession();
            }
            
            // After 4 pomodoros, suggest a long break
            if (Math.random() > 0.75) {
                switchMode('longBreak');
            } else {
                switchMode('shortBreak');
            }
            
            // Ocultar el div de tarea actual al completar un pomodoro
            currentTask = '';
            currentTaskDisplay.style.display = 'none';
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
            document.body.style.backgroundColor = '#f5f5f5';
        } else {
            // Short break or long break
            if (mode === 'shortBreak') {
                shortBreakBtn.classList.add('active');
                document.body.style.backgroundColor = '#e8f5e9';
            } else {
                longBreakBtn.classList.add('active');
                document.body.style.backgroundColor = '#e3f2fd';
            }
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
        
        // Update page title with task if available
        let title = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} - Pomodoro Timer`;
        if (currentTask && currentMode === 'pomodoro') {
            title = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} - ${currentTask}`;
        }
        document.title = title;
    }
    
    function playAlarmSound() {
        alarmSound.play().catch(error => {
            console.error('Error al reproducir el sonido:', error);
        });
    }
    
    function showNotification() {
        if ('Notification' in window && Notification.permission === 'granted') {
            let message = '';
            
            if (currentMode === 'pomodoro') {
                message = `Pomodoro completado: ${currentTask}`;
            } else {
                message = 'Break time is over! Back to work.';
            }
            
            try {
                new Notification('Pomodoro Timer', {
                    body: message,
                    icon: 'https://cdn-icons-png.flaticon.com/512/6062/6062646.png'
                });
            } catch (error) {
                console.error('Error al mostrar notificación:', error);
            }
        }
    }
    
    // Save completed session
    function saveCompletedSession() {
        if (currentTask) {
            const now = new Date();
            const session = {
                task: currentTask,
                timestamp: now.toISOString(),
                formattedTime: formatDate(now),
                duration: POMODORO_TIME
            };
            
            completedSessions.unshift(session); // Add to beginning of array
            
            // Save to localStorage
            try {
                localStorage.setItem('completedSessions', JSON.stringify(completedSessions));
                // Update UI
                updateCompletedSessionsList();
            } catch (error) {
                console.error('Error al guardar sesiones completadas:', error);
            }
        }
    }
    
    // Load completed sessions from localStorage
    function loadCompletedSessions() {
        try {
            const savedSessions = localStorage.getItem('completedSessions');
            if (savedSessions) {
                completedSessions = JSON.parse(savedSessions);
                updateCompletedSessionsList();
            }
        } catch (error) {
            console.error('Error loading completed sessions:', error);
            // Reset completedSessions if there's an error
            localStorage.removeItem('completedSessions');
            completedSessions = [];
        }
    }
    
    // Update completed sessions list in UI
    function updateCompletedSessionsList() {
        if (!completedSessionsList) return; // Asegurarse de que el elemento existe
        
        completedSessionsList.innerHTML = '';
        
        if (completedSessions.length === 0) {
            const emptyMessage = document.createElement('p');
            emptyMessage.textContent = 'No hay sesiones completadas';
            emptyMessage.style.color = '#888';
            emptyMessage.style.fontStyle = 'italic';
            completedSessionsList.appendChild(emptyMessage);
            return;
        }
        
        completedSessions.forEach(session => {
            const sessionItem = document.createElement('div');
            sessionItem.className = 'session-item';
            
            const taskText = document.createElement('div');
            taskText.textContent = session.task;
            
            const timeText = document.createElement('div');
            timeText.className = 'session-time';
            timeText.textContent = `${session.formattedTime} (${session.duration} min)`;
            
            sessionItem.appendChild(taskText);
            sessionItem.appendChild(timeText);
            completedSessionsList.appendChild(sessionItem);
        });
    }
    
    // Format date helper
    function formatDate(date) {
        return date.toLocaleString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}); 