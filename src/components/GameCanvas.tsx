/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState } from "react";
import { Play, RotateCcw, Volume2, VolumeX, Award, HelpCircle } from "lucide-react";
import { ORB_TIERS, PhysicsObject, Particle, TRANSLATIONS } from "../types";
import { gameAudio } from "../utils/audio";

interface GameCanvasProps {
  score: number;
  onScoreChange: (score: number) => void;
  onMaxOrbUpdate: (maxOrbIndex: number) => void;
  onAchievementUnlock: (id: string) => void;
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
  language: "en" | "hi";
  gameState: "idle" | "playing" | "gameover";
  setGameState: (state: "idle" | "playing" | "gameover") => void;
  onRestart: () => void;
  resetKey: number;
}

const LOGICAL_WIDTH = 360;
const LOGICAL_HEIGHT = 540;

const LEFT_WALL = 12;
const RIGHT_WALL = 348;
const FLOOR = 525;
const DANGER_LINE_Y = 110;
const SPAWN_Y = 60;

export default function GameCanvas({
  score,
  onScoreChange,
  onMaxOrbUpdate,
  onAchievementUnlock,
  isMuted,
  setIsMuted,
  language,
  gameState,
  setGameState,
  onRestart,
  resetKey,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Game loop and objects state (using refs for direct physics access inside requestAnimationFrame)
  const objectsRef = useRef<PhysicsObject[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const nextOrbIndexRef = useRef<number>(Math.floor(Math.random() * 4)); // Only allow tiers 0-3 for drop
  const currentOrbIndexRef = useRef<number>(Math.floor(Math.random() * 4));
  const dropXRef = useRef<number>(LOGICAL_WIDTH / 2);
  const canDropRef = useRef<boolean>(true);
  const dangerTimerRef = useRef<number | null>(null);
  const lastMergeTimeRef = useRef<number>(0);
  const comboCountRef = useRef<number>(0);

  const [nextOrbIndex, setNextOrbIndex] = useState(nextOrbIndexRef.current);
  const [currentOrbIndex, setCurrentOrbIndex] = useState(currentOrbIndexRef.current);
  const [dangerTimeLeft, setDangerTimeLeft] = useState<number | null>(null);

  const t = TRANSLATIONS[language];

  // Sync mute state to audio manager
  useEffect(() => {
    gameAudio.setMute(isMuted);
  }, [isMuted]);

  // Restart trigger
  useEffect(() => {
    if (gameState === "playing") {
      resetGameEngine();
    }
  }, [gameState, resetKey]);

  const resetGameEngine = () => {
    objectsRef.current = [];
    particlesRef.current = [];
    canDropRef.current = true;
    dangerTimerRef.current = null;
    setDangerTimeLeft(null);
    comboCountRef.current = 0;
    onScoreChange(0);
    onMaxOrbUpdate(0);
    // Randomize drops
    currentOrbIndexRef.current = Math.floor(Math.random() * 4);
    nextOrbIndexRef.current = Math.floor(Math.random() * 4);
    setCurrentOrbIndex(currentOrbIndexRef.current);
    setNextOrbIndex(nextOrbIndexRef.current);
  };

  // Sound toggler helper
  const toggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    gameAudio.setMute(nextMute);
  };

  // Main canvas and physics update logic loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let lastTime = performance.now();

    const updatePhysicsAndDraw = (time: number) => {
      const dt = Math.min((time - lastTime) / 16.666, 3); // cap delta time to prevent physics tunneling
      lastTime = time;

      if (gameState === "playing") {
        runPhysics(dt);
        checkDangerLine();
      }

      updateParticles(dt);
      drawGame(ctx);

      animationFrameId = requestAnimationFrame(updatePhysicsAndDraw);
    };

    animationFrameId = requestAnimationFrame(updatePhysicsAndDraw);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [gameState, language]);

  // Handle Resize and high-DPI scaling
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const dpr = window.devicePixelRatio || 1;
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;

      // Scale canvas sizing based on actual rendered dimension
      canvas.width = containerWidth * dpr;
      canvas.height = containerHeight * dpr;
      canvas.style.width = `${containerWidth}px`;
      canvas.style.height = `${containerHeight}px`;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.scale((containerWidth * dpr) / LOGICAL_WIDTH, (containerHeight * dpr) / LOGICAL_HEIGHT);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // -------------------------------------------------------------
  // PHYSICS ENGINE RULES
  // -------------------------------------------------------------
  const runPhysics = (dt: number) => {
    const objects = objectsRef.current;
    const gravity = 0.38;
    const bounceFriction = 0.35; // bounce factor (restitution)
    const rollingResistance = 0.985; // roll friction

    // 1. Apply gravity & update position
    for (let i = 0; i < objects.length; i++) {
      const obj = objects[i];
      if (obj.isStatic) continue;

      obj.vy += gravity * dt;
      obj.x += obj.vx * dt;
      obj.y += obj.vy * dt;

      // Apply linear damping/air resistance slightly
      obj.vx *= Math.pow(rollingResistance, dt);
      obj.vy *= Math.pow(0.995, dt);

      // Simulating realistic angular rotation rolling
      obj.angle += (obj.vx / obj.radius) * dt;
    }

    // 2. Resolve Wall Collisions
    for (let i = 0; i < objects.length; i++) {
      const obj = objects[i];
      if (obj.isStatic) continue;

      // Left boundary wall
      if (obj.x - obj.radius < LEFT_WALL) {
        obj.x = LEFT_WALL + obj.radius;
        obj.vx = -obj.vx * bounceFriction;
        gameAudio.playBounce(Math.abs(obj.vx));
        spawnWallImpactParticles(LEFT_WALL, obj.y, obj.radius, ORB_TIERS[obj.typeIndex].color);
      }
      // Right boundary wall
      else if (obj.x + obj.radius > RIGHT_WALL) {
        obj.x = RIGHT_WALL - obj.radius;
        obj.vx = -obj.vx * bounceFriction;
        gameAudio.playBounce(Math.abs(obj.vx));
        spawnWallImpactParticles(RIGHT_WALL, obj.y, obj.radius, ORB_TIERS[obj.typeIndex].color);
      }

      // Bottom Floor boundary
      if (obj.y + obj.radius > FLOOR) {
        obj.y = FLOOR - obj.radius;
        obj.vy = -obj.vy * bounceFriction;
        // Damp horizontal velocity when moving on floor
        obj.vx *= 0.95;
        if (Math.abs(obj.vy) > 0.4) {
          gameAudio.playBounce(Math.abs(obj.vy));
        } else {
          obj.vy = 0; // Settle object
        }
        spawnWallImpactParticles(obj.x, FLOOR, obj.radius, ORB_TIERS[obj.typeIndex].color);
      }
    }

    // 3. Resolve Circle-Circle Collisions (Double loop)
    // We run static resolution (moving apart) then dynamic (impulse)
    for (let passes = 0; passes < 2; passes++) {
      for (let i = 0; i < objects.length; i++) {
        for (let j = i + 1; j < objects.length; j++) {
          const a = objects[i];
          const b = objects[j];

          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const minDist = a.radius + b.radius;

          if (dist < minDist) {
            // Check for Merge
            if (a.typeIndex === b.typeIndex) {
              const now = performance.now();
              // Prevent merging immediately upon spawning or too quickly
              if (now - a.creationTime > 200 && now - b.creationTime > 200) {
                handleMerge(i, j);
                return; // Return immediately to let objects re-align next frame safely
              }
            }

            // Static Resolution (push circles apart)
            const overlap = minDist - dist;
            // Prevent divide by zero if exactly overlapping
            const nx = dist > 0 ? dx / dist : 1;
            const ny = dist > 0 ? dy / dist : 0;

            // Push them apart inversely proportional to size/radius (larger orbs move less)
            const totalRadius = a.radius + b.radius;
            const ratioA = b.radius / totalRadius;
            const ratioB = a.radius / totalRadius;

            a.x -= nx * overlap * ratioA;
            a.y -= ny * overlap * ratioA;
            b.x += nx * overlap * ratioB;
            b.y += ny * overlap * ratioB;

            // Dynamic Resolution (Elastic rebound impulse)
            const rvx = b.vx - a.vx;
            const rvy = b.vy - a.vy;
            const velAlongNormal = rvx * nx + rvy * ny;

            if (velAlongNormal < 0) {
              const restitution = 0.25;
              const impulseScalar = -(1 + restitution) * velAlongNormal;

              const massA = a.radius;
              const massB = b.radius;
              const impulse = impulseScalar / (1 / massA + 1 / massB);

              a.vx -= nx * (impulse / massA);
              a.vy -= ny * (impulse / massA);
              b.vx += nx * (impulse / massB);
              b.vy += ny * (impulse / massB);

              const collisionVelocity = Math.abs(velAlongNormal);
              if (collisionVelocity > 0.3) {
                gameAudio.playBounce(collisionVelocity);
              }
            }
          }
        }
      }
    }
  };

  // Handling Merge Event
  const handleMerge = (indexA: number, indexB: number) => {
    const objects = objectsRef.current;
    const a = objects[indexA];
    const b = objects[indexB];

    // Compute center location of merge
    const midX = (a.x + b.x) / 2;
    const midY = (a.y + b.y) / 2;
    const currentTier = a.typeIndex;

    // Filter out the merged orbs
    objectsRef.current = objects.filter((_, idx) => idx !== indexA && idx !== indexB);

    // Achievements check: first merge
    if (currentTier === 0) {
      onAchievementUnlock("first_merge");
    }

    // Determine next level orb
    const nextTier = currentTier + 1;

    // Play chime sound
    const now = performance.now();
    if (now - lastMergeTimeRef.current < 650) {
      comboCountRef.current += 1;
      gameAudio.playCombo(comboCountRef.current);
      spawnComboFloatingText(midX, midY, comboCountRef.current);
    } else {
      comboCountRef.current = 0;
      gameAudio.playMerge(nextTier);
    }
    lastMergeTimeRef.current = now;

    // Award Points
    const earnedPoints = ORB_TIERS[currentTier].scoreValue * 2 * (1 + Math.floor(comboCountRef.current * 0.5));
    onScoreChange(score + earnedPoints);

    // Check achievement: reach 1,000 points
    if (score + earnedPoints >= 1000) {
      onAchievementUnlock("score_1000");
    }

    // Spawn burst particles
    spawnMergeExplosion(midX, midY, ORB_TIERS[currentTier]);

    // Handle Max Tier Merger (Supernova Tier 10 Merge)
    if (currentTier >= ORB_TIERS.length - 1) {
      // Ultimate merger easter egg! Clears lower 50% screen, massive score boost!
      spawnSupernovaShockwave(midX, midY);
      onAchievementUnlock("supernova");
      return;
    }

    // Achievements check: Solar Ignition
    if (nextTier === 6) {
      onAchievementUnlock("reach_nova");
    }

    // Create the new bigger orb
    const newOrb: PhysicsObject = {
      id: Math.random().toString(36).substr(2, 9),
      typeIndex: nextTier,
      x: midX,
      y: midY,
      vx: (a.vx + b.vx) * 0.4,
      vy: (a.vy + b.vy) * 0.4 - 1.5, // gentle jump on merge
      radius: ORB_TIERS[nextTier].radius,
      isStatic: false,
      angle: 0,
      angularVelocity: 0,
      creationTime: performance.now(),
    };

    objectsRef.current.push(newOrb);

    // Communicate back highest tier currently on screen
    updateHighestOrbLevel();
  };

  const updateHighestOrbLevel = () => {
    let maxLvl = 0;
    objectsRef.current.forEach((o) => {
      if (o.typeIndex > maxLvl) maxLvl = o.typeIndex;
    });
    onMaxOrbUpdate(maxLvl);
  };

  // -------------------------------------------------------------
  // PARTICLE GENERATORS & TEXT
  // -------------------------------------------------------------
  const spawnMergeExplosion = (x: number, y: number, sourceOrb: typeof ORB_TIERS[0]) => {
    const numParticles = 16 + sourceOrb.id * 3;
    for (let i = 0; i < numParticles; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 4.5;
      const radius = 2 + Math.random() * 5;
      const life = 1.0;
      const decay = 0.02 + Math.random() * 0.03;

      const p: Particle = {
        id: Math.random().toString(36).substr(2, 9),
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.5,
        radius: radius,
        color: sourceOrb.color,
        alpha: 1.0,
        life: life,
        decay: decay,
        glowColor: sourceOrb.glowColor,
      };
      particlesRef.current.push(p);
    }
  };

  const spawnWallImpactParticles = (x: number, y: number, size: number, color: string) => {
    // Soft subtle sparks on boundaries
    if (Math.random() > 0.4) return;
    const p: Particle = {
      id: Math.random().toString(36).substr(2, 9),
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      radius: 1 + Math.random() * 2,
      color: color,
      alpha: 0.6,
      life: 1.0,
      decay: 0.05,
    };
    particlesRef.current.push(p);
  };

  const spawnSupernovaShockwave = (x: number, y: number) => {
    // Create ultimate flashing circles expansion
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 4 + Math.random() * 10;
      const p: Particle = {
        id: Math.random().toString(36).substr(2, 9),
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 3 + Math.random() * 6,
        color: "#38bdf8",
        alpha: 1.0,
        life: 1.0,
        decay: 0.015,
        glowColor: "rgba(56, 189, 248, 1)",
      };
      particlesRef.current.push(p);
    }

    // Push objects away from shockwave epicentre
    const objects = objectsRef.current;
    objects.forEach((obj) => {
      const dx = obj.x - x;
      const dy = obj.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 200 && dist > 0) {
        const force = (200 - dist) * 0.15;
        obj.vx += (dx / dist) * force;
        obj.vy += (dy / dist) * force - 2;
      }
    });

    gameAudio.playAchievement();
  };

  const floatingTextsRef = useRef<{ x: number; y: number; text: string; alpha: number; life: number }[]>([]);

  const spawnComboFloatingText = (x: number, y: number, comboVal: number) => {
    floatingTextsRef.current.push({
      x,
      y: y - 10,
      text: `${t.combo} x${comboVal + 1}`,
      alpha: 1.0,
      life: 1.0,
    });
  };

  const updateParticles = (dt: number) => {
    const particles = particlesRef.current;
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 0.05 * dt; // weak gravity on sparkles
      p.life -= p.decay * dt;
      p.alpha = Math.max(0, p.life);

      if (p.life <= 0) {
        particles.splice(i, 1);
      }
    }

    // Update floating texts too
    const ftexts = floatingTextsRef.current;
    for (let i = ftexts.length - 1; i >= 0; i--) {
      const ft = ftexts[i];
      ft.y -= 0.6 * dt; // float upwards
      ft.life -= 0.035 * dt;
      ft.alpha = Math.max(0, ft.life);
      if (ft.life <= 0) {
        ftexts.splice(i, 1);
      }
    }
  };

  // -------------------------------------------------------------
  // DANGER LINE & GAME OVER TIMER MONITOR
  // -------------------------------------------------------------
  const checkDangerLine = () => {
    const objects = objectsRef.current;
    let isCrossing = false;

    for (let i = 0; i < objects.length; i++) {
      const obj = objects[i];
      // An orb is crossing the danger line if its y - radius is above DANGER_LINE_Y (y - r < 110)
      // and it's settled (not freshly spawned - has existed for at least 1 second)
      if (obj.y - obj.radius < DANGER_LINE_Y && performance.now() - obj.creationTime > 1200) {
        isCrossing = true;
        break;
      }
    }

    if (isCrossing) {
      if (dangerTimerRef.current === null) {
        dangerTimerRef.current = performance.now();
      } else {
        const timeElapsed = performance.now() - dangerTimerRef.current;
        const remaining = Math.max(0, 3000 - timeElapsed);
        setDangerTimeLeft(Math.ceil(remaining / 1000));

        if (timeElapsed >= 3000) {
          // Trigger gameover!
          setGameState("gameover");
          gameAudio.playGameOver();
          dangerTimerRef.current = null;
          setDangerTimeLeft(null);
        }
      }
    } else {
      dangerTimerRef.current = null;
      setDangerTimeLeft(null);
    }
  };

  // -------------------------------------------------------------
  // CLICK & AIM DROP TRIGGERS
  // -------------------------------------------------------------
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (gameState !== "playing" || !canDropRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = LOGICAL_WIDTH / rect.width;
    const clientX = e.clientX - rect.left;
    let targetX = clientX * scaleX;

    // Clamp coordinates safely within the container play boundaries
    const currentOrbRadius = ORB_TIERS[currentOrbIndexRef.current].radius;
    const minX = LEFT_WALL + currentOrbRadius;
    const maxX = RIGHT_WALL - currentOrbRadius;
    targetX = Math.max(minX, Math.min(maxX, targetX));

    dropXRef.current = targetX;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (gameState !== "playing") return;

    // Update drop coordinate instantly
    handlePointerMove(e);

    // Perform Drop
    triggerDrop();
  };

  const triggerDrop = () => {
    if (!canDropRef.current || gameState !== "playing") return;

    canDropRef.current = false;
    gameAudio.playDrop();

    const activeIndex = currentOrbIndexRef.current;
    const activeRadius = ORB_TIERS[activeIndex].radius;

    // Create dropping physics body
    const dropObj: PhysicsObject = {
      id: Math.random().toString(36).substr(2, 9),
      typeIndex: activeIndex,
      x: dropXRef.current,
      y: SPAWN_Y,
      vx: 0,
      vy: 1.0, // initial speed downwards
      radius: activeRadius,
      isStatic: false,
      angle: 0,
      angularVelocity: 0,
      creationTime: performance.now(),
    };

    objectsRef.current.push(dropObj);

    // Rotate next queue
    currentOrbIndexRef.current = nextOrbIndexRef.current;
    nextOrbIndexRef.current = Math.floor(Math.random() * 4); // Only tiers 0-3
    setCurrentOrbIndex(currentOrbIndexRef.current);
    setNextOrbIndex(nextOrbIndexRef.current);

    // Visual drop line cooldown to avoid overlapping drops
    setTimeout(() => {
      canDropRef.current = true;
    }, 550);
  };

  // -------------------------------------------------------------
  // CANVAS RENDER ARTWORK
  // -------------------------------------------------------------
  const drawGame = (ctx: CanvasRenderingContext2D) => {
    // Clear backbuffer
    ctx.clearRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

    // Background panel fill
    ctx.fillStyle = "#0c0e14";
    ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

    // Beautiful Grid lines on the backdrop for tech-retro visual look
    ctx.strokeStyle = "rgba(43, 49, 74, 0.15)";
    ctx.lineWidth = 1;
    for (let x = LEFT_WALL; x <= RIGHT_WALL; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, DANGER_LINE_Y);
      ctx.lineTo(x, FLOOR);
      ctx.stroke();
    }
    for (let y = DANGER_LINE_Y; y <= FLOOR; y += 30) {
      ctx.beginPath();
      ctx.moveTo(LEFT_WALL, y);
      ctx.lineTo(RIGHT_WALL, y);
      ctx.stroke();
    }

    // Draw Aiming Guide Indicator Line
    if (gameState === "playing" && canDropRef.current) {
      const activeOrb = ORB_TIERS[currentOrbIndex];
      ctx.save();
      ctx.strokeStyle = `${activeOrb.color}35`; // 20% alpha matching drop orb color
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(dropXRef.current, SPAWN_Y);
      ctx.lineTo(dropXRef.current, FLOOR);
      ctx.stroke();
      ctx.restore();

      // Drop Preview Orb Outline
      ctx.save();
      ctx.beginPath();
      ctx.arc(dropXRef.current, SPAWN_Y, activeOrb.radius, 0, Math.PI * 2);
      ctx.fillStyle = `${activeOrb.color}15`;
      ctx.strokeStyle = activeOrb.color;
      ctx.lineWidth = 2;
      ctx.shadowColor = activeOrb.color;
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Draw settled physics objects (Cosmic Orbs)
    const objects = objectsRef.current;
    for (let i = 0; i < objects.length; i++) {
      const obj = objects[i];
      const tier = ORB_TIERS[obj.typeIndex];

      ctx.save();
      ctx.translate(obj.x, obj.y);
      ctx.rotate(obj.angle);

      // Draw Orb Glow
      ctx.shadowColor = tier.color;
      ctx.shadowBlur = Math.min(25, 4 + tier.id * 1.8);

      // Body circle fill
      ctx.beginPath();
      ctx.arc(0, 0, obj.radius, 0, Math.PI * 2);
      ctx.fillStyle = tier.color;
      ctx.fill();

      // Dynamic inner 3D glass gloss
      ctx.shadowBlur = 0; // disable shadow for interior shading
      ctx.beginPath();
      ctx.arc(0, 0, obj.radius, 0, Math.PI * 2);
      const gradient = ctx.createRadialGradient(
        -obj.radius * 0.3,
        -obj.radius * 0.3,
        obj.radius * 0.1,
        0,
        0,
        obj.radius
      );
      gradient.addColorStop(0, "rgba(255, 255, 255, 0.45)");
      gradient.addColorStop(0.3, "rgba(255, 255, 255, 0.05)");
      gradient.addColorStop(1, "rgba(0, 0, 0, 0.45)");
      ctx.fillStyle = gradient;
      ctx.fill();

      // Cosmic details / rotation mark inside orb
      ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
      ctx.lineWidth = Math.max(1, obj.radius * 0.05);
      ctx.beginPath();
      ctx.arc(0, 0, obj.radius * 0.55, -Math.PI / 4, Math.PI * 0.75);
      ctx.stroke();

      // Orbiting dot inside to visualize rotation
      ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
      ctx.beginPath();
      ctx.arc(obj.radius * 0.5, 0, Math.max(1.5, obj.radius * 0.075), 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    // Draw active particle systems
    const particles = particlesRef.current;
    ctx.save();
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      ctx.globalAlpha = p.alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      if (p.glowColor) {
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 12;
      }
      ctx.fill();
      ctx.shadowBlur = 0; // reset
    }
    ctx.restore();

    // Draw combo floating text multipliers
    const ftexts = floatingTextsRef.current;
    ctx.save();
    ctx.font = "bold 13px 'Fira Code', monospace";
    ctx.textAlign = "center";
    for (let i = 0; i < ftexts.length; i++) {
      const ft = ftexts[i];
      ctx.globalAlpha = ft.alpha;
      ctx.fillStyle = "#fbbf24"; // yellow-400
      ctx.shadowColor = "rgba(251, 191, 36, 0.4)";
      ctx.shadowBlur = 6;
      ctx.fillText(ft.text, ft.x, ft.y);
    }
    ctx.restore();

    // Draw Glass Container Walls
    ctx.save();
    ctx.strokeStyle = "#242a42";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";

    // Play container body box outline
    ctx.beginPath();
    ctx.moveTo(LEFT_WALL, DANGER_LINE_Y - 15);
    ctx.lineTo(LEFT_WALL, FLOOR);
    ctx.lineTo(RIGHT_WALL, FLOOR);
    ctx.lineTo(RIGHT_WALL, DANGER_LINE_Y - 15);
    ctx.stroke();

    // Side Neon Tube decorations (glowing glass tubes)
    ctx.strokeStyle = "rgba(129, 140, 248, 0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(LEFT_WALL - 5, DANGER_LINE_Y);
    ctx.lineTo(LEFT_WALL - 5, FLOOR + 5);
    ctx.lineTo(RIGHT_WALL + 5, FLOOR + 5);
    ctx.lineTo(RIGHT_WALL + 5, DANGER_LINE_Y);
    ctx.stroke();
    ctx.restore();

    // Draw Danger Line (Glowing pulsating red line)
    if (gameState === "playing") {
      ctx.save();
      const pulse = 0.45 + Math.sin(performance.now() * 0.007) * 0.3;
      ctx.strokeStyle = `rgba(239, 68, 68, ${pulse})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(LEFT_WALL, DANGER_LINE_Y);
      ctx.lineTo(RIGHT_WALL, DANGER_LINE_Y);
      ctx.stroke();

      // Draw "DANGER" flashing overlay if timer active
      if (dangerTimeLeft !== null) {
        ctx.fillStyle = `rgba(239, 68, 68, ${pulse * 0.15})`;
        ctx.fillRect(LEFT_WALL, DANGER_LINE_Y, RIGHT_WALL - LEFT_WALL, FLOOR - DANGER_LINE_Y);

        ctx.fillStyle = "rgba(239, 68, 68, 0.95)";
        ctx.font = "bold 15px 'Space Grotesk', system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.shadowColor = "rgba(239, 68, 68, 0.7)";
        ctx.shadowBlur = 8;
        ctx.fillText(`${t.danger} ${dangerTimeLeft}s`, LOGICAL_WIDTH / 2, DANGER_LINE_Y + 25);
      }
      ctx.restore();
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-[380px] mx-auto select-none">
      {/* Sound & Controls HUD Bar */}
      <div id="controls-hud" className="w-full flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-1.5">
          <button
            id="sound-toggle-btn"
            onClick={toggleMute}
            className={`p-2.5 rounded-xl border transition-all duration-300 ${
              isMuted
                ? "bg-red-500/10 border-red-500/25 text-red-400 hover:bg-red-500/20"
                : "bg-slate-900/40 border-[#232736] text-indigo-400 hover:border-indigo-500/40"
            }`}
            title={isMuted ? t.soundOff : t.soundOn}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {gameState === "playing" && (
            <button
              id="hud-reset-game-btn"
              onClick={() => {
                if (window.confirm(language === "en" ? "Restart current game?" : "क्या आप वर्तमान खेल फिर से शुरू करना चाहते हैं?")) {
                  onRestart();
                }
              }}
              className="p-2.5 rounded-xl border bg-[#11131a] hover:bg-[#1b1e2b] border-[#232736] text-amber-400 hover:border-amber-500/40 hover:bg-amber-500/10 transition-all duration-300 active:scale-95"
              title={t.restart}
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Next Orb Preview Pane */}
        {gameState === "playing" && (
          <div id="next-orb-hud" className="flex items-center gap-2 bg-[#11131a] border border-[#232736] rounded-xl px-3.5 py-1.5 shadow-md">
            <span className="text-[10px] font-bold tracking-widest text-gray-500 uppercase">{t.next}</span>
            <div className="flex items-center gap-1.5">
              <div
                id="next-orb-color-dot"
                className="w-3.5 h-3.5 rounded-full shadow-sm relative"
                style={{
                  backgroundColor: ORB_TIERS[nextOrbIndex].color,
                  boxShadow: `0 0 6px ${ORB_TIERS[nextOrbIndex].color}`,
                }}
              >
                <div className="absolute inset-0.5 rounded-full bg-white/20"></div>
              </div>
              <span id="next-orb-name-label" className="text-xs font-semibold text-gray-200">
                {language === "en" ? ORB_TIERS[nextOrbIndex].nameEn : ORB_TIERS[nextOrbIndex].nameHi}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Main Responsive Canvas Container Box */}
      <div
        id="canvas-container"
        ref={containerRef}
        className="w-full aspect-[2/3] bg-[#0c0e14] rounded-2xl overflow-hidden relative border border-[#232736] shadow-[0_12px_40px_rgba(0,0,0,0.5)] touch-none cursor-crosshair"
      >
        <canvas
          id="neon-merge-canvas"
          ref={canvasRef}
          onPointerMove={handlePointerMove}
          onPointerDown={handlePointerDown}
          className="block w-full h-full"
        />

        {/* Overlay states: Start/Restart screens */}
        {gameState === "idle" && (
          <div id="state-overlay-idle" className="absolute inset-0 bg-[#090a0f]/95 flex flex-col items-center justify-center p-6 text-center backdrop-blur-md">
            <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
              <div className="w-56 h-56 bg-indigo-500 rounded-full blur-3xl"></div>
            </div>

            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 mb-5 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-full bg-white/10 skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              <Play className="w-8 h-8 text-white fill-white ml-1" />
            </div>

            <h2 className="text-2xl font-extrabold tracking-tight text-white mb-2 font-sans bg-gradient-to-r from-white via-indigo-200 to-indigo-400 bg-clip-text text-transparent">
              {t.title}
            </h2>
            <p className="text-gray-400 text-xs max-w-xs mb-6 font-mono leading-relaxed">
              {t.subtitle}
            </p>

            <button
              id="start-game-btn"
              onClick={onRestart}
              className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-sm px-7 py-3.5 rounded-xl transition-all duration-300 shadow-md shadow-indigo-500/25 hover:shadow-indigo-500/40 active:scale-95 flex items-center gap-2"
            >
              <Play className="w-4 h-4 fill-white" />
              {t.start}
            </button>
          </div>
        )}

        {gameState === "gameover" && (
          <div id="state-overlay-gameover" className="absolute inset-0 bg-[#090a0f]/95 flex flex-col items-center justify-center p-6 text-center backdrop-blur-md">
            <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/35 flex items-center justify-center shadow-lg mb-5 animate-pulse">
              <Award className="w-8 h-8 text-red-500" />
            </div>

            <h2 className="text-2xl font-extrabold tracking-tight text-red-500 mb-2 font-sans">
              {t.gameOver}
            </h2>
            <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-3.5 mb-6 w-full max-w-xs">
              <div className="text-gray-500 text-[10px] font-bold tracking-widest uppercase mb-1">{t.score}</div>
              <div className="text-3xl font-mono font-extrabold text-white">{score}</div>
            </div>

            <button
              id="restart-game-btn"
              onClick={onRestart}
              className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-sm px-6 py-3.5 rounded-xl transition-all duration-300 shadow-md active:scale-95 flex items-center gap-2 mx-auto"
            >
              <RotateCcw className="w-4 h-4" />
              {t.restart}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
