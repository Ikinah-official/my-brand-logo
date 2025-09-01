import { useEffect, useRef } from "react";

// IKINAH palette
const COLORS = ["#E6E6FA", "#DFFFE0", "#FADADD", "#D8A7D7"];
const BG = "#2F184B";

function drawHeart(ctx, x, y, size, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size, size);
  ctx.fillStyle = color;
  ctx.beginPath();
  // parametric heart (rounded)
  for (let t = 0; t < Math.PI * 2; t += 0.05) {
    const px = 16 * Math.pow(Math.sin(t), 3);
    const py =
      13 * Math.cos(t) -
      5 * Math.cos(2 * t) -
      2 * Math.cos(3 * t) -
      Math.cos(4 * t);
    ctx.lineTo(px, -py);
  }
  ctx.closePath();
  ctx.shadowColor = color + "80";
  ctx.shadowBlur = 12;
  ctx.fill();
  ctx.restore();
}

export default function HeartAssemble() {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { alpha: false });
    let W = (canvas.width = window.innerWidth);
    let H = (canvas.height = window.innerHeight);

    const handleResize = () => {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
      // mark to rebuild on resize
      needInit = true;
    };
    window.addEventListener("resize", handleResize);

    // particles
    let particles = [];
    let targets = [];
    let needInit = true;
    const HEARTS = 900; // particle count
    const SAMPLE_STEP = 4; // pixel sampling step

    const loadTargetsFromImage = () =>
      new Promise((resolve) => {
        const img = new Image();
        img.src = "/logo.png";
        img.onload = () => {
          // sample the logo into points
          const scale =
            Math.min(W * 0.4 / img.width, H * 0.4 / img.height) || 1;
          const tmp = document.createElement("canvas");
          const tw = Math.max(1, Math.floor(img.width * scale));
          const th = Math.max(1, Math.floor(img.height * scale));
          tmp.width = tw;
          tmp.height = th;
          const tctx = tmp.getContext("2d");
          tctx.clearRect(0, 0, tw, th);
          tctx.drawImage(img, 0, 0, tw, th);
          const { data } = tctx.getImageData(0, 0, tw, th);

          const pts = [];
          for (let y = 0; y < th; y += SAMPLE_STEP) {
            for (let x = 0; x < tw; x += SAMPLE_STEP) {
              const idx = (y * tw + x) * 4;
              const a = data[idx + 3]; // alpha
              if (a > 180) {
                // center to screen
                const cx = (W - tw) / 2 + x;
                const cy = (H - th) / 2 + y;
                pts.push({ x: cx, y: cy });
              }
            }
          }
          resolve(pts);
        };
      });

    const init = async () => {
      targets = await loadTargetsFromImage();

      // choose up to HEARTS unique targets
      const chosen = [];
      for (let i = 0; i < HEARTS; i++) {
        const p = targets[(i * 37) % targets.length]; // pseudo random spread
        chosen.push(p);
      }

      particles = chosen.map((t) => {
        // spawn off-screen in random ring
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.max(W, H) * (0.6 + Math.random() * 0.6);
        const startX = Math.cos(angle) * radius + W / 2;
        const startY = Math.sin(angle) * radius + H / 2;
        return {
          x: startX,
          y: startY,
          vx: 0,
          vy: 0,
          tx: t.x,
          ty: t.y,
          size: 0.9 + Math.random() * 1.6,
          color: COLORS[(Math.random() * COLORS.length) | 0],
          arrived: false,
        };
      });
    };

    const spring = 0.035;   // attraction
    const damping = 0.86;   // motion smoothness
    const arriveRadius = 1.4;

    const renderBG = () => {
      // dark background with subtle vignette
      const g = ctx.createRadialGradient(
        W / 2,
        H / 2,
        Math.min(W, H) * 0.2,
        W / 2,
        H / 2,
        Math.max(W, H) * 0.7
      );
      g.addColorStop(0, BG);
      g.addColorStop(1, "#1f1236"); // darker shade of #2F184B
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    };

    const animate = () => {
      if (needInit) {
        needInit = false;
        init();
      }
      renderBG();

      // faint glow orbs for depth (palette only)
      ctx.globalAlpha = 0.25;
      ctx.filter = "blur(40px)";
      [[0.2, 0.25, "#D8A7D7"], [0.85, 0.75, "#E6E6FA"]].forEach(([nx, ny, c]) => {
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.arc(nx * W, ny * H, Math.min(W, H) * 0.15, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.filter = "none";
      ctx.globalAlpha = 1;

      // update + draw particles
      for (const p of particles) {
        const dx = p.tx - p.x;
        const dy = p.ty - p.y;
        p.vx += dx * spring;
        p.vy += dy * spring;
        p.vx *= damping;
        p.vy *= damping;
        p.x += p.vx;
        p.y += p.vy;

        if (!p.arrived && Math.hypot(dx, dy) < arriveRadius) p.arrived = true;

        drawHeart(ctx, p.x, p.y, p.size, p.color);
      }

      // soft logo “settle” glow when most have arrived
      const settled = particles.filter((p) => p.arrived).length / particles.length;
      if (settled > 0.8) {
        ctx.globalAlpha = (settled - 0.8) * 5; // fade in
        ctx.filter = "blur(12px)";
        ctx.fillStyle = "#DFFFE0";
        ctx.beginPath();
        ctx.arc(W / 2, H / 2, Math.min(W, H) * 0.22, 0, Math.PI * 2);
        ctx.fill();
        ctx.filter = "none";
        ctx.globalAlpha = 1;
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 block" />;
}
