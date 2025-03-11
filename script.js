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
            
            // Verificar y eliminar tareas completadas que siguen en pendientes
            removeCompletedTasksFromPending();
            
            // Forzar limpieza del DOM
            setTimeout(forceDOMCleanup, 500);
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
        // Variable para almacenar el ID de la tarea actual
        let currentTaskId = null;
        
        // Get task from selection or input
        if (selectedTaskInModal !== null) {
            // Usar una tarea existente de la lista de pendientes
            const selectedTask = pendingTasks[selectedTaskInModal];
            currentTask = selectedTask.text;
            currentTaskId = selectedTask.id;
            
            console.log('Iniciando tarea existente:', currentTask, 'con ID:', currentTaskId);
        } else {
            // Crear una nueva tarea desde el input
            currentTask = taskInput.value.trim();
            if (currentTask === '') {
                currentTask = 'Sin descripción';
                currentTaskId = null; // Sin ID para tareas sin descripción
            } else {
                // Si es una tarea nueva con texto, añadirla a pendientes
                currentTaskId = Date.now();
                const newTask = {
                    id: currentTaskId,
                    text: currentTask,
                    createdAt: new Date().toISOString()
                };
                
                pendingTasks.push(newTask);
                savePendingTasks();
                updatePendingTasksUI();
                console.log('Creando nueva tarea:', currentTask, 'con ID:', currentTaskId);
            }
        }
        
        // Update task display
        currentTaskText.textContent = currentTask;
        currentTaskDisplay.style.display = 'block'; // Mostrar el div de tarea actual
        
        // Guardar el ID de la tarea actual como atributo de datos
        if (currentTaskId) {
            currentTaskText.setAttribute('data-task-id', currentTaskId);
            console.log('ID de tarea guardado en DOM:', currentTaskId);
        } else {
            currentTaskText.removeAttribute('data-task-id');
        }
        
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
        
        // Obtener el ID de la tarea actual
        const currentTaskId = currentTaskText.getAttribute('data-task-id');
        console.log('Finalizando tarea:', currentTask, 'con ID:', currentTaskId);
        
        // Calcular el tiempo que tomó completar la tarea
        const now = new Date();
        const elapsedTimeInMinutes = Math.round((now - taskStartTime) / 60000);
        
        // Guardar la sesión completada
        const session = {
            task: currentTask,
            taskId: currentTaskId ? parseInt(currentTaskId) : null,
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
        
        // Eliminar la tarea de la lista de pendientes usando su ID
        if (currentTaskId) {
            removeTaskById(currentTaskId);
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
        console.log('ACTUALIZANDO UI DE TAREAS PENDIENTES');
        console.log('Número de tareas pendientes:', pendingTasks.length);
        
        // Limpiar completamente el contenedor
        pendingTasksContainer.innerHTML = '';
        
        if (pendingTasks.length === 0) {
            console.log('No hay tareas pendientes para mostrar');
            // No mostrar ningún mensaje cuando no hay tareas pendientes
            return;
        }
        
        // Crear elementos para cada tarea
        pendingTasks.forEach((task, index) => {
            console.log('Renderizando tarea:', task);
            
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
        
        // Verificar que el DOM se actualizó correctamente
        console.log('Elementos de tareas en el DOM después de actualizar:', pendingTasksContainer.children.length);
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
        console.log('Eliminando tarea con ID:', taskId);
        debugTasks('Antes de eliminar');
        
        const originalLength = pendingTasks.length;
        pendingTasks = pendingTasks.filter(task => task.id !== taskId);
        
        console.log('Se eliminaron', originalLength - pendingTasks.length, 'tareas');
        debugTasks('Después de eliminar');
        
        updatePendingTasksUI();
        savePendingTasks();
    }
    
    // Función de depuración para verificar el estado de las tareas pendientes
    function debugTasks(message) {
        console.log('DEBUG [' + message + '] - Tareas pendientes:', JSON.stringify(pendingTasks));
    }
    
    // Modificar savePendingTasks para incluir depuración
    function savePendingTasks() {
        debugTasks('savePendingTasks');
        if (isLocalStorageAvailable) {
            try {
                localStorage.setItem('pendingTasks', JSON.stringify(pendingTasks));
            } catch (error) {
                console.error('Error al guardar tareas pendientes:', error);
            }
        }
    }
    
    // Función para verificar y corregir los IDs de las tareas
    function verifyTaskIds() {
        console.log('Verificando IDs de tareas pendientes...');
        let modified = false;
        
        // Verificar que todos los IDs sean números enteros
        for (let i = 0; i < pendingTasks.length; i++) {
            const task = pendingTasks[i];
            
            // Si el ID no es un número o es una cadena, convertirlo a número
            if (typeof task.id !== 'number' || isNaN(task.id)) {
                console.warn('Tarea con ID inválido:', task);
                
                // Intentar convertir a número si es una cadena numérica
                if (typeof task.id === 'string' && !isNaN(parseInt(task.id))) {
                    task.id = parseInt(task.id);
                    console.log('ID convertido a número:', task.id);
                    modified = true;
                } else {
                    // Asignar un nuevo ID único
                    task.id = Date.now() + i;
                    console.log('Asignado nuevo ID:', task.id);
                    modified = true;
                }
            }
        }
        
        // Si se modificaron tareas, guardar los cambios
        if (modified) {
            console.log('Se corrigieron IDs de tareas, guardando cambios...');
            localStorage.setItem('pendingTasks', JSON.stringify(pendingTasks));
            updatePendingTasksUI();
        } else {
            console.log('Todos los IDs de tareas son válidos.');
        }
    }
    
    // Función para limpiar el localStorage y reiniciar la aplicación
    function resetApplication() {
        console.log('Reiniciando aplicación y limpiando datos...');
        
        // Limpiar localStorage
        localStorage.removeItem('pendingTasks');
        localStorage.removeItem('completedSessions');
        
        // Reiniciar variables
        pendingTasks = [];
        completedSessions = [];
        
        // Actualizar UI
        updatePendingTasksUI();
        updateCompletedSessionsList();
        
        console.log('Aplicación reiniciada correctamente.');
    }
    
    // Función para verificar si hay tareas duplicadas y corregirlas
    function checkForDuplicateTasks() {
        console.log('Verificando tareas duplicadas...');
        
        // Crear un mapa para detectar duplicados por ID
        const taskMap = new Map();
        const duplicateIds = [];
        
        // Buscar duplicados
        for (const task of pendingTasks) {
            if (taskMap.has(task.id)) {
                duplicateIds.push(task.id);
            } else {
                taskMap.set(task.id, task);
            }
        }
        
        // Si hay duplicados, eliminarlos
        if (duplicateIds.length > 0) {
            console.warn('Se encontraron tareas duplicadas con IDs:', duplicateIds);
            
            // Filtrar para mantener solo una instancia de cada tarea
            const uniqueTasks = [];
            const seenIds = new Set();
            
            for (const task of pendingTasks) {
                if (!seenIds.has(task.id)) {
                    uniqueTasks.push(task);
                    seenIds.add(task.id);
                }
            }
            
            // Actualizar la lista de tareas
            pendingTasks = uniqueTasks;
            
            // Guardar cambios
            localStorage.setItem('pendingTasks', JSON.stringify(pendingTasks));
            updatePendingTasksUI();
            
            console.log('Tareas duplicadas eliminadas.');
        } else {
            console.log('No se encontraron tareas duplicadas.');
        }
    }
    
    // Llamar a la función de verificación al cargar las tareas
    function loadPendingTasks() {
        try {
            const savedTasks = localStorage.getItem('pendingTasks');
            if (savedTasks) {
                pendingTasks = JSON.parse(savedTasks);
                // Verificar y corregir IDs
                verifyTaskIds();
                // Verificar y eliminar duplicados
                checkForDuplicateTasks();
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
        
        // Si hay una tarea en ejecución, verificar si ya existe en la lista de pendientes
        if (currentTask && currentTask !== 'Sin descripción') {
            const currentTaskId = currentTaskText.getAttribute('data-task-id');
            
            // Solo añadir la tarea a pendientes si tiene un ID y no existe ya
            if (currentTaskId) {
                // Verificar si la tarea ya existe en la lista de pendientes
                const taskExists = pendingTasks.some(task => task.id === parseInt(currentTaskId));
                
                if (!taskExists) {
                    // Si no existe, añadirla a la lista de pendientes
                    const newTask = {
                        id: parseInt(currentTaskId),
                        text: currentTask,
                        createdAt: new Date().toISOString()
                    };
                    
                    pendingTasks.push(newTask);
                    updatePendingTasksUI();
                    savePendingTasks();
                }
            } else {
                // Si no tiene ID, crear una nueva tarea
                const newTask = {
                    id: Date.now(),
                    text: currentTask,
                    createdAt: new Date().toISOString()
                };
                
                pendingTasks.push(newTask);
                updatePendingTasksUI();
                savePendingTasks();
            }
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
            console.log('Completando pomodoro para tarea:', currentTask);
            
            // Save completed session
            if (isLocalStorageAvailable && currentTask) {
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
            // Obtener el ID de la tarea actual
            const currentTaskId = currentTaskText.getAttribute('data-task-id');
            console.log('Completando sesión para tarea:', currentTask, 'con ID:', currentTaskId);
            
            const now = new Date();
            const session = {
                task: currentTask,
                taskId: currentTaskId ? parseInt(currentTaskId) : null,
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
            
            // Eliminar la tarea de la lista de pendientes usando su ID
            if (currentTaskId) {
                removeTaskById(currentTaskId);
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
            
            // Guardar el ID de la tarea como atributo de datos
            if (session.taskId) {
                sessionItem.setAttribute('data-task-id', session.taskId);
            }
            
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

    // Función para guardar un pomodoro completado
    function saveCompletedPomodoro(taskName) {
        const today = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD
        
        // Obtener los datos existentes
        const pomodoroData = JSON.parse(localStorage.getItem('pomodoroData') || '{}');
        
        // Si no existe entrada para hoy, crearla
        if (!pomodoroData[today]) {
            pomodoroData[today] = {
                count: 0,
                tasks: {}
            };
        }
        
        // Incrementar contador general
        pomodoroData[today].count += 1;
        
        // Si hay una tarea, registrarla
        if (taskName) {
            pomodoroData[today].tasks[taskName] = (pomodoroData[today].tasks[taskName] || 0) + 1;
        }
        
        // Guardar los datos actualizados
        localStorage.setItem('pomodoroData', JSON.stringify(pomodoroData));
        
        // Actualizar la visualización de estadísticas
        updatePomodoroStats();
    }

    // Función para obtener y mostrar estadísticas
    function updatePomodoroStats() {
        const pomodoroData = JSON.parse(localStorage.getItem('pomodoroData') || '{}');
        const statsContainer = document.getElementById('completed-sessions-container');
        const statsList = document.getElementById('completed-sessions-list');
        
        // Limpiar lista actual
        statsList.innerHTML = '';
        
        // Convertir a array para ordenar
        const daysArray = Object.keys(pomodoroData).sort().reverse();
        
        if (daysArray.length === 0) {
            statsList.innerHTML = '<p>No hay pomodoros registrados aún.</p>';
            return;
        }
        
        // Crear elementos para cada día
        daysArray.forEach(date => {
            const dayData = pomodoroData[date];
            const dayElement = document.createElement('div');
            dayElement.className = 'session-item';
            
            // Formatear fecha para mostrar
            const formattedDate = new Date(date).toLocaleDateString();
            
            // Crear contenido HTML
            let tasksHtml = '';
            if (dayData.tasks) {
                const taskEntries = Object.entries(dayData.tasks);
                if (taskEntries.length > 0) {
                    tasksHtml = '<ul style="margin-top: 5px; font-size: 0.85rem;">';
                    taskEntries.forEach(([task, count]) => {
                        tasksHtml += `<li>${task}: ${count} pomodoro${count !== 1 ? 's' : ''}</li>`;
                    });
                    tasksHtml += '</ul>';
                }
            }
            
            dayElement.innerHTML = `
                <strong>${formattedDate}</strong>: ${dayData.count} pomodoro${dayData.count !== 1 ? 's' : ''} completados
                ${tasksHtml}
            `;
            
            statsList.appendChild(dayElement);
        });
        
        // Mostrar el contenedor
        statsContainer.style.display = 'block';
    }

    // Cargar estadísticas al iniciar la aplicación
    updatePomodoroStats();

    // Función para eliminar definitivamente una tarea por su ID
    function removeTaskById(taskId) {
        console.log('ELIMINANDO DEFINITIVAMENTE tarea con ID:', taskId);
        
        // Convertir a número si es una cadena
        const taskIdNum = typeof taskId === 'string' ? parseInt(taskId) : taskId;
        
        // Verificar que sea un número válido
        if (isNaN(taskIdNum)) {
            console.error('ID de tarea inválido:', taskId);
            return false;
        }
        
        // Mostrar tareas antes de eliminar
        console.log('Tareas antes de eliminar:', JSON.stringify(pendingTasks));
        
        // Buscar la tarea por ID
        let found = false;
        for (let i = 0; i < pendingTasks.length; i++) {
            if (pendingTasks[i].id === taskIdNum) {
                console.log('Encontrada tarea para eliminar en índice:', i, 'con ID:', pendingTasks[i].id);
                // Eliminar la tarea
                pendingTasks.splice(i, 1);
                found = true;
                break;
            }
        }
        
        // Eliminar directamente del DOM
        const taskElements = document.querySelectorAll(`.task-item[data-task-id="${taskIdNum}"]`);
        console.log(`Encontrados ${taskElements.length} elementos en el DOM con ID ${taskIdNum}`);
        
        taskElements.forEach(element => {
            console.log('Eliminando elemento del DOM:', element);
            element.remove();
        });
        
        if (!found && taskElements.length === 0) {
            console.warn('No se encontró la tarea con ID:', taskIdNum);
        }
        
        // Mostrar tareas después de eliminar
        console.log('Tareas después de eliminar:', JSON.stringify(pendingTasks));
        
        // Guardar cambios en localStorage
        localStorage.setItem('pendingTasks', JSON.stringify(pendingTasks));
        
        // Forzar actualización completa de la UI
        updatePendingTasksUI();
        updateModalPendingTasks();
        
        // Verificar que el DOM se actualizó correctamente
        setTimeout(() => {
            const remainingElements = document.querySelectorAll(`.task-item[data-task-id="${taskIdNum}"]`);
            if (remainingElements.length > 0) {
                console.error(`¡ALERTA! Todavía hay ${remainingElements.length} elementos en el DOM con ID ${taskIdNum}`);
                // Eliminar forzosamente
                remainingElements.forEach(element => element.remove());
            } else {
                console.log('Verificación exitosa: No quedan elementos en el DOM con ese ID');
            }
        }, 100);
        
        return found || taskElements.length > 0;
    }

    // Función para verificar y eliminar tareas completadas que aún aparecen en la lista de pendientes
    function removeCompletedTasksFromPending() {
        console.log('Verificando tareas completadas que siguen en pendientes...');
        
        // Crear un conjunto con los IDs de las tareas completadas
        const completedTaskIds = new Set();
        for (const session of completedSessions) {
            if (session.taskId) {
                completedTaskIds.add(session.taskId);
            }
        }
        
        console.log('IDs de tareas completadas:', Array.from(completedTaskIds));
        
        // Verificar si alguna tarea pendiente está en la lista de completadas
        let removedCount = 0;
        for (let i = pendingTasks.length - 1; i >= 0; i--) {
            const task = pendingTasks[i];
            if (completedTaskIds.has(task.id)) {
                console.log('Eliminando tarea completada que sigue en pendientes:', task);
                pendingTasks.splice(i, 1);
                removedCount++;
            }
        }
        
        if (removedCount > 0) {
            console.log(`Se eliminaron ${removedCount} tareas completadas de la lista de pendientes.`);
            localStorage.setItem('pendingTasks', JSON.stringify(pendingTasks));
            updatePendingTasksUI();
        } else {
            console.log('No se encontraron tareas completadas en la lista de pendientes.');
        }
    }

    // Función para forzar la limpieza del DOM y asegurarnos de que no queden tareas duplicadas
    function forceDOMCleanup() {
        console.log('Forzando limpieza del DOM...');
        
        // Obtener todos los IDs válidos de tareas pendientes
        const validTaskIds = new Set(pendingTasks.map(task => task.id));
        console.log('IDs válidos de tareas pendientes:', Array.from(validTaskIds));
        
        // Buscar elementos en el DOM que no correspondan a tareas válidas
        const allTaskElements = document.querySelectorAll('.task-item');
        console.log(`Encontrados ${allTaskElements.length} elementos de tareas en el DOM`);
        
        let removedCount = 0;
        allTaskElements.forEach(element => {
            const elementId = parseInt(element.getAttribute('data-task-id'));
            if (!validTaskIds.has(elementId)) {
                console.log('Eliminando elemento inválido del DOM con ID:', elementId);
                element.remove();
                removedCount++;
            }
        });
        
        if (removedCount > 0) {
            console.log(`Se eliminaron ${removedCount} elementos inválidos del DOM`);
        } else {
            console.log('No se encontraron elementos inválidos en el DOM');
        }
        
        // Verificar que el número de elementos en el DOM coincida con el número de tareas pendientes
        const remainingElements = document.querySelectorAll('.task-item');
        if (remainingElements.length !== pendingTasks.length) {
            console.error(`¡ALERTA! El número de elementos en el DOM (${remainingElements.length}) no coincide con el número de tareas pendientes (${pendingTasks.length})`);
            
            // Forzar actualización completa
            updatePendingTasksUI();
        } else {
            console.log('Verificación exitosa: El número de elementos en el DOM coincide con el número de tareas pendientes');
        }
    }

    // Añadir un botón de emergencia para limpiar todo
    function addEmergencyResetButton() {
        // Crear el botón
        const resetButton = document.createElement('button');
        resetButton.textContent = 'Reiniciar App (Emergencia)';
        resetButton.style.position = 'fixed';
        resetButton.style.bottom = '10px';
        resetButton.style.right = '10px';
        resetButton.style.zIndex = '9999';
        resetButton.style.backgroundColor = '#ff5252';
        resetButton.style.color = 'white';
        resetButton.style.border = 'none';
        resetButton.style.borderRadius = '4px';
        resetButton.style.padding = '8px 12px';
        resetButton.style.cursor = 'pointer';
        resetButton.style.fontSize = '12px';
        
        // Añadir evento de clic
        resetButton.addEventListener('click', () => {
            if (confirm('¿Estás seguro de que quieres reiniciar completamente la aplicación? Esto eliminará todas las tareas pendientes y sesiones completadas.')) {
                resetApplication();
                location.reload(); // Recargar la página
            }
        });
        
        // Añadir al body
        document.body.appendChild(resetButton);
    }
    
    // Llamar a la función cuando se carga la aplicación
    setTimeout(addEmergencyResetButton, 1000);
}); 