// Application State
let processes = [];
let currentAlgorithm = 'fcfs';
let timeQuantum = 2;

// Color mapping for processes
const colors = [
    '#3b82f6', '#10b981', '#eab308', '#a855f7', '#ec4899',
    '#6366f1', '#ef4444', '#14b8a6', '#f97316', '#06b6d4'
];

// DOM Elements
const processForm = document.getElementById('processForm');
const processNameInput = document.getElementById('processName');
const arrivalTimeInput = document.getElementById('arrivalTime');
const burstTimeInput = document.getElementById('burstTime');
const priorityInput = document.getElementById('priority');
const priorityGroup = document.getElementById('priorityGroup');
const processQueue = document.getElementById('processQueue');
const processList = document.getElementById('processList');
const queueCount = document.getElementById('queueCount');
const algoButtons = document.querySelectorAll('.algo-btn');
const quantumGroup = document.getElementById('quantumGroup');
const timeQuantumInput = document.getElementById('timeQuantum');
const calculateBtn = document.getElementById('calculateBtn');
const clearBtn = document.getElementById('clearBtn');
const resultsSection = document.getElementById('resultsSection');
const ganttChart = document.getElementById('ganttChart');
const ganttTimeline = document.getElementById('ganttTimeline');
const ganttLegend = document.getElementById('ganttLegend');
const resultsBody = document.getElementById('resultsBody');
const avgWaitingTime = document.getElementById('avgWaitingTime');
const avgTurnaroundTime = document.getElementById('avgTurnaroundTime');

// Event Listeners
processForm.addEventListener('submit', handleAddProcess);
clearBtn.addEventListener('click', handleClearAll);
calculateBtn.addEventListener('click', handleCalculate);
timeQuantumInput.addEventListener('change', (e) => {
    timeQuantum = parseInt(e.target.value) || 2;
});

algoButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        algoButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentAlgorithm = btn.dataset.algorithm;
        
        // Show/hide priority and time quantum inputs
        if (currentAlgorithm === 'priority') {
            priorityGroup.style.display = 'block';
        } else {
            priorityGroup.style.display = 'none';
        }
        
        if (currentAlgorithm === 'roundrobin') {
            quantumGroup.style.display = 'block';
        } else {
            quantumGroup.style.display = 'none';
        }
    });
});

// Functions
function handleAddProcess(e) {
    e.preventDefault();
    
    const name = processNameInput.value.trim();
    const arrival = parseInt(arrivalTimeInput.value) || 0;
    const burst = parseInt(burstTimeInput.value);
    const priority = parseInt(priorityInput.value) || 0;
    
    if (!name || !burst) return;
    
    const process = {
        id: Date.now().toString(),
        name,
        arrivalTime: arrival,
        burstTime: burst,
        priority: currentAlgorithm === 'priority' ? priority : undefined
    };
    
    processes.push(process);
    updateProcessList();
    
    // Auto-increment process name
    const match = name.match(/^P(\d+)$/);
    if (match) {
        processNameInput.value = `P${parseInt(match[1]) + 1}`;
    } else {
        processNameInput.value = '';
    }
    burstTimeInput.value = '';
    
    // Enable buttons
    calculateBtn.disabled = false;
    clearBtn.disabled = false;
}

function handleRemoveProcess(id) {
    processes = processes.filter(p => p.id !== id);
    updateProcessList();
    
    if (processes.length === 0) {
        calculateBtn.disabled = true;
        clearBtn.disabled = true;
        processQueue.style.display = 'none';
        resultsSection.style.display = 'none';
    }
}

function handleClearAll() {
    processes = [];
    updateProcessList();
    calculateBtn.disabled = true;
    clearBtn.disabled = true;
    processQueue.style.display = 'none';
    resultsSection.style.display = 'none';
}

function updateProcessList() {
    queueCount.textContent = processes.length;
    
    if (processes.length === 0) {
        processQueue.style.display = 'none';
        return;
    }
    
    processQueue.style.display = 'block';
    processList.innerHTML = '';
    
    processes.forEach(process => {
        const div = document.createElement('div');
        div.className = 'process-item';
        div.innerHTML = `
            <div class="process-info">
                <span class="process-name">${process.name}</span>
                <span class="process-detail">AT: ${process.arrivalTime}</span>
                <span class="process-detail">BT: ${process.burstTime}</span>
                ${process.priority !== undefined ? `<span class="process-detail">Priority: ${process.priority}</span>` : ''}
            </div>
            <button class="remove-btn" onclick="handleRemoveProcess('${process.id}')">🗑</button>
        `;
        processList.appendChild(div);
    });
}

function handleCalculate() {
    if (processes.length === 0) return;
    
    const { results, gantt } = calculateScheduling(processes, currentAlgorithm, timeQuantum);
    displayResults(results, gantt);
}

function calculateScheduling(processes, algorithm, quantum) {
    switch (algorithm) {
        case 'fcfs':
            return calculateFCFS(processes);
        case 'sjf':
            return calculateSJF(processes);
        case 'roundrobin':
            return calculateRoundRobin(processes, quantum);
        case 'priority':
            return calculatePriority(processes);
        default:
            return { results: [], gantt: [] };
    }
}

function calculateFCFS(processes) {
    const sorted = [...processes].sort((a, b) => a.arrivalTime - b.arrivalTime);
    const gantt = [];
    const results = [];
    
    let currentTime = 0;
    
    sorted.forEach(process => {
        const startTime = Math.max(currentTime, process.arrivalTime);
        const endTime = startTime + process.burstTime;
        
        gantt.push({ process, startTime, endTime });
        
        results.push({
            process,
            startTime,
            endTime,
            waitingTime: startTime - process.arrivalTime,
            turnaround: endTime - process.arrivalTime
        });
        
        currentTime = endTime;
    });
    
    return { results, gantt };
}

function calculateSJF(processes) {
    const remaining = [...processes];
    const gantt = [];
    const results = [];
    
    let currentTime = 0;
    const completed = new Set();
    
    while (completed.size < processes.length) {
        const available = remaining.filter(
            p => !completed.has(p.id) && p.arrivalTime <= currentTime
        );
        
        if (available.length === 0) {
            const nextArrival = remaining
                .filter(p => !completed.has(p.id))
                .reduce((min, p) => Math.min(min, p.arrivalTime), Infinity);
            currentTime = nextArrival;
            continue;
        }
        
        const shortest = available.reduce((min, p) =>
            p.burstTime < min.burstTime ? p : min
        );
        
        const startTime = currentTime;
        const endTime = startTime + shortest.burstTime;
        
        gantt.push({ process: shortest, startTime, endTime });
        
        results.push({
            process: shortest,
            startTime,
            endTime,
            waitingTime: startTime - shortest.arrivalTime,
            turnaround: endTime - shortest.arrivalTime
        });
        
        currentTime = endTime;
        completed.add(shortest.id);
    }
    
    return { results, gantt };
}

function calculateRoundRobin(processes, quantum) {
    const queue = processes
        .map(p => ({ process: p, remainingTime: p.burstTime }))
        .sort((a, b) => a.process.arrivalTime - b.process.arrivalTime);
    
    const gantt = [];
    const results = [];
    
    let currentTime = 0;
    let index = 0;
    const readyQueue = [];
    const firstStartMap = new Map();
    
    while (queue.length > 0 || readyQueue.length > 0) {
        // Add newly arrived processes
        while (index < queue.length && queue[index].process.arrivalTime <= currentTime) {
            readyQueue.push(queue[index]);
            index++;
        }
        
        if (readyQueue.length === 0) {
            if (index < queue.length) {
                currentTime = queue[index].process.arrivalTime;
            }
            continue;
        }
        
        const current = readyQueue.shift();
        const executeTime = Math.min(current.remainingTime, quantum);
        const startTime = currentTime;
        const endTime = startTime + executeTime;
        
        if (!firstStartMap.has(current.process.id)) {
            firstStartMap.set(current.process.id, startTime);
        }
        
        gantt.push({ process: current.process, startTime, endTime });
        
        current.remainingTime -= executeTime;
        currentTime = endTime;
        
        // Add newly arrived processes
        while (index < queue.length && queue[index].process.arrivalTime <= currentTime) {
            readyQueue.push(queue[index]);
            index++;
        }
        
        if (current.remainingTime > 0) {
            readyQueue.push(current);
        } else {
            results.push({
                process: current.process,
                startTime: firstStartMap.get(current.process.id),
                endTime,
                waitingTime: firstStartMap.get(current.process.id) - current.process.arrivalTime,
                turnaround: endTime - current.process.arrivalTime
            });
        }
    }
    
    return { results, gantt };
}

function calculatePriority(processes) {
    const remaining = [...processes];
    const gantt = [];
    const results = [];
    
    let currentTime = 0;
    const completed = new Set();
    
    while (completed.size < processes.length) {
        const available = remaining.filter(
            p => !completed.has(p.id) && p.arrivalTime <= currentTime
        );
        
        if (available.length === 0) {
            const nextArrival = remaining
                .filter(p => !completed.has(p.id))
                .reduce((min, p) => Math.min(min, p.arrivalTime), Infinity);
            currentTime = nextArrival;
            continue;
        }
        
        // Lower priority number = higher priority
        const highest = available.reduce((max, p) =>
            (p.priority || 0) < (max.priority || 0) ? p : max
        );
        
        const startTime = currentTime;
        const endTime = startTime + highest.burstTime;
        
        gantt.push({ process: highest, startTime, endTime });
        
        results.push({
            process: highest,
            startTime,
            endTime,
            waitingTime: startTime - highest.arrivalTime,
            turnaround: endTime - highest.arrivalTime
        });
        
        currentTime = endTime;
        completed.add(highest.id);
    }
    
    return { results, gantt };
}

function displayResults(results, gantt) {
    resultsSection.style.display = 'block';
    
    // Display Gantt Chart
    displayGanttChart(gantt);
    
    // Display Results Table
    displayResultsTable(results);
    
    // Calculate and display metrics
    const avgWait = results.reduce((sum, r) => sum + r.waitingTime, 0) / results.length;
    const avgTurnaround = results.reduce((sum, r) => sum + r.turnaround, 0) / results.length;
    
    avgWaitingTime.textContent = `${avgWait.toFixed(2)} units`;
    avgTurnaroundTime.textContent = `${avgTurnaround.toFixed(2)} units`;
    
    // Scroll to results
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function displayGanttChart(gantt) {
    ganttChart.innerHTML = '';
    ganttTimeline.innerHTML = '';
    ganttLegend.innerHTML = '';
    
    const maxTime = Math.max(...gantt.map(item => item.endTime));
    const processColorMap = new Map();
    let colorIndex = 0;
    
    // Create Gantt blocks
    gantt.forEach((item, index) => {
        if (!processColorMap.has(item.process.id)) {
            processColorMap.set(item.process.id, colors[colorIndex % colors.length]);
            colorIndex++;
        }
        
        const color = processColorMap.get(item.process.id);
        const duration = item.endTime - item.startTime;
        const widthPercent = (duration / maxTime) * 100;
        
        const block = document.createElement('div');
        block.className = 'gantt-block';
        block.style.width = `${widthPercent}%`;
        block.style.backgroundColor = color;
        block.textContent = item.process.name;
        ganttChart.appendChild(block);
        
        // Timeline markers
        const marker = document.createElement('div');
        marker.className = 'gantt-time-marker';
        marker.style.width = `${widthPercent}%`;
        
        if (index === 0) {
            const startTime = document.createElement('span');
            startTime.className = 'gantt-time start';
            startTime.textContent = item.startTime;
            marker.appendChild(startTime);
        }
        
        const endTime = document.createElement('span');
        endTime.className = 'gantt-time end';
        endTime.textContent = item.endTime;
        marker.appendChild(endTime);
        
        ganttTimeline.appendChild(marker);
    });
    
    // Create legend
    const uniqueProcesses = Array.from(new Set(gantt.map(item => item.process.id)));
    uniqueProcesses.forEach(processId => {
        const process = gantt.find(item => item.process.id === processId).process;
        const color = processColorMap.get(processId);
        
        const legendItem = document.createElement('div');
        legendItem.className = 'legend-item';
        legendItem.innerHTML = `
            <div class="legend-color" style="background: ${color}"></div>
            <span class="legend-label">${process.name}</span>
        `;
        ganttLegend.appendChild(legendItem);
    });
}

function displayResultsTable(results) {
    resultsBody.innerHTML = '';
    
    results.forEach(result => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="process-col">${result.process.name}</td>
            <td>${result.process.arrivalTime}</td>
            <td>${result.process.burstTime}</td>
            <td>${result.startTime}</td>
            <td>${result.endTime}</td>
            <td class="waiting-col">${result.waitingTime}</td>
            <td class="turnaround-col">${result.turnaround}</td>
        `;
        resultsBody.appendChild(row);
    });
}

// Initialize
processNameInput.value = 'P1';
