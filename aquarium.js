// Get canvas references
const backgroundCanvas = document.getElementById('background-layer');
const gameCanvas = document.getElementById('game-layer');
const effectsCanvas = document.getElementById('effects-layer');

// Replace canvas context initialization with
function getContext(canvas) {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
        console.error('Could not get 2D context for canvas');
        return null;
    }
    return ctx;
}

const bgCtx = getContext(backgroundCanvas);
const ctx = getContext(gameCanvas);
const fxCtx = getContext(effectsCanvas);

// Add early return if contexts are null
if (!bgCtx || !ctx || !fxCtx) {
    throw new Error('Failed to get canvas contexts');
}

// High DPI setup
function setupCanvasDPI(canvas) {
    const dpr = window.devicePixelRatio || 1;
    // Set fixed game dimensions (1280x720)
    const fixedWidth = 1280;
    const fixedHeight = 720;
    
    canvas.width = fixedWidth * dpr;
    canvas.height = fixedHeight * dpr;
    canvas.style.width = `${fixedWidth}px`;
    canvas.style.height = `${fixedHeight}px`;
    return dpr;
}

const dpr = setupCanvasDPI(backgroundCanvas);
setupCanvasDPI(gameCanvas);
setupCanvasDPI(effectsCanvas);
ctx.scale(dpr, dpr);
bgCtx.scale(dpr, dpr);
fxCtx.scale(dpr, dpr);

// Pre-render algae and rocks
const algaeCache = document.createElement('canvas');
const rockCache = document.createElement('canvas');
algaeCache.width = 20 * dpr;
algaeCache.height = 30 * dpr;
rockCache.width = 20 * dpr;
rockCache.height = 20 * dpr;

// Draw algae sprite
const algaeCtx = algaeCache.getContext('2d');
algaeCtx.scale(dpr, dpr);
for (let j = 0; j < 3; j++) {
    // Create gradient for more natural look
    const gradient = algaeCtx.createLinearGradient(j * 4, 30 - j * 8, j * 4, 30 - j * 8 + 8 + j * 4);
    gradient.addColorStop(0, '#2ecc71');
    gradient.addColorStop(1, '#27ae60');
    algaeCtx.fillStyle = gradient;
    algaeCtx.beginPath();
    algaeCtx.roundRect(j * 4, 30 - j * 8, 4, 8 + j * 4, 2);
    algaeCtx.fill();
    
    // Add highlights
    algaeCtx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    algaeCtx.fillRect(j * 4 + 1, 30 - j * 8 + 1, 2, 1);
}

// Draw rock sprite
const rockCtx = rockCache.getContext('2d');
rockCtx.scale(dpr, dpr);
// Create rock shape with more detail
rockCtx.beginPath();
rockCtx.moveTo(0, 12);
rockCtx.lineTo(4, 4);
rockCtx.lineTo(12, 4);
rockCtx.lineTo(16, 12);
rockCtx.lineTo(12, 16);
rockCtx.lineTo(4, 16);
rockCtx.closePath();

// Add gradient for depth
const rockGradient = rockCtx.createLinearGradient(0, 4, 16, 16);
rockGradient.addColorStop(0, '#7f8c8d');
rockGradient.addColorStop(1, '#95a5a6');
rockCtx.fillStyle = rockGradient;
rockCtx.fill();

// Add texture
rockCtx.fillStyle = 'rgba(255, 255, 255, 0.1)';
for (let i = 0; i < 10; i++) {
    const x = Math.random() * 16;
    const y = Math.random() * 12 + 4;
    rockCtx.fillRect(x, y, 1, 1);
}

// Wave effect
let waveOffset = 0;

// Add separate audio nodes at the top
let audioCtx = null;
let musicGain = null;
let sfxGain = null;
let musicSequenceTimeout = null;
let parallaxLayers = [];

const globalAudioCtx = createAudioContext();

function createAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        musicGain = audioCtx.createGain();
        sfxGain = audioCtx.createGain();
        
        // Connect both gain nodes to destination
        musicGain.connect(audioCtx.destination);
        sfxGain.connect(audioCtx.destination);
        
        // Set initial volumes
        musicGain.gain.value = 0.5;
        sfxGain.gain.value = 0.7;
    }
    return audioCtx;
}

// Updated playBackgroundMusic with controls
let isMusicPlaying = false;
let musicNodes = [];

function playBackgroundMusic() {
    const audioCtx = createAudioContext();
    try {
        if (musicNodes.length > 0) return; // Prevent duplicate playback
        
        const sequence = [
            { note: 'C4', duration: 0.75, type: 'sine' },
            { note: 'E4', duration: 0.25, type: 'square' },
            { note: 'G4', duration: 0.5, type: 'triangle' },
            { note: 'A4', duration: 0.5, type: 'sine' },
            { note: 'G4', duration: 0.25, type: 'sawtooth' },
            { note: 'E4', duration: 0.75, type: 'sine' },
            { note: 'C4', duration: 0.5, type: 'square' }
        ];
        
        const delay = audioCtx.createDelay(2.0);
        const feedback = audioCtx.createGain();
        feedback.gain.value = 0.3;
        
        delay.connect(feedback);
        feedback.connect(delay);
        
        let time = audioCtx.currentTime;
        sequence.forEach((step, i) => {
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            
            oscillator.type = step.type;
            oscillator.frequency.setValueAtTime(getFrequency(step.note), time);
            
            gainNode.gain.setValueAtTime(0.1, time);
            gainNode.gain.exponentialRampToValueAtTime(0.01, time + step.duration);
            
            // Connect through music gain
            oscillator.connect(gainNode)
                     .connect(musicGain);
            
            // Store references
            musicNodes.push({ oscillator, gainNode });
            
            oscillator.start(time);
            oscillator.stop(time + step.duration + 0.1);
            
            time += step.duration;
        });
        
        // Update play/pause button
        document.getElementById('music-toggle').textContent = '⏸';
        isMusicPlaying = true;

    } catch (error) {
        console.error('Audio playback error:', error);
    }
}

function stopBackgroundMusic() {
    musicNodes.forEach(node => {
        node.oscillator.stop();
        node.gainNode.disconnect();
    });
    musicNodes = [];
    document.getElementById('music-toggle').textContent = '▶';
    isMusicPlaying = false;
    clearTimeout(musicSequenceTimeout);
}

// Music control handlers
document.getElementById('music-toggle').addEventListener('click', () => {
    const audioCtx = createAudioContext();
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    
    if (isMusicPlaying) {
        stopBackgroundMusic();
    } else {
        playBackgroundMusic();
    }
});

document.getElementById('music-volume').addEventListener('input', (e) => {
    musicGain.gain.value = parseFloat(e.target.value);
    document.getElementById('music-percentage').textContent = 
        `${Math.round(e.target.value * 100)}%`;
});

// SFX control handlers
document.getElementById('sfx-volume').addEventListener('input', (e) => {
    sfxGain.gain.value = parseFloat(e.target.value);
    document.getElementById('sfx-percentage').textContent = 
        `${Math.round(e.target.value * 100)}%`;
});

document.getElementById('sfx-mute').addEventListener('click', () => {
    if (sfxGain.gain.value > 0) {
        sfxGain.gain.value = 0;
        document.getElementById('sfx-mute').textContent = "🔇";
    } else {
        sfxGain.gain.value = document.getElementById('sfx-volume').value;
        document.getElementById('sfx-mute').textContent = "🔊";
    }
});

// Update all sound effects to use sfxGain
function playClickSound(x, y) {
    // Use global audio context
    const oscillator = globalAudioCtx.createOscillator();
    const gainNode = globalAudioCtx.createGain();
    const panner = globalAudioCtx.createStereoPanner();
    const filter = globalAudioCtx.createBiquadFilter();
    
    // Calculate sound parameters based on position
    const baseFreq = 110 + (y / gameCanvas.height) * 880;
    const volume = 0.3 + (x / gameCanvas.width) * 0.7;
    const pan = (x / gameCanvas.width) * 2 - 1; // -1 (left) to 1 (right)
    
    // Configure oscillator
    const waveTypes = ['sine', 'square', 'sawtooth', 'triangle'];
    oscillator.type = waveTypes[Math.floor(Math.random() * waveTypes.length)];
    oscillator.frequency.setValueAtTime(baseFreq, globalAudioCtx.currentTime);
    
    // Configure filter
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(5000, globalAudioCtx.currentTime);
    filter.Q.setValueAtTime(10, globalAudioCtx.currentTime);
    
    // Configure envelope
    const attackTime = 0.01;
    const decayTime = 0.2;
    const sustainLevel = 0.7;
    const releaseTime = 0.3;
    
    gainNode.gain.setValueAtTime(0, globalAudioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, globalAudioCtx.currentTime + attackTime);
    gainNode.gain.exponentialRampToValueAtTime(volume * sustainLevel, globalAudioCtx.currentTime + attackTime + decayTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, globalAudioCtx.currentTime + attackTime + decayTime + releaseTime);
    
    // Configure panning
    panner.pan.setValueAtTime(pan, globalAudioCtx.currentTime);
    
    // Connect through sfxGain instead of destination
    oscillator.connect(filter)
             .connect(gainNode)
             .connect(panner)
             .connect(sfxGain);
    
    oscillator.start();
    oscillator.stop(globalAudioCtx.currentTime + attackTime + decayTime + releaseTime + 0.1);
}

// Add event listeners
gameCanvas.addEventListener('click', (e) => {
    const rect = gameCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    handleClick(x, y);
});

gameCanvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = gameCanvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    handleClick(x, y);
}, { passive: false });

// Add after canvas setup
const { Engine, Bodies, Composite, Runner, Body, Vector } = Matter;

// Physics engine initialization
const physicsEngine = Engine.create({
    gravity: { x: 0, y: 0 },
    bounds: {
        min: { x: 0, y: 0 },
        max: { x: 1280, y: 720 }
    }
});

// Update physics engine configuration
const physicsRunner = Runner.create({
    delta: 1000/60,
    isFixed: true,
    fps: 60,  // Add fixed FPS
    interpolation: true  // Enable interpolation for smoother movement
});
Runner.run(physicsRunner, physicsEngine);

// Fish class
class Fish {
    constructor() {
        this.size = 32;
        
        // Create physics body with random starting velocity
        this.body = Bodies.circle(
            Math.random() * gameCanvas.width,
            Math.random() * gameCanvas.height,
            this.size/2,
            {
                density: 0.005,
                restitution: 0.5,
                frictionAir: 0.12,
                collisionFilter: {
                    category: 0x0002,
                    mask: 0x0001
                },
                sleepThreshold: 60,  // Add sleep threshold
                timeScale: 1.0       // Add time scale
            }
        );
        
        this.color = ['#FF6B6B', '#4ECDC4', '#FFE66D'][Math.floor(Math.random() * 3)];
        Composite.add(physicsEngine.world, this.body);
        
        // Add AI properties
        this.targetAngle = Math.random() * Math.PI * 2;
        this.lastAIUpdate = 0;
        this.aiUpdateInterval = 1000; // Base update interval in ms
        this.neighborDistance = 80;  // Reduced from 100
        this.separationDistance = 30; // Reduced from 40
        this.maxSpeed = 0.8; // Reduced from 1.5 (this is the main speed control)
        
        // Add natural movement properties
        this.swimCycle = Math.random() * Math.PI * 2;
        this.swimSpeedVariation = 0.1; // Reduced variation
        this.body.frictionAir = 0.12; // Increased friction
        
        // Add new AI properties
        this.wallAvoidanceDistance = 100; // Distance from walls to start turning
        this.turnSmoothness = 0.1; // How gradually fish turn
        this.wallAvoidanceForce = 0.5; // Strength of wall avoidance
        this.randomMovementFactor = 0.1; // Randomness in movement
    }

    update() {
        const now = Date.now();
        const deltaTime = now - this.lastAIUpdate;
        
        if(aiEnabled && deltaTime > this.aiUpdateInterval * aiUpdateFrequency) {
            const separation = this.calculateSeparation();
            const alignment = this.calculateAlignment();
            const cohesion = this.calculateCohesion();
            
            this.targetAngle = Math.atan2(
                separation.y + alignment.y + cohesion.y,
                separation.x + alignment.x + cohesion.x
            );
            this.lastAIUpdate = now;
        }
        
        // Add random movement variation
        this.targetAngle += (Math.random() - 0.5) * this.randomMovementFactor;
        
        // Smooth angle adjustment
        Body.setAngle(this.body, this.body.angle + 
            (this.targetAngle - this.body.angle) * this.turnSmoothness);
        
        // Apply movement force
        const currentVel = Vector.magnitude(this.body.velocity);
        if (currentVel < this.maxSpeed) {
            const force = Vector.create(
                Math.cos(this.body.angle) * swimForce,
                Math.sin(this.body.angle) * swimForce
            );
            Body.applyForce(this.body, this.body.position, force);
        }
    }

    calculateSeparation() {
        const steer = { x: 0, y: 0 };
        let count = 0;
        
        fish.forEach(other => {
            if (other !== this) {
                const dx = other.x - this.x;
                const dy = other.y - this.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                
                if (dist < this.separationDistance) {
                    const repelForce = 1 - (dist / this.separationDistance);
                    steer.x -= dx * repelForce;
                    steer.y -= dy * repelForce;
                    count++;
                }
            }
        });
        
        return count > 0 ? { 
            x: steer.x / count,
            y: steer.y / count
        } : steer;
    }

    calculateAlignment() {
        const avg = { x: 0, y: 0 };
        let count = 0;
        
        fish.forEach(other => {
            if (other !== this && this.distanceTo(other) < this.neighborDistance) {
                avg.x += Math.cos(other.body.angle);
                avg.y += Math.sin(other.body.angle);
                count++;
            }
        });
        
        return count > 0 ? {
            x: avg.x / count,
            y: avg.y / count
        } : { x: Math.cos(this.body.angle), y: Math.sin(this.body.angle) };
    }

    calculateCohesion() {
        const center = { x: 0, y: 0 };
        let count = 0;
        
        fish.forEach(other => {
            if (other !== this && this.distanceTo(other) < this.neighborDistance) {
                center.x += other.x;
                center.y += other.y;
                count++;
            }
        });
        
        return count > 0 ? {
            x: (center.x / count - this.x) * 0.05,
            y: (center.y / count - this.y) * 0.05
        } : { x: 0, y: 0 };
    }

    distanceTo(other) {
        return Math.hypot(this.x - other.x, this.y - other.y);
    }

    calculateSwarmDensity() {
        let nearbyCount = 0;
        fish.forEach(other => {
            if (other !== this && this.distanceTo(other) < 60) {
                nearbyCount++;
            }
        });
        return nearbyCount / 5;
    }

    draw() {
        // Add swimming animation to tail
        const tailFlex = Math.sin(this.swimCycle) * 0.2;
        
        ctx.save();
        ctx.translate(this.body.position.x, this.body.position.y);
        ctx.rotate(this.body.angle);
        
        // Animated tail
        ctx.beginPath();
        ctx.moveTo(-this.size/2, -this.size/4);
        ctx.quadraticCurveTo(
            -this.size * (0.8 + tailFlex), 
            -this.size/8, 
            -this.size/2, 
            this.size/4
        );
        ctx.fill();
        
        // Enhanced fish body with gradient
        const gradient = ctx.createRadialGradient(
            -this.size/4, 0, this.size/8,
            -this.size/4, 0, this.size/2
        );
        gradient.addColorStop(0, this.color);
        gradient.addColorStop(1, '#000');
        ctx.fillStyle = gradient;
        
        // Fish body
        ctx.beginPath();
        ctx.moveTo(-this.size/2, -this.size/4);
        ctx.quadraticCurveTo(0, -this.size/2, this.size/2, 0);
        ctx.quadraticCurveTo(0, this.size/2, -this.size/2, this.size/4);
        ctx.closePath();
        ctx.fill();
        
        // Eye
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(this.size/4, -this.size/8, this.size/16, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
}

// Create fish AFTER physics setup
const fish = [];
for (let i = 0; i < 1; i++) {
    fish.push(new Fish());
}

// Create algae and rock objects
const backgroundObjects = [];
function createBackgroundObjects() {
    // Create algae with physics
    for (let i = 0; i < 10; i++) {
        const x = Math.random() * gameCanvas.clientWidth;
        const y = gameCanvas.clientHeight - 30 + Math.random() * 20;
        
        const algae = Bodies.rectangle(
            x, y, 8, 30, 
            {
                isStatic: true,
                render: {
                    sprite: {
                        texture: algaeCache.toDataURL(),
                        xScale: 0.5,
                        yScale: 0.5
                    }
                }
            }
        );
        Composite.add(physicsEngine.world, algae);
        backgroundObjects.push({
            type: 'algae',
            body: algae,
            color: '#2ecc71'
        });
    }

    // Create rocks with physics
    for (let i = 0; i < 5; i++) {
        const x = Math.random() * gameCanvas.clientWidth;
        const y = gameCanvas.clientHeight - 10;
        
        const rock = Bodies.trapezoid(
            x, y, 40, 20, 0.6,
            {
                isStatic: true,
                render: {
                    sprite: {
                        texture: rockCache.toDataURL(),
                        xScale: 0.5,
                        yScale: 0.5
                    }
                }
            }
        );
        Composite.add(physicsEngine.world, rock);
        backgroundObjects.push({
            type: 'rock',
            body: rock,
            color: '#7f8c8d'
        });
    }
}

function drawBackgroundObjects() {
    backgroundObjects.forEach(obj => {
        if (obj.type === 'algae') {
            ctx.save();
            ctx.translate(obj.body.position.x, obj.body.position.y);
            ctx.rotate(Math.sin(Date.now()/1000) * 0.1);
            ctx.drawImage(algaeCache, -10, -30);
            ctx.restore();
        } else if (obj.type === 'rock') {
            ctx.drawImage(rockCache, obj.body.position.x - 10, obj.body.position.y - 10);
            // Add moss effect
            ctx.fillStyle = '#27ae60';
            ctx.beginPath();
            ctx.arc(obj.body.position.x + 5, obj.body.position.y - 2, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    });
}

const offscreenCanvas = document.createElement('canvas');
const offscreenCtx = offscreenCanvas.getContext('2d');

function drawWater() {
    // Draw simple water gradient
    const waterGradient = ctx.createLinearGradient(0, 0, 0, gameCanvas.height);
    waterGradient.addColorStop(0, 'rgba(0, 100, 200, 0.8)'); // Lighter at top
    waterGradient.addColorStop(1, 'rgba(0, 50, 100, 1)');    // Darker at bottom
    ctx.fillStyle = waterGradient;
    ctx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);
}

// Ripple effect
const ripplePool = [];
const MAX_RIPPLES = 50;
let ripples = [];

function createRipple(x, y) {
    const ripple = ripplePool.length ? ripplePool.pop() : {
        x, y, 
        radius: 0,
        maxRadius: 150 + Math.random() * 50,
        opacity: 0.8,
        lineWidth: 3,
        color: `rgba(255, 255, 255, ${Math.random() * 0.5 + 0.3})`
    };
    
    ripple.x = x;
    ripple.y = y;
    ripple.radius = 0;
    ripples.push(ripple);
}

function drawRipples() {
    fxCtx.clearRect(0, 0, effectsCanvas.width, effectsCanvas.height);
    
    ripples.forEach((ripple, index) => {
        if (ripple.radius > 0 && ripple.opacity > 0) {
            fxCtx.beginPath();
            fxCtx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
            
            const gradient = fxCtx.createRadialGradient(
                ripple.x, ripple.y, ripple.radius * 0.3,
                ripple.x, ripple.y, ripple.radius
            );
            gradient.addColorStop(0, ripple.color);
            gradient.addColorStop(1, `rgba(255, 255, 255, 0)`);
            
            fxCtx.strokeStyle = gradient;
            fxCtx.lineWidth = ripple.lineWidth;
            fxCtx.stroke();
            
            fxCtx.globalAlpha = ripple.opacity * 0.3;
            fxCtx.fillStyle = gradient;
            fxCtx.fill();
            fxCtx.globalAlpha = 1.0;
        }
        
        ripple.radius += 1.5;
        ripple.opacity -= 0.008;
        ripple.lineWidth -= 0.015;
        
        if (ripple.radius > ripple.maxRadius || ripple.opacity <= 0) {
            ripples.splice(index, 1);
            ripplePool.push(ripple);
        }
    });
}

// Modify handleClick to add physics interaction
function handleClick(x, y) {
    createRipple(x, y);
    playClickSound(x, y);

    // Add force to nearby fish
    fish.forEach(fish => {
        const distance = Math.hypot(fish.x - x, fish.y - y);
        if (distance < 100) {
            const force = Vector.create(
                (fish.x - x) * 0.05,
                (fish.y - y) * 0.05
            );
            Body.applyForce(fish.body, fish.body.position, force);
        }
    });
}

// Add new control variables at the top
let aiEnabled = true;
let rippleEffectEnabled = true;
let crtEffectEnabled = true;
let swimForce = 0.01; // Reduced default swim force
let aiUpdateFrequency = 0.3;

// Fish spawn control
document.getElementById('spawn-fish').addEventListener('click', () => {
    const count = parseInt(document.getElementById('fish-count').value);
    fish.push(...Array(count).fill().map(() => new Fish()));
});

// Swim force control
document.getElementById('swim-force').addEventListener('input', (e) => {
    swimForce = parseFloat(e.target.value);
});

// AI controls
document.getElementById('toggle-ai').addEventListener('click', (e) => {
    aiEnabled = !aiEnabled;
    e.target.textContent = `AUTO SWIM ${aiEnabled ? '✅' : '❌'}`;
});

document.getElementById('ai-frequency').addEventListener('input', (e) => {
    aiUpdateFrequency = parseFloat(e.target.value);
});

// Physics controls
document.getElementById('water-density').addEventListener('input', (e) => {
    fish.forEach(f => Body.setDensity(f.body, parseFloat(e.target.value)));
});

document.getElementById('friction').addEventListener('input', (e) => {
    fish.forEach(f => {
        f.body.frictionAir = parseFloat(e.target.value);
        Body.setFrictionAir(f.body, parseFloat(e.target.value));
    });
});

// Visual controls
document.getElementById('toggle-ripples').addEventListener('click', (e) => {
    rippleEffectEnabled = !rippleEffectEnabled;
    e.target.textContent = `RIPPLES ${rippleEffectEnabled ? '✅' : '❌'}`;
});

document.getElementById('toggle-crt').addEventListener('click', (e) => {
    crtEffectEnabled = !crtEffectEnabled;
    e.target.textContent = `CRT ${crtEffectEnabled ? '✅' : '❌'}`;
});

// Temporary fix - create solid color patterns
function createSolidColorPattern(color) {
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 100, 100);
    return canvas;
}

// Update the parallaxLayers initialization
parallaxLayers = [
    { speed: 0.1, image: createSolidColorPattern('#003366') },
    { speed: 0.3, image: createSolidColorPattern('#006699') },
    { speed: 0.5, image: createSolidColorPattern('#0099cc') }
];

// Update the game initialization
function initGame() {
    createBackgroundObjects();
    initializeControls();
    loadSettings();
    gameLoop();
}

// Modify the game loop with frame budgeting
let lastFrameTime = performance.now();
const frameBudget = 16; // ~60fps
const fixedTimeStep = 1000 / 60; // 60 FPS

function gameLoop(timestamp) {
    const delta = timestamp - lastFrameTime;
    
    // Throttle physics updates
    if (delta >= frameBudget) {
        Engine.update(physicsEngine, fixedTimeStep);
        lastFrameTime = timestamp;
        
        // Update fish positions
        fish.forEach(fish => fish.update());
        
        // Draw everything
        drawScene();
    }

    // Yield to main thread
    setTimeout(() => requestAnimationFrame(gameLoop), 0);
}

// Start game
initGame(); 

// Helper function for note frequencies
function getFrequency(note) {
    const notes = {
        'C4': 261.63,
        'D4': 293.66,
        'E4': 329.63,
        'F4': 349.23,
        'G4': 392.00,
        'A4': 440.00,
        'B4': 493.88
    };
    return notes[note] || 440;
}

// Initialize background objects
createBackgroundObjects(); 

window.addEventListener('unload', () => {
    // Clean up other resources
}); 

function playBubbleSound(x, y) {
    const audioCtx = createAudioContext();
    try {
        const noiseBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.5, audioCtx.sampleRate);
        const channel = noiseBuffer.getChannelData(0);

        // Generate pink noise
        let b0, b1, b2, b3, b4, b5, b6;
        b0 = b1 = b2 = b3 = b4 = b5 = b6 = 0.0;
        for (let i = 0; i < noiseBuffer.length; i++) {
            const white = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            b3 = 0.86650 * b3 + white * 0.3104856;
            b4 = 0.55000 * b4 + white * 0.5329522;
            b5 = -0.7616 * b5 - white * 0.0168980;
            channel[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
            channel[i] *= 0.11; // reduce gain
            b6 = white * 0.115926;
        }

        const source = audioCtx.createBufferSource();
        const filter = audioCtx.createBiquadFilter();
        const gainNode = audioCtx.createGain();

        source.buffer = noiseBuffer;
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(Math.max(50, 800 + y * 2), audioCtx.currentTime);
        filter.Q.value = 10;

        gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);

        // Connect through sfxGain
        source.connect(filter)
              .connect(gainNode)
              .connect(sfxGain);

        source.start();
        source.stop(audioCtx.currentTime + 0.8);
    } catch (error) {
        console.error('Bubble sound error:', error);
    }
}

// Update volume control handler
document.getElementById('music-volume').addEventListener('input', (e) => {
    musicGain.gain.value = parseFloat(e.target.value);
    document.getElementById('music-percentage').textContent = 
        `${Math.round(e.target.value * 100)}%`;
});

// Update mute control handler
document.getElementById('sfx-mute').addEventListener('click', () => {
    if (sfxGain.gain.value > 0) {
        sfxGain.gain.value = 0;
        document.getElementById('sfx-mute').textContent = "🔇";
    } else {
        sfxGain.gain.value = document.getElementById('sfx-volume').value;
        document.getElementById('sfx-mute').textContent = "🔊";
    }
});

// Initialize audio on any user interaction
const initOnInteraction = () => {
    playBackgroundMusic();
    document.removeEventListener('click', initOnInteraction);
    document.removeEventListener('touchstart', initOnInteraction);
};

document.addEventListener('click', initOnInteraction);
document.addEventListener('touchstart', initOnInteraction);

// Add at bottom
function saveSettings() {
    const settings = {
        volume: musicGain.gain.value,
        sfxVolume: sfxGain.gain.value,
        fishCount: fish.length,
        swimForce: swimForce,
        crtEnabled: crtEffectEnabled
    };
    localStorage.setItem('aquariumSettings', JSON.stringify(settings));
}

function loadSettings() {
    const saved = JSON.parse(localStorage.getItem('aquariumSettings'));
    if (saved) {
        musicGain.gain.value = saved.volume;
        sfxGain.gain.value = saved.sfxVolume;
        document.getElementById('music-volume').value = saved.volume;
        document.getElementById('sfx-volume').value = saved.sfxVolume;
        swimForce = saved.swimForce;
        crtEffectEnabled = saved.crtEnabled;
        document.getElementById('swim-force').value = saved.swimForce;
        document.getElementById('toggle-crt').textContent = `CRT ${crtEffectEnabled ? '✅' : '❌'}`;
    }
}
// Call loadSettings() during init

// Add at the top of the file with other variable declarations
let sceneChanged = true;
let lastX = 0;
let lastY = 0;
let width = 1280;
let height = 720;

const app = new PIXI.Application({
  width: 1280,
  height: 720,
  antialias: true,
  transparent: false
});
document.body.appendChild(app.view);

// Add initialization of control values at startup
function initializeControls() {
    // Helper function for safe event listener binding
    function safeAddListener(id, event, handler) {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener(event, handler);
        } else {
            console.warn(`Element #${id} not found for event binding`);
        }
    }

    // Restore event listeners with null checks
    safeAddListener('toggle-ai', 'click', (e) => {
        aiEnabled = !aiEnabled;
        e.target.textContent = `AUTO SWIM ${aiEnabled ? '✅' : '❌'}`;
    });

    safeAddListener('toggle-ripples', 'click', (e) => {
        rippleEffectEnabled = !rippleEffectEnabled;
        e.target.textContent = `RIPPLES ${rippleEffectEnabled ? '✅' : '❌'}`;
    });

    // Add missing event listener for CRT toggle
    safeAddListener('toggle-crt', 'click', (e) => {
        crtEffectEnabled = !crtEffectEnabled;
        e.target.textContent = `CRT ${crtEffectEnabled ? '✅' : '❌'}`;
    });

    // Add spawn fish button handler
    safeAddListener('spawn-fish', 'click', () => {
        const count = parseInt(document.getElementById('fish-count').value) || 1;
        spawnFish(count);
    });

    // Set initial values from saved settings
    const saved = JSON.parse(localStorage.getItem('aquariumSettings'));
    if (saved) {
        document.getElementById('swim-force').value = saved.swimForce;
        document.getElementById('water-density').value = saved.waterDensity;
        // Load other settings...
    }
}

// Call initialization after DOM load
window.addEventListener('DOMContentLoaded', initializeControls);

// Add CRT effect implementation
function applyCRTEffect() {
    // Use full canvas dimensions
    const imageData = ctx.getImageData(0, 0, gameCanvas.width, gameCanvas.height);
    const data = imageData.data;
    
    // Add scanlines
    for (let y = 0; y < gameCanvas.height; y++) {
        for (let x = 0; x < gameCanvas.width; x++) {
            const i = (y * gameCanvas.width + x) * 4;
            if (y % 2 === 0) {
                data[i] *= 0.8;   // R
                data[i+1] *= 0.8; // G
                data[i+2] *= 0.8; // B
            }
        }
    }
    
    // Add vignette
    const centerX = gameCanvas.width/2;
    const centerY = gameCanvas.height/2;
    const maxDist = Math.hypot(centerX, centerY);
    
    for (let y = 0; y < gameCanvas.height; y++) {
        for (let x = 0; x < gameCanvas.width; x++) {
            const i = (y * gameCanvas.width + x) * 4;
            const dist = Math.hypot(x - centerX, y - centerY)/maxDist;
            const vignette = 1 - dist * 0.5;
            
            data[i] *= vignette;   // R
            data[i+1] *= vignette; // G
            data[i+2] *= vignette; // B
        }
    }
    
    ctx.putImageData(imageData, 0, 0);
}

// Modify the animation loop to include new effects
function animate(timestamp) {
    // Split heavy operations across frames
    if (lastFrameTime === undefined) lastFrameTime = timestamp;
    const deltaTime = timestamp - lastFrameTime;
    
    // Process physics in chunks if needed
    if (deltaTime > 16) { // 60fps frame budget
        updatePhysics(deltaTime);
        lastFrameTime = timestamp;
    }
    
    // Draw new effects
    drawWater();
    drawCaustics();
    drawParticles();
    drawLighting();
    
    // Use setTimeout to yield to main thread
    requestAnimationFrame((ts) => {
        setTimeout(() => animate(ts), 0);
    });
}

// Add this function near other fish-related functions
function partitionFish(fishArray) {
    const batchSize = 10; // Process 10 fish at a time
    const batches = [];
    
    for (let i = 0; i < fishArray.length; i += batchSize) {
        batches.push(fishArray.slice(i, i + batchSize));
    }
    
    return batches;
}

function updateFish() {
    fish.forEach(fish => {
        // Apply AI movement
        if (aiEnabled) {
            const separation = fish.calculateSeparation();
            const alignment = fish.calculateAlignment();
            const cohesion = fish.calculateCohesion();
            
            const targetAngle = Math.atan2(
                separation.y + alignment.y + cohesion.y,
                separation.x + alignment.x + cohesion.x
            );
            
            // Smooth angle adjustment
            Body.setAngle(fish.body, fish.body.angle + 
                (targetAngle - fish.body.angle) * 0.1);
            
            // Apply movement force
            const currentVel = Vector.magnitude(fish.body.velocity);
            if (currentVel < fish.maxSpeed) {
                const force = Vector.create(
                    Math.cos(fish.body.angle) * swimForce,
                    Math.sin(fish.body.angle) * swimForce
                );
                Body.applyForce(fish.body, fish.body.position, force);
            }
        }
        
        // Draw the fish
        fish.draw();
    });
}

// Add this function near other drawing functions
function drawScene() {
    // Clear all canvases
    bgCtx.clearRect(0, 0, backgroundCanvas.width, backgroundCanvas.height);
    ctx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
    fxCtx.clearRect(0, 0, effectsCanvas.width, effectsCanvas.height);
    
    // Draw background elements
    drawWater();
    drawBackgroundObjects();
    
    // Update and draw fish
    updateFish();
    
    // Draw effects
    if(rippleEffectEnabled) drawRipples();
    if(crtEffectEnabled) applyCRTEffect();
}

// Add caustic light patterns
function drawCaustics() {
    const patternCanvas = document.createElement('canvas');
    patternCanvas.width = 200;
    patternCanvas.height = 200;
    const patternCtx = patternCanvas.getContext('2d');
    
    // Create light pattern
    patternCtx.beginPath();
    for (let i = 0; i < 20; i++) {
        const x = Math.random() * 200;
        const y = Math.random() * 200;
        const r = 10 + Math.random() * 20;
        patternCtx.moveTo(x + r, y);
        patternCtx.arc(x, y, r, 0, Math.PI * 2);
    }
    patternCtx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    patternCtx.fill();
    
    // Apply as pattern
    const pattern = ctx.createPattern(patternCanvas, 'repeat');
    ctx.fillStyle = pattern;
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);
    ctx.globalCompositeOperation = 'source-over';
}

// Add floating particles
const particles = [];

function createParticles() {
    for (let i = 0; i < 100; i++) {
        particles.push({
            x: Math.random() * gameCanvas.width,
            y: Math.random() * gameCanvas.height,
            size: 1 + Math.random() * 2,
            speed: 0.1 + Math.random() * 0.3
        });
    }
}

function drawParticles() {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    particles.forEach(p => {
        p.y -= p.speed;
        if (p.y < 0) {
            p.y = gameCanvas.height;
            p.x = Math.random() * gameCanvas.width;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    });
}

// Add dynamic lighting effects
function drawLighting() {
    const gradient = ctx.createRadialGradient(
        gameCanvas.width / 2, gameCanvas.height / 2, 100,
        gameCanvas.width / 2, gameCanvas.height / 2, 500
    );
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);
}