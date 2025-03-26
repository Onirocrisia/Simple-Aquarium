# Aquarium Simulator 🐠

![Aquarium Preview](src/assets/images/aquarium-screenshot.png)

An interactive physics-based aquarium experience with procedurally generated graphics and sound. Built with HTML5 Canvas and Matter.js.

## Features ✨

### 🌊 Core Experience
- Real-time aquatic ecosystem simulation
- Interactive physics engine with buoyancy and fluid dynamics
- Dynamic fish AI with swarm behavior (separation/alignment/cohesion)
- Click/touch-driven water ripple effects

### 🎨 Procedural Generation
- Unique fish designs with random color patterns
- Dynamic fin animations and movement physics
- Real-time CRT and scanline visual effects
- Algorithmic background music generation

### 🕹️ Interactive Controls
- Adjustable water properties (density, friction)
- Real-time fish spawning/behavior modification
- Audio controls for background music/SFX
- Visual toggles for CRT/ripple effects

## Getting Started

1. Clone repo
2. Open `index.html` in modern browser
3. Use control panel to customize experience

```html
<!-- Basic Implementation -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.18.0/matter.min.js"></script>
```

## Technical Implementation 🔧

| Aspect          | Technologies Used              |
|-----------------|---------------------------------|
| Physics Engine  | Matter.js rigid body dynamics  |
| Rendering       | Canvas 2D context              |
| Audio           | Web Audio API synthesis        |
| UI              | CSS Grid + Flexbox             |

**Key Optimization Techniques**:
- Spatial partitioning for fish interactions
- Object pooling for ripple effects
- Web Workers for audio processing
- RequestAnimationFrame-based rendering

License: [MIT](LICENSE) 