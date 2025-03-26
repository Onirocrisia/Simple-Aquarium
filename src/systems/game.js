import { initAudio } from './audio.js';
import { initPhysics } from './physics.js';
import { initControls } from './controls.js';

export function initGame() {
    initAudio();
    initPhysics();
    initControls();
} 