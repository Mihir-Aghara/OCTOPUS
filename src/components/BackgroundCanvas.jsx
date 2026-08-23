import React, { useEffect, useRef } from 'react';

export default function BackgroundCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Mouse interaction
    const mouse = { x: width / 2, y: height / 2 };
    const handleMouseMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Dynamic gradient mesh nodes (Stripe style)
    const blobs = [
      { x: width * 0.1, y: height * 0.2, r: Math.max(width, height) * 0.45, vx: 0.3, vy: 0.2, color: 'rgba(99, 102, 241, 0.16)' },  // Indigo
      { x: width * 0.85, y: height * 0.15, r: Math.max(width, height) * 0.4, vx: -0.2, vy: 0.3, color: 'rgba(244, 63, 94, 0.14)' },  // Coral Rose
      { x: width * 0.5, y: height * 0.7, r: Math.max(width, height) * 0.5, vx: 0.1, vy: -0.2, color: 'rgba(139, 92, 246, 0.12)' },  // Violet
      { x: width * 0.2, y: height * 0.85, r: Math.max(width, height) * 0.4, vx: -0.2, vy: -0.1, color: 'rgba(6, 182, 212, 0.14)' }   // Cyan
    ];

    // Subtle crisp particle dots
    const particles = [];
    const particleCount = Math.min(Math.floor(width / 35), 40);
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 2 + 1,
        color: i % 2 === 0 ? 'rgba(99, 102, 241, 0.3)' : 'rgba(139, 92, 246, 0.3)',
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3
      });
    }

    let time = 0;

    const render = () => {
      time += 0.005;
      ctx.clearRect(0, 0, width, height);

      // 1. Draw flowing animated gradient blobs
      blobs.forEach((blob, idx) => {
        blob.x += Math.sin(time + idx) * blob.vx;
        blob.y += Math.cos(time + idx) * blob.vy;

        const radGrad = ctx.createRadialGradient(
          blob.x + Math.sin(time) * 30,
          blob.y + Math.cos(time) * 30,
          0,
          blob.x,
          blob.y,
          blob.r
        );
        radGrad.addColorStop(0, blob.color);
        radGrad.addColorStop(1, 'rgba(248, 250, 252, 0)');

        ctx.fillStyle = radGrad;
        ctx.fillRect(0, 0, width, height);
      });

      // 2. Interactive mouse spotlight glow
      const mouseGrad = ctx.createRadialGradient(
        mouse.x,
        mouse.y,
        0,
        mouse.x,
        mouse.y,
        350
      );
      mouseGrad.addColorStop(0, 'rgba(99, 102, 241, 0.08)');
      mouseGrad.addColorStop(1, 'rgba(248, 250, 252, 0)');
      ctx.fillStyle = mouseGrad;
      ctx.fillRect(0, 0, width, height);

      // 3. Draw subtle connecting mesh nodes
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = 'rgba(99, 102, 241, 0.08)';
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 opacity-90"
    />
  );
}
