import * as THREE from 'three';

export class ScoreboardHUD {
  constructor(scene) {
    this.scene = scene;

    // Create high-res canvas for crystal clear text in VR
    this.canvas = document.createElement('canvas');
    this.canvas.width = 1024;
    this.canvas.height = 512;
    this.ctx = this.canvas.getContext('2d');

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.minFilter = THREE.LinearFilter;

    const hudGeo = new THREE.PlaneGeometry(3.6, 1.8);
    const hudMat = new THREE.MeshBasicMaterial({
      map: this.texture,
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide
    });

    this.mesh = new THREE.Mesh(hudGeo, hudMat);
    this.mesh.position.set(0, 3.4, -6.5);
    this.mesh.rotation.x = 0.12; // tilted slightly downwards towards player

    // Decorative frame backer
    const frameGeo = new THREE.PlaneGeometry(3.66, 1.86);
    const frameMat = new THREE.MeshBasicMaterial({
      color: 0x00f2fe,
      wireframe: true
    });
    const frameMesh = new THREE.Mesh(frameGeo, frameMat);
    frameMesh.position.z = -0.01;
    this.mesh.add(frameMesh);

    this.scene.add(this.mesh);

    this.state = {
      score: 0,
      highScore: 0,
      timeLeft: 60,
      combo: 1,
      hits: 0,
      shots: 0,
      isPlaying: false,
      isGameOver: false
    };

    this.redraw();
  }

  updateState(newState) {
    Object.assign(this.state, newState);
    this.redraw();
  }

  redraw() {
    const { ctx, canvas } = this;
    const { score, highScore, timeLeft, combo, hits, shots, isPlaying, isGameOver } = this.state;

    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bgGrad.addColorStop(0, 'rgba(10, 15, 30, 0.95)');
    bgGrad.addColorStop(1, 'rgba(5, 8, 18, 0.95)');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Border
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#00f2fe';
    ctx.strokeRect(6, 6, canvas.width - 12, canvas.height - 12);

    // Header bar
    ctx.fillStyle = 'rgba(0, 242, 254, 0.15)';
    ctx.fillRect(12, 12, canvas.width - 24, 70);

    ctx.fillStyle = '#00f2fe';
    ctx.font = 'bold 36px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('CYBER BLASTER RANGE', 36, 60);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#ff0077';
    ctx.fillText(`HIGH: ${highScore}`, canvas.width - 36, 60);

    // Accuracy calculation
    const accuracy = shots > 0 ? Math.round((hits / shots) * 100) : 100;

    if (!isPlaying && !isGameOver) {
      // Waiting to start state
      ctx.textAlign = 'center';
      ctx.fillStyle = '#00f2fe';
      ctx.font = 'bold 44px Arial';
      ctx.fillText('WELCOME AGENT', canvas.width / 2, 200);

      ctx.fillStyle = '#ffffff';
      ctx.font = '28px Arial';
      ctx.fillText('Shoot the glowing floating TARGET to start the 60s drill!', canvas.width / 2, 270);
      ctx.fillText('Gold Drones = +300 | Red Spikes = Avoid (-200)', canvas.width / 2, 330);

      ctx.fillStyle = '#4facfe';
      ctx.font = 'bold 30px Arial';
      ctx.fillText('Dual Wield: Both Left & Right Triggers Fire', canvas.width / 2, 420);
    } else if (isGameOver) {
      // Game Over state
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ff0055';
      ctx.font = 'bold 50px Arial';
      ctx.fillText('ROUND COMPLETE!', canvas.width / 2, 180);

      ctx.fillStyle = '#00f2fe';
      ctx.font = 'bold 64px Arial';
      ctx.fillText(`FINAL SCORE: ${score}`, canvas.width / 2, 260);

      ctx.fillStyle = '#ffffff';
      ctx.font = '32px Arial';
      ctx.fillText(`Accuracy: ${accuracy}% (${hits}/${shots} hits)`, canvas.width / 2, 330);

      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 32px Arial';
      ctx.fillText('Shoot the START TARGET to play again!', canvas.width / 2, 420);
    } else {
      // Active gameplay stats
      // 1. Time Left
      ctx.textAlign = 'left';
      ctx.fillStyle = timeLeft <= 10 ? '#ff0055' : '#ffffff';
      ctx.font = 'bold 32px Arial';
      ctx.fillText('TIME', 50, 160);
      ctx.font = 'bold 76px Arial';
      ctx.fillText(`${Math.max(0, Math.ceil(timeLeft))}s`, 50, 240);

      // 2. Score
      ctx.textAlign = 'center';
      ctx.fillStyle = '#00f2fe';
      ctx.font = 'bold 32px Arial';
      ctx.fillText('SCORE', canvas.width / 2, 160);
      ctx.font = 'bold 84px Arial';
      ctx.fillText(`${score}`, canvas.width / 2, 240);

      // 3. Combo
      ctx.textAlign = 'right';
      ctx.fillStyle = combo > 1 ? '#ffd700' : '#8899aa';
      ctx.font = 'bold 32px Arial';
      ctx.fillText('COMBO', canvas.width - 50, 160);
      ctx.font = 'bold 76px Arial';
      ctx.fillText(`x${combo}`, canvas.width - 50, 240);

      // Lower stats bar (divider line)
      ctx.strokeStyle = 'rgba(0, 242, 254, 0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(40, 310);
      ctx.lineTo(canvas.width - 40, 310);
      ctx.stroke();

      // Accuracy & Shots breakdown
      ctx.textAlign = 'left';
      ctx.fillStyle = '#ffffff';
      ctx.font = '28px Arial';
      ctx.fillText(`Hits: ${hits} / ${shots}`, 50, 380);

      ctx.textAlign = 'right';
      ctx.fillText(`Accuracy: ${accuracy}%`, canvas.width - 50, 380);

      // Visual combo heat meter
      const meterWidth = (canvas.width - 100);
      const comboFill = Math.min(1.0, (combo - 1) / 5);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.fillRect(50, 430, meterWidth, 24);

      if (comboFill > 0) {
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(50, 430, meterWidth * comboFill, 24);
      }
    }

    this.texture.needsUpdate = true;
  }
}
