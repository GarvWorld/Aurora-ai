// --- PROJECT SINGULARITY: SENSORIUM & NEURAL FABRIC ---

const sensoriumData = [
    { type: 'FINANCE', label: 'BTC/USD', value: '$98,420.50', trend: 'UP' },
    { type: 'NETWORK', label: 'SAT-LINK-Alpha', value: 'Connected (12ms)', trend: 'STABLE' },
    { type: 'SECURITY', label: 'Global Threat', value: 'DEFCON 4', trend: 'LOW' },
    { type: 'SOCIAL', label: 'Trend Velocity', value: 'High (AI, Quantum)', trend: 'UP' },
    { type: 'IOT', label: 'Connected Devices', value: '14.2 Billion', trend: 'UP' },
    { type: 'ENERGY', label: 'Grid Load', value: '42%', trend: 'STABLE' },
    { type: 'SCIENCE', label: 'arXiv Ingest', value: '+450 Papers', trend: 'UP' }
];

function initSensorium() {
    const track = document.getElementById('sensoriumTrack');
    if (!track) return;

    // Create initial feed
    renderFeed(track);

    // Dynamic Updates (Simulation)
    setInterval(() => {
        updateRandomData();
        renderFeed(track);
    }, 5000);
}

function updateRandomData() {
    const target = sensoriumData[Math.floor(Math.random() * sensoriumData.length)];
    if (target.label === 'BTC/USD') {
        const val = parseFloat(target.value.replace(/[^0-9.]/g, ''));
        const change = (Math.random() - 0.5) * 500;
        target.value = '$' + (val + change).toFixed(2);
    } else if (target.type === 'NETWORK') {
        target.value = `Connected (${Math.floor(Math.random() * 20 + 5)}ms)`;
    }
}

function renderFeed(track) {
    track.innerHTML = '';
    // Duplicate data for seamless loop
    const displayData = [...sensoriumData, ...sensoriumData, ...sensoriumData];

    displayData.forEach(d => {
        const div = document.createElement('div');
        div.className = 'data-packet';
        if (d.label === 'Global Threat' || d.trend === 'DOWN') div.classList.add('alert');

        div.innerHTML = `
            <span class="data-label">[${d.type}] ${d.label}:</span>
            <span class="data-value">${d.value}</span>
        `;
        track.appendChild(div);
    });
}

// --- NEURAL FABRIC (Canvas Visualization) ---
let canvas, ctx;
let neurons = [];

function initNeuralFabric() {
    canvas = document.getElementById('neuralCanvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Create Neurons
    for (let i = 0; i < 50; i++) {
        neurons.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            activity: 0
        });
    }

    animateFabric();
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

function animateFabric() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Connections
    ctx.strokeStyle = document.body.classList.contains('god-mode') ? 'rgba(255, 215, 0, 0.1)' : 'rgba(0, 255, 136, 0.1)';
    ctx.lineWidth = 1;

    for (let i = 0; i < neurons.length; i++) {
        let n = neurons[i];
        n.x += n.vx;
        n.y += n.vy;

        // Bounce
        if (n.x < 0 || n.x > canvas.width) n.vx *= -1;
        if (n.y < 0 || n.y > canvas.height) n.vy *= -1;

        // Connections
        for (let j = i + 1; j < neurons.length; j++) {
            let n2 = neurons[j];
            let dist = Math.hypot(n.x - n2.x, n.y - n2.y);
            if (dist < 150) {
                ctx.beginPath();
                ctx.moveTo(n.x, n.y);
                ctx.lineTo(n2.x, n2.y);
                ctx.stroke();
            }
        }

        // Draw Neuron
        ctx.fillStyle = n.activity > 0 ? '#fff' : (document.body.classList.contains('god-mode') ? '#ffd700' : '#4f8aff');
        ctx.beginPath();
        ctx.arc(n.x, n.y, 2, 0, Math.PI * 2);
        ctx.fill();

        if (n.activity > 0) n.activity -= 0.05;
    }

    requestAnimationFrame(animateFabric);
}

// Trigger "Thought" (Flash Neurons)
function triggerNeuralActivity() {
    neurons.forEach(n => {
        if (Math.random() > 0.7) n.activity = 1;
    });
}


document.addEventListener('DOMContentLoaded', () => {
    initSensorium();
    initNeuralFabric();
});
