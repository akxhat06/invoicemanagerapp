"use client";

import { useEffect, useRef, useState } from "react";

/** Charcoal accent — neutral gray, not pure black */
const BRAND = "#71717a";
const DARK = "#121214";
/** App mark — `public/logo3-dark.svg` */
const LOGO2_SRC = "/logo3-dark.svg";

type Props = {
  onComplete: () => void;
  /** Optional class for font variables (e.g. next/font) */
  className?: string;
};

export function LoginOpeningAnimation({ onComplete, className = "" }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [step, setStep] = useState(0);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const t = [
      window.setTimeout(() => setStep(1), 100),
      window.setTimeout(() => setStep(2), 1600),
      window.setTimeout(() => setStep(3), 3000),
      window.setTimeout(() => setStep(4), 4200),
      window.setTimeout(() => setStep(5), 5200),
      window.setTimeout(() => onCompleteRef.current(), 6400),
    ];
    return () => t.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const W = window.innerWidth;
    const H = window.innerHeight;
    c.width = W * dpr;
    c.height = H * dpr;
    c.style.width = `${W}px`;
    c.style.height = `${H}px`;
    ctx.scale(dpr, dpr);

    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 1.5 + 0.5,
      a: Math.random() * 0.3 + 0.05,
    }));

    let raf = 0;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = W;
        if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H;
        if (p.y > H) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(113, 113, 122, ${p.a})`;
        ctx.fill();
      });

      particles.forEach((a, i) => {
        particles.slice(i + 1).forEach((b) => {
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < 100) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(113, 113, 122, ${0.04 * (1 - d / 100)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      className={`login-opening-root fixed inset-0 z-[200] overflow-hidden ${className}`}
      style={{
        height: "100vh",
        width: "100vw",
        background: DARK,
        fontFamily: "var(--font-login-opening-outfit), ui-sans-serif, system-ui, sans-serif",
      }}
      role="presentation"
    >
      <style>{`
        @keyframes login-open-ringDraw { from { stroke-dashoffset: 820; } to { stroke-dashoffset: 0; } }
        @keyframes login-open-ringDraw2 { from { stroke-dashoffset: 565; } to { stroke-dashoffset: 0; } }
        @keyframes login-open-chartDraw { from { stroke-dashoffset: 600; } to { stroke-dashoffset: 0; } }
        @keyframes login-open-morphIn { from { opacity: 0; transform: scale(0.7) rotate(-90deg); } to { opacity: 1; transform: scale(1) rotate(0deg); } }
        @keyframes login-open-lineGrow { from { stroke-dashoffset: 200; } to { stroke-dashoffset: 0; } }
        @keyframes login-open-crossDraw { from { stroke-dashoffset: 60; } to { stroke-dashoffset: 0; } }
        @keyframes login-open-rupeeIn { 0% { opacity: 0; transform: scale(0); } 60% { opacity: 1; transform: scale(1.2); } 100% { transform: scale(1); } }
        @keyframes login-open-textSlide { from { opacity: 0; transform: translateY(25px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes login-open-taglineIn { from { opacity: 0; letter-spacing: 12px; } to { opacity: 1; letter-spacing: 5px; } }
        @keyframes login-open-loadBar { from { transform: scaleX(0); } to { transform: scaleX(1); } }
        @keyframes login-open-fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes login-open-dotPulse { 0%,100% { transform: scale(1); opacity: 0.6; } 50% { transform: scale(1.8); opacity: 1; } }
        @keyframes login-open-scanLine { from { top: 0; opacity: 0.5; } to { top: 100%; opacity: 0; } }
        @keyframes login-open-borderGlow {
          0%,100% { box-shadow: 0 0 0 rgba(164,14,76,0); }
          50% { box-shadow: 0 0 30px rgba(164,14,76,0.15); }
        }
        @keyframes login-open-gentleFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
      `}</style>

      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 z-[1]" aria-hidden />

      {step >= 1 && step < 5 && (
        <div
          className="pointer-events-none absolute left-0 right-0 z-[2] h-px"
          style={{
            background: `linear-gradient(90deg, transparent, ${BRAND}40, transparent)`,
            animation: "login-open-scanLine 2s linear infinite",
          }}
        />
      )}

      {step >= 1 && (
        <div
          className="absolute inset-0 z-[3] flex items-center justify-center"
          style={{
            opacity: step >= 3 ? 0 : 1,
            transition: "opacity 0.8s ease",
            pointerEvents: "none",
          }}
        >
          <svg width="280" height="280" viewBox="0 0 280 280" className="absolute">
            <circle
              cx="140"
              cy="140"
              r="130"
              fill="none"
              stroke={BRAND}
              strokeWidth="0.5"
              strokeDasharray="820"
              strokeDashoffset="820"
              style={{ animation: "login-open-ringDraw 1.5s ease forwards" }}
              opacity="0.4"
            />
            <circle
              cx="140"
              cy="140"
              r="90"
              fill="none"
              stroke={BRAND}
              strokeWidth="0.5"
              strokeDasharray="565"
              strokeDashoffset="565"
              style={{ animation: "login-open-ringDraw2 1.2s ease 0.3s forwards" }}
              opacity="0.25"
            />
            {Array.from({ length: 36 }).map((_, i) => {
              const a = (i * 10 * Math.PI) / 180;
              const x1 = 140 + 125 * Math.cos(a);
              const y1 = 140 + 125 * Math.sin(a);
              const x2 = 140 + 130 * Math.cos(a);
              const y2 = 140 + 130 * Math.sin(a);
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={BRAND}
                  strokeWidth="0.5"
                  opacity="0.2"
                  style={{
                    animation: `login-open-fadeIn 0.3s ease ${0.03 * i}s forwards`,
                    opacity: 0,
                  }}
                />
              );
            })}
          </svg>

          {step >= 2 && (
            <>
              <div
                className="absolute left-[10%] top-[15%] h-10 w-10"
                style={{
                  borderTop: `1px solid ${BRAND}30`,
                  borderLeft: `1px solid ${BRAND}30`,
                  animation: "login-open-morphIn 0.6s ease forwards",
                  opacity: 0,
                }}
              />
              <div
                className="absolute bottom-[15%] right-[10%] h-10 w-10"
                style={{
                  borderBottom: `1px solid ${BRAND}30`,
                  borderRight: `1px solid ${BRAND}30`,
                  animation: "login-open-morphIn 0.6s ease 0.2s forwards",
                  opacity: 0,
                }}
              />
              {(
                [
                  { top: "50%", left: "5%", delay: "0s" },
                  { top: "50%", right: "5%", delay: "0.3s" },
                  { top: "8%", left: "50%", delay: "0.15s" },
                  { bottom: "8%", left: "50%", delay: "0.45s" },
                ] as const
              ).map(({ delay, ...pos }, i) => (
                <div
                  key={i}
                  className="absolute h-1 w-1 rounded-full"
                  style={{
                    ...pos,
                    background: BRAND,
                    animation: `login-open-dotPulse 1.5s ease ${delay} infinite`,
                  }}
                />
              ))}
            </>
          )}
        </div>
      )}

      {step >= 3 && (
        <div
          className="absolute inset-0 z-[4] flex items-center justify-center"
          style={{
            opacity: step >= 5 ? 0 : 1,
            transition: "opacity 0.6s ease",
            pointerEvents: "none",
          }}
        >
          <div
            className="text-center"
            style={{ animation: "login-open-rupeeIn 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) forwards" }}
          >
            <div
              style={{
                fontSize: 90,
                fontWeight: 200,
                color: BRAND,
                lineHeight: 1,
                textShadow: `0 0 60px ${BRAND}40`,
                animation: "login-open-gentleFloat 3s ease-in-out infinite",
              }}
            >
              ₹
            </div>
          </div>

          <svg
            width="300"
            height="300"
            viewBox="0 0 300 300"
            className="absolute"
            style={{ animation: "login-open-morphIn 0.8s ease 0.3s forwards", opacity: 0 }}
          >
            <line
              x1="100"
              y1="140"
              x2="200"
              y2="140"
              stroke={BRAND}
              strokeWidth="0.5"
              opacity="0.3"
              strokeDasharray="200"
              style={{ animation: "login-open-lineGrow 0.6s ease 0.4s forwards" }}
            />
            <line
              x1="100"
              y1="160"
              x2="200"
              y2="160"
              stroke={BRAND}
              strokeWidth="0.5"
              opacity="0.2"
              strokeDasharray="200"
              style={{ animation: "login-open-lineGrow 0.6s ease 0.5s forwards" }}
            />
            {[
              { x: 80, y: 100 },
              { x: 220, y: 100 },
              { x: 80, y: 200 },
              { x: 220, y: 200 },
            ].map((p, i) => (
              <g key={i}>
                <line
                  x1={p.x - 6}
                  y1={p.y}
                  x2={p.x + 6}
                  y2={p.y}
                  stroke={BRAND}
                  strokeWidth="0.5"
                  opacity="0.3"
                  strokeDasharray="60"
                  style={{ animation: `login-open-crossDraw 0.4s ease ${0.5 + i * 0.1}s forwards` }}
                />
                <line
                  x1={p.x}
                  y1={p.y - 6}
                  x2={p.x}
                  y2={p.y + 6}
                  stroke={BRAND}
                  strokeWidth="0.5"
                  opacity="0.3"
                  strokeDasharray="60"
                  style={{ animation: `login-open-crossDraw 0.4s ease ${0.5 + i * 0.1}s forwards` }}
                />
              </g>
            ))}
          </svg>
        </div>
      )}

      {step >= 4 && (
        <div
          className="absolute inset-0 z-[5] flex items-center justify-center"
          style={{
            opacity: step >= 5 ? 0 : 1,
            transition: "opacity 0.6s ease",
            pointerEvents: "none",
          }}
        >
          <svg
            width="400"
            height="120"
            viewBox="0 0 400 120"
            className="absolute bottom-[25%]"
            style={{ animation: "login-open-textSlide 0.6s ease forwards" }}
          >
            <polyline
              points="0,80 40,70 80,75 120,45 160,55 200,30 240,40 280,20 320,35 360,15 400,25"
              fill="none"
              stroke={BRAND}
              strokeWidth="1.5"
              opacity="0.5"
              strokeDasharray="600"
              strokeDashoffset="600"
              style={{ animation: "login-open-chartDraw 1s ease forwards" }}
            />
            <polygon
              points="0,80 40,70 80,75 120,45 160,55 200,30 240,40 280,20 320,35 360,15 400,25 400,120 0,120"
              fill={`${BRAND}08`}
              style={{ animation: "login-open-fadeIn 0.8s ease 0.5s forwards", opacity: 0 }}
            />
            {[
              [200, 30],
              [280, 20],
              [360, 15],
            ].map(([x, y], i) => (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="3"
                fill={BRAND}
                style={{ animation: `login-open-rupeeIn 0.4s ease ${0.6 + i * 0.15}s forwards`, opacity: 0 }}
              />
            ))}
          </svg>

          <div
            className="absolute top-[25%] flex gap-[50px]"
            style={{ animation: "login-open-textSlide 0.5s ease 0.3s forwards", opacity: 0 }}
          >
            {[
              { val: "284", label: "invoices" },
              { val: "₹18L", label: "revenue" },
              { val: "47", label: "retailers" },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <div
                  className="text-[28px] font-bold text-white"
                  style={{ fontFamily: "var(--font-login-opening-outfit), sans-serif" }}
                >
                  {s.val}
                </div>
                <div
                  className="mt-0.5 text-[10px]"
                  style={{ color: `${BRAND}90`, letterSpacing: 2 }}
                >
                  {s.label.toUpperCase()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {step >= 5 && (
        <div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center"
          style={{ background: DARK }}
        >
          <div
            className="flex h-[76px] w-[76px] items-center justify-center overflow-hidden rounded-[20px] bg-white p-1.5 shadow-lg"
            style={{
              animation:
                "login-open-rupeeIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards, login-open-borderGlow 2s ease 0.6s infinite",
            }}
          >
            <img
              src={LOGO2_SRC}
              alt="Vishwa Shree Enterprises"
              width={120}
              height={120}
              decoding="async"
              className="h-full w-full object-contain"
            />
          </div>

          <div
            className="mt-6 text-center"
            style={{
              animation: "login-open-textSlide 0.6s ease 0.3s forwards",
              opacity: 0,
            }}
          >
            <div
              className="text-[30px] font-light tracking-wide text-white"
              style={{ fontFamily: "var(--font-login-opening-cormorant), ui-serif, Georgia, serif" }}
            >
              Vishwa Shree
            </div>
          </div>

          <div
            className="mt-1.5 text-center text-[11px] font-medium"
            style={{ animation: "login-open-taglineIn 0.8s ease 0.5s forwards", opacity: 0, color: BRAND }}
          >
            ENTERPRISES
          </div>

          <div
            className="mt-10 h-0.5 w-[120px] overflow-hidden rounded-sm"
            style={{
              background: "rgba(255,255,255,0.05)",
              animation: "login-open-fadeIn 0.3s ease 0.7s forwards",
              opacity: 0,
            }}
          >
            <div
              className="h-full w-full rounded-sm"
              style={{
                background: BRAND,
                transform: "scaleX(0)",
                transformOrigin: "left",
                animation: "login-open-loadBar 1s ease 0.8s forwards",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
