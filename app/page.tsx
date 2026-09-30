
"use client";
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

export default function Home() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    gsap.registerPlugin(ScrollTrigger);

    // 1. Initialize Lenis for smooth scrolling
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });
    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // Wait for the intro sequence to finish before allowing scroll
    lenis.stop();

    // ==========================================
    // PORTED VANILLA JS FOR INTRO
    // ==========================================
    const overlay     = document.getElementById('intro-overlay');
    const robotFlyer  = document.getElementById('robot-flyer');
    const robotBody   = document.getElementById('robot-body');
    const robotImg    = document.getElementById('robot-img');
    const eyeGlow     = document.getElementById('eye-glow');
    const speechPanel = document.getElementById('speech-panel');
    const speechText  = document.getElementById('speech-text');

    // ── 1. STAR FIELD ──
    function initRealisticStars() {
        const starCanvas = document.getElementById('star-canvas') as HTMLCanvasElement;
        if (!starCanvas) return;
        const ctx = starCanvas.getContext('2d');
        if(!ctx) return;
        let w = window.innerWidth, h = window.innerHeight;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        
        starCanvas.width = w * dpr;
        starCanvas.height = h * dpr;
        ctx.scale(dpr, dpr);

        const stars = Array.from({length: 400}, () => ({
            x: Math.random() * w,
            y: Math.random() * h,
            r: Math.random() * 1.5 + 0.1,
            speed: Math.random() * 0.2 + 0.05,
            alpha: Math.random(),
            color: `hsl(${Math.random()*60 + 200}, 80%, 90%)` // slight blue-ish twinkle
        }));

        function drawStars() {
            ctx!.clearRect(0, 0, w, h);
            stars.forEach(s => {
                s.y -= s.speed; // moving up slowly
                s.alpha += (Math.random() - 0.5) * 0.05;
                s.alpha = Math.max(0.1, Math.min(0.9, s.alpha));
                
                if (s.y < 0) s.y = h;
                
                ctx!.beginPath();
                ctx!.arc(s.x, s.y, s.r, 0, Math.PI*2);
                ctx!.fillStyle = s.color;
                ctx!.globalAlpha = s.alpha;
                ctx!.fill();
            });
            requestAnimationFrame(drawStars);
        }
        drawStars();
        
        window.addEventListener('resize', () => {
            w = window.innerWidth; h = window.innerHeight;
            starCanvas.width = w * dpr; starCanvas.height = h * dpr;
            ctx!.scale(dpr, dpr);
        });
    }
    initRealisticStars();

    // ── 2. CLEAN ROBOT IMAGE ──
    function cleanRobotImage() {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const c = document.createElement('canvas');
                const ctx = c.getContext('2d');
                if(!ctx) return resolve(null);
                const W = img.naturalWidth, H = img.naturalHeight;
                c.width = W; c.height = H;
                ctx.drawImage(img, 0, 0);

                const id = ctx.getImageData(0, 0, W, H);
                const d = id.data;
                const visited = new Uint8Array(W * H);
                const queue: number[] = [];

                function isBackground(idx: number) {
                    const i = idx * 4;
                    const r = d[i], g = d[i+1], b = d[i+2], a = d[i+3];
                    if (a < 10) return true;
                    return r < 20 && g < 20 && b < 20; 
                }

                for (let x = 0; x < W; x++) { queue.push(x); queue.push((H - 1) * W + x); }
                for (let y = 0; y < H; y++) { queue.push(y * W); queue.push(y * W + (W - 1)); }

                let head = 0;
                while (head < queue.length) {
                    const idx = queue[head++];
                    if (idx < 0 || idx >= W * H || visited[idx]) continue;
                    if (!isBackground(idx)) continue;
                    
                    visited[idx] = 1;
                    d[idx * 4 + 3] = 0; 
                    const x = idx % W, y = (idx / W) | 0;
                    if (x > 0)     queue.push(idx - 1);
                    if (x < W - 1) queue.push(idx + 1);
                    if (y > 0)     queue.push(idx - W);
                    if (y < H - 1) queue.push(idx + W);
                }

                for (let y = 1; y < H - 1; y++) {
                    for (let x = 1; x < W - 1; x++) {
                        const idx = y * W + x;
                        if (visited[idx]) continue;
                        let tn = 0;
                        if (visited[idx - 1]) tn++;
                        if (visited[idx + 1]) tn++;
                        if (visited[idx - W]) tn++;
                        if (visited[idx + W]) tn++;
                        if (tn > 0 && tn < 4) {
                            d[idx * 4 + 3] = Math.max(0, d[idx * 4 + 3] - tn * 50);
                        }
                    }
                }

                ctx.putImageData(id, 0, 0);
                const dataUrl = c.toDataURL('image/png');
                if(robotImg) (robotImg as HTMLImageElement).src = dataUrl;
                
                resolve(null);
            };
            img.onerror = resolve;
            img.src = '/cute-robot.jpg';
        });
    }

    // ── 3. FLYING ANIMATION ──
    function animateFlight(duration: number) {
        return new Promise((resolve) => {
            const start = performance.now();
            const w = window.innerWidth;
            const h = window.innerHeight;
            
            const p0 = { x: -w * 1.5, y: h * 0.4 }; 
            const p1 = { x: w * 0.5, y: h * 0.9 };
            const p2 = { x: -w * 0.6, y: -h * 0.9 };
            const p3 = { x: 0, y: 0 };

            function tick(now: number) {
                const elapsed = now - start;
                let t = Math.min(elapsed / duration, 1);
                
                const eased = 1 - Math.pow(1 - t, 3);
                const mt = 1 - eased;
                
                const currentX = mt*mt*mt*p0.x + 3*mt*mt*eased*p1.x + 3*mt*eased*eased*p2.x + eased*eased*eased*p3.x;
                const currentY = mt*mt*mt*p0.y + 3*mt*mt*eased*p1.y + 3*mt*eased*eased*p2.y + eased*eased*eased*p3.y;
                
                const nextEased = Math.min(eased + 0.01, 1);
                const nextMt = 1 - nextEased;
                const nextX = nextMt*nextMt*nextMt*p0.x + 3*nextMt*nextMt*nextEased*p1.x + 3*nextMt*nextEased*nextEased*p2.x + nextEased*nextEased*nextEased*p3.x;
                const dx = nextX - currentX;
                const tilt = Math.min(Math.max(dx * 0.8, -15), 45);

                if (robotFlyer) {
                    robotFlyer.style.transform = `translate(${currentX}px, calc(-50% + ${currentY}px)) rotate(${tilt}deg)`;
                }
                
                if (t < 1) {
                    requestAnimationFrame(tick);
                } else {
                    if (robotFlyer) {
                        robotFlyer.style.transform = `translate(0px, -50%) rotate(0deg)`;
                    }
                    resolve(null);
                }
            }
            requestAnimationFrame(tick);
        });
    }

    // ── 4. TYPING TEXT ──
    function typeText(text: string) {
        return new Promise((resolve) => {
            const el = document.getElementById('speech-text');
            const panel = document.getElementById('speech-panel');
            if(!el || !panel) return resolve(null);
            panel.classList.add('visible');
            el.innerHTML = '';
            let i = 0;
            const interval = setInterval(() => {
                el.innerHTML += text.charAt(i);
                i++;
                if (i >= text.length) {
                    clearInterval(interval);
                    resolve(null);
                }
            }, 35);
        });
    }

    function speak(text: string) {
        if (!window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.2;
        window.speechSynthesis.speak(utterance);
    }

    // ── 5. SCROLL LANDING SETUP (Runs only AFTER intro finishes) ──
    function initScrollLanding() {
        const zoomTrigger = document.getElementById('zoom-trigger');
        const robotFlyer = document.getElementById('robot-flyer');
        const speechPanel = document.getElementById('speech-panel');
        const robotFire = document.getElementById('robot-fire');

        if (!zoomTrigger || !robotFlyer) return;

        ScrollTrigger.refresh();

        const glassNav = document.getElementById('glassNav');
        const spaceBg = document.getElementById('space-bg');
        const hamburger = document.getElementById('hamburger');
        const mobileMenu = document.getElementById('mobileMenu');

        // Mobile menu toggle
        hamburger?.addEventListener('click', () => {
            hamburger.classList.toggle('open');
            mobileMenu?.classList.toggle('open');
        });

        mobileMenu?.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                hamburger?.classList.remove('open');
                mobileMenu?.classList.remove('open');
            });
        });

        // Space background turns stable on scroll
        lenis.on('scroll', ({ scroll }: { scroll: number }) => {
            if (scroll > 15) {
                spaceBg?.classList.add('stable');
            } else {
                spaceBg?.classList.remove('stable');
            }
        });

        const tl = gsap.timeline({
            scrollTrigger: {
                trigger: zoomTrigger,
                start: "top top",
                end: "bottom bottom",
                scrub: 1.2,
                invalidateOnRefresh: true,
                onUpdate: (self) => {
                    // Space background stable during active scroll
                    if (self.progress > 0.01) {
                        spaceBg?.classList.add('stable');
                    } else {
                        spaceBg?.classList.remove('stable');
                    }

                    // Navbar appears when user reaches About (progress >= 0.30)
                    if (self.progress >= 0.30) {
                        glassNav?.classList.add('visible');
                    } else {
                        glassNav?.classList.remove('visible');
                    }

                    // Dynamic speech panel content
                    if (self.progress >= 0.28) {
                        if (speechText && speechText.textContent !== "Ask me anything about Mallikarjuna Rao") {
                            speechText.textContent = "Ask me anything about Mallikarjuna Rao";
                        }
                    } else if (self.progress <= 0.05) {
                        if (speechText && speechText.textContent !== "Welcome to Mallikarjuna Rao's Portfolio. Scroll down to enter.") {
                            speechText.textContent = "Welcome to Mallikarjuna Rao's Portfolio. Scroll down to enter.";
                        }
                    }
                }
            }
        });

        // ══════════════════════════════════════════════════════════════
        // STAGE 1 (0.00 -> 0.40): Space Intro -> Lands in About Page
        // ══════════════════════════════════════════════════════════════
        tl.to(robotFlyer, {
            x: () => {
                const w = window.innerWidth;
                if (w < 992) return w * 0.10;
                const targetX = w * 0.81;
                const baseX = w * 0.78;
                return targetX - baseX;
            },
            y: () => {
                const h = window.innerHeight;
                if (window.innerWidth < 992) return h * 0.36;
                return 0; // Centered vertically in About section right side
            },
            yPercent: -50,
            scale: () => {
                if (window.innerWidth < 640) return 0.72;
                if (window.innerWidth < 992) return 0.85;
                if (window.innerWidth < 1280) return 1.10;
                return 1.20; // Prominent, sleek companion in About page
            },
            rotation: 0,
            duration: 0.40,
            ease: "power1.inOut"
        }, 0);

        if (speechPanel) {
            gsap.set(speechPanel, { x: 0, y: 0, scale: 1 });

            // Fades out briefly as robot leaves intro position
            tl.to(speechPanel, {
                opacity: 0,
                duration: 0.12,
                ease: "power1.out"
            }, 0);

            // Reveals in About page in North-West position
            tl.to(speechPanel, {
                opacity: 1,
                scale: 1,
                duration: 0.22,
                ease: "power2.out"
            }, 0.32);
        }

        if (robotFire) {
            tl.to(robotFire, {
                opacity: 0.45,
                scale: 0.70,
                duration: 0.35,
                ease: "power1.out"
            }, 0);
        }

        // About Card reveal
        const aboutCard = document.querySelector('.about-card');
        if (aboutCard) {
            tl.fromTo(aboutCard, 
                { opacity: 0, y: 40, scale: 0.97 },
                {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    duration: 0.35,
                    ease: "power2.out"
                },
                0.32
            );
        }

        // ══════════════════════════════════════════════════════════════
        // STAGE 2 (0.65 -> 0.95): Scrolling past About -> Docks at Right Corner
        // ══════════════════════════════════════════════════════════════
        tl.to(robotFlyer, {
            x: () => {
                const w = window.innerWidth;
                if (w < 640) {
                    const baseX = w * 0.50 + 46;
                    const targetCenterX = w - 38;
                    return targetCenterX - baseX;
                } else if (w < 992) {
                    const baseX = w * 0.50 + 57.5;
                    const targetCenterX = w - 48;
                    return targetCenterX - baseX;
                } else {
                    const baseX = w * 0.78 + 70;
                    const targetCenterX = w - 62;
                    return targetCenterX - baseX;
                }
            },
            y: () => {
                const h = window.innerHeight;
                if (window.innerWidth < 640) {
                    return h * 0.50 - 40;
                } else if (window.innerWidth < 992) {
                    return h * 0.50 - 50;
                } else {
                    return h * 0.50 - 64;
                }
            },
            scale: () => {
                if (window.innerWidth < 640) return 0.42;
                if (window.innerWidth < 992) return 0.46;
                return 0.52; // Small, cute companion docked at bottom-right corner
            },
            duration: 0.30,
            ease: "power1.inOut"
        }, 0.65);

        if (speechPanel) {
            // As robot goes down to the corner, the speech box disappears
            tl.to(speechPanel, {
                opacity: 0,
                scale: 0.85,
                pointerEvents: "none",
                duration: 0.20,
                ease: "power1.out"
            }, 0.65);
        }

        if (robotFire) {
            tl.to(robotFire, {
                opacity: 0.28,
                scale: 0.38,
                duration: 0.28,
                ease: "power1.out"
            }, 0.65);
        }

        // Robot click interaction
        let cornerSpeechTimeout: ReturnType<typeof setTimeout> | null = null;
        robotFlyer?.addEventListener('click', () => {
            robotFlyer.classList.add('nodding', 'eyes-pulse');
            speak("Ask me anything about Mallikarjuna Rao");
            if (speechText) {
                speechText.textContent = "Ask me anything about Mallikarjuna Rao";
            }
            if (speechPanel) {
                gsap.to(speechPanel, { opacity: 1, scale: 1.25, pointerEvents: "auto", duration: 0.3 });
                speechPanel.classList.add('visible');

                // If robot is docked down in the corner, auto-hide the speech box after 3 seconds
                if (tl.progress() >= 0.65) {
                    if (cornerSpeechTimeout) clearTimeout(cornerSpeechTimeout);
                    cornerSpeechTimeout = setTimeout(() => {
                        gsap.to(speechPanel, { opacity: 0, pointerEvents: "none", duration: 0.4 });
                    }, 3200);
                }
            }
            setTimeout(() => {
                robotFlyer.classList.remove('nodding', 'eyes-pulse');
            }, 1200);
        });

        // Smooth scroll for nav links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                const href = anchor.getAttribute('href');
                if (href && href.startsWith('#')) {
                    const target = document.querySelector(href);
                    if (target) {
                        e.preventDefault();
                        lenis.scrollTo(target as HTMLElement, { offset: 0, duration: 1.2 });
                    }
                }
            });
        });
    }

    // ── 6. TECHNICAL UNIVERSE (Living Animated Triangular Asteroid Engine) ──
    function initTechnicalUniverse() {
        const container = document.getElementById('universePicContainer');
        const frame = document.getElementById('universePicFrame');
        const stage = document.getElementById('orbitStage');

        if (!container || !frame || !stage) return () => {};

        const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        // ── Asteroids Data & Triangular Orbital Mechanics ──
        interface AsteroidItem {
            el: HTMLElement;
            mesh: HTMLElement | null;
            orbitIndex: number;      // 0 to 8
            meshRot: number;
            meshRotSpeed: number;    // deg per sec
            floatPhaseX: number;
            floatPhaseY: number;
            floatPhaseTilt: number;
            floatAmpX: number;
            floatAmpY: number;
            currentX: number;
            currentY: number;
            isHovered: boolean;
            isActive: boolean;
        }

        const asteroidEls = Array.from(document.querySelectorAll('.skill-asteroid')) as HTMLElement[];

        // Triangle Dimensions (Spacious Equilateral Delta Geometry)
        // Triangle height: 450px, Side length: 519.6px, Base width: 519.6px
        // Occupies ~60% of viewport area with generous spacing (~173px between each asteroid)
        const triangleHeight = 450;
        const sideLength = (2 / Math.sqrt(3)) * triangleHeight; // 519.615px
        const halfWidth = sideLength / 2; // 259.81px
        const yOffset = -8; // Slight upward bias for bottom label breathing room

        const V = [
            { x: 0, y: -triangleHeight / 2 },          // Top Apex
            { x: halfWidth, y: triangleHeight / 2 },   // Bottom Right Corner
            { x: -halfWidth, y: triangleHeight / 2 }   // Bottom Left Corner
        ];

        const L0 = Math.hypot(V[1].x - V[0].x, V[1].y - V[0].y);
        const L1 = Math.hypot(V[2].x - V[1].x, V[2].y - V[1].y);
        const L2 = Math.hypot(V[0].x - V[2].x, V[0].y - V[2].y);
        const perimeter = L0 + L1 + L2;
        const cum = [0, L0, L0 + L1, perimeter];
        const cornerR = 26; // Filleted corner for smooth continuous trajectory

        function getTrianglePoint(distAlong: number) {
            let d = ((distAlong % perimeter) + perimeter) % perimeter;
            const vertDists = [0, cum[1], cum[2]];

            for (let vi = 0; vi < 3; vi++) {
                const vd = vertDists[vi];
                let diff = d - vd;
                if (vi === 0 && d > perimeter / 2) diff = d - perimeter;

                if (Math.abs(diff) <= cornerR) {
                    const prevV = V[(vi + 2) % 3];
                    const currV = V[vi];
                    const nextV = V[(vi + 1) % 3];

                    const dIn = Math.hypot(currV.x - prevV.x, currV.y - prevV.y);
                    const dOut = Math.hypot(nextV.x - currV.x, nextV.y - currV.y);

                    const uInX = (currV.x - prevV.x) / dIn;
                    const uInY = (currV.y - prevV.y) / dIn;
                    const uOutX = (nextV.x - currV.x) / dOut;
                    const uOutY = (nextV.y - currV.y) / dOut;

                    const pStartX = currV.x - uInX * cornerR;
                    const pStartY = currV.y - uInY * cornerR;
                    const pEndX = currV.x + uOutX * cornerR;
                    const pEndY = currV.y + uOutY * cornerR;

                    const u = (diff + cornerR) / (2.0 * cornerR);
                    const invU = 1 - u;

                    return {
                        x: invU * invU * pStartX + 2 * invU * u * currV.x + u * u * pEndX,
                        y: invU * invU * pStartY + 2 * invU * u * currV.y + u * u * pEndY
                    };
                }
            }

            for (let i = 0; i < 3; i++) {
                if (d >= cum[i] && d <= cum[i + 1]) {
                    const frac = (d - cum[i]) / (cum[i + 1] - cum[i]);
                    const pA = V[i];
                    const pB = V[(i + 1) % 3];
                    return {
                        x: pA.x + (pB.x - pA.x) * frac,
                        y: pA.y + (pB.y - pA.y) * frac
                    };
                }
            }

            return { x: V[0].x, y: V[0].y };
        }

        const asteroids: AsteroidItem[] = asteroidEls.map((el, i) => {
            // Self-rotation speed: slow 60s to 105s tumbling per full 360deg
            const rotDuration = 60 + (i % 4) * 15;
            const rotDir = (i % 2 === 0) ? 1 : -1;
            const meshRotSpeed = (360 / rotDuration) * rotDir;

            return {
                el,
                mesh: el.querySelector('.asteroid-mesh'),
                orbitIndex: i,
                meshRot: (i * 40) % 360,
                meshRotSpeed,
                floatPhaseX: Math.random() * Math.PI * 2,
                floatPhaseY: Math.random() * Math.PI * 2,
                floatPhaseTilt: Math.random() * Math.PI * 2,
                floatAmpX: 1.2 + (i % 3) * 0.4,
                floatAmpY: 1.5 + (i % 3) * 0.5,
                currentX: 0,
                currentY: 0,
                isHovered: false,
                isActive: false
            };
        });

        let activeAsteroid: AsteroidItem | null = null;
        let isAnyHovered = false;

        // Base speeds:
        // Circuit speed: 18.0px per second (~86s per full triangle circuit)
        const baseCircuitSpeed = 18.0;
        let currentCircuitSpeed = baseCircuitSpeed;
        let globalCircuitDist = 0;

        asteroids.forEach(item => {
            const el = item.el;
            el.addEventListener('mouseenter', () => {
                item.isHovered = true;
                isAnyHovered = true;
            });

            el.addEventListener('mouseleave', () => {
                item.isHovered = false;
                isAnyHovered = asteroids.some(a => a.isHovered);
            });

            el.addEventListener('click', (e) => {
                e.stopPropagation();
                if (item.isActive) {
                    item.isActive = false;
                    el.classList.remove('active');
                    activeAsteroid = null;
                } else {
                    asteroids.forEach(other => {
                        other.isActive = false;
                        other.el.classList.remove('active');
                    });
                    item.isActive = true;
                    el.classList.add('active');
                    activeAsteroid = item;
                }
            });

            el.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    el.click();
                }
            });
        });

        // Click outside dismisses active asteroid
        const handleDocClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest('.skill-asteroid')) {
                if (activeAsteroid) {
                    activeAsteroid.isActive = false;
                    activeAsteroid.el.classList.remove('active');
                    activeAsteroid = null;
                }
            }
        };
        document.addEventListener('click', handleDocClick);

        // 3D perspective mouse tilt
        const handleMouseMove = (e: MouseEvent) => {
            const rect = container.getBoundingClientRect();
            const normX = (e.clientX - rect.left) / rect.width - 0.5;
            const normY = (e.clientY - rect.top) / rect.height - 0.5;
            gsap.to(stage, {
                rotateY: normX * 8,
                rotateX: -normY * 8,
                duration: 0.6,
                ease: "power1.out"
            });
        };

        const handleMouseLeave = () => {
            gsap.to(stage, {
                rotateY: 0,
                rotateX: 0,
                duration: 1.0,
                ease: "power2.out"
            });
        };

        container.addEventListener('mousemove', handleMouseMove);
        container.addEventListener('mouseleave', handleMouseLeave);

        // Responsive orbit scale calculation to occupy ~60% of viewport
        const getScale = () => {
            const w = frame.clientWidth;
            const h = frame.clientHeight;
            const scaleX = (w * 0.90) / 680;
            const scaleY = (h * 0.88) / 510;
            const scale = Math.min(scaleX, scaleY);
            return Math.max(0.46, Math.min(1.05, scale));
        };

        // ── 3. Unified Animation Loop ──
        let animFrameId: number;
        let lastTime = performance.now();

        const render = (time: number) => {
            const dt = Math.min((time - lastTime) / 1000, 0.1); // in seconds
            lastTime = time;

            // Smooth speed deceleration on hover / active
            const targetCircuit = (isAnyHovered || activeAsteroid) ? baseCircuitSpeed * 0.15 : baseCircuitSpeed;
            currentCircuitSpeed += (targetCircuit - currentCircuitSpeed) * (dt * 5);

            if (!prefersReducedMotion) {
                globalCircuitDist = (globalCircuitDist + currentCircuitSpeed * dt) % perimeter;
            }

            const currentScaleFactor = getScale();
            const stepDist = perimeter / 9.0;
            const tSec = time * 0.001;

            asteroids.forEach(item => {
                if (!prefersReducedMotion) {
                    item.meshRot = (item.meshRot + item.meshRotSpeed * dt) % 360;
                }

                // 1. Position along equilateral triangle perimeter
                const d = (item.orbitIndex * stepDist + globalCircuitDist) % perimeter;
                const pt = getTrianglePoint(d);

                // 2. Scale to responsive viewport with center offset
                const bx = pt.x * currentScaleFactor;
                const by = (pt.y + yOffset) * currentScaleFactor;

                // 3. Subtle organic floating micro-drift
                const fx = item.floatAmpX * Math.sin(tSec * 1.0 + item.floatPhaseX);
                const fy = item.floatAmpY * Math.cos(tSec * 1.2 + item.floatPhaseY);
                const tilt = 3 * Math.sin(tSec * 1.0 + item.floatPhaseTilt);

                item.currentX = bx + fx;
                item.currentY = by + fy;

                // Pseudo-3D Depth based on Y position
                const depth = Math.max(0, Math.min(1, ((pt.y + triangleHeight / 2) / triangleHeight)));
                const baseScale = 0.88 + depth * 0.16;
                const scale = (item.isHovered || item.isActive) ? baseScale * 1.15 : baseScale;
                const opacity = (item.isHovered || item.isActive) ? 1.0 : (0.80 + depth * 0.20);
                const zIndex = (item.isHovered || item.isActive) ? 150 : (pt.y >= 0 ? 35 : 12);

                // Apply asteroid position and scale
                item.el.style.transform = `translate3d(calc(-50% + ${item.currentX.toFixed(2)}px), calc(-50% + ${item.currentY.toFixed(2)}px), 0px) scale(${scale.toFixed(3)})`;
                item.el.style.opacity = opacity.toFixed(3);
                item.el.style.zIndex = zIndex.toString();

                // Rotate ONLY the mesh rock (keeps label perfectly upright!)
                if (item.mesh) {
                    item.mesh.style.transform = `rotate(${item.meshRot.toFixed(1)}deg) rotateZ(${tilt.toFixed(1)}deg)`;
                }

                // Tooltip auto-flip if in upper half
                const tooltip = item.el.querySelector('.asteroid-tooltip');
                if (tooltip) {
                    tooltip.classList.toggle('tooltip-down', pt.y < -30);
                }
            });

            animFrameId = requestAnimationFrame(render);
        };

        animFrameId = requestAnimationFrame(render);

        // ── 4. Section Entry Sequence & Parallax (GSAP ScrollTrigger) ──
        const headerEl = document.getElementById('universeHeader');
        const allAsteroids = document.querySelectorAll('.skill-asteroid');

        const entryTl = gsap.timeline({
            scrollTrigger: {
                trigger: "#skills",
                start: "top 75%",
                toggleActions: "play none none reverse"
            }
        });

        // 0.2s: Title fades/slides upward
        if (headerEl) {
            entryTl.fromTo(headerEl,
                { opacity: 0, y: 22 },
                { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" },
                0.2
            );
        }

        // 0.5s: 9 skill asteroids appear in triangular cascade
        if (allAsteroids.length > 0) {
            entryTl.fromTo(allAsteroids,
                { scale: 0.3, opacity: 0 },
                { scale: 1, opacity: 1, stagger: 0.08, duration: 0.7, ease: "back.out(1.2)" },
                0.45
            );
        }

        // Scroll Parallax on Orbit Stage
        gsap.to(stage, {
            y: 10,
            ease: "none",
            scrollTrigger: {
                trigger: "#skills",
                start: "top bottom",
                end: "bottom top",
                scrub: 1
            }
        });

        return () => {
            cancelAnimationFrame(animFrameId);
            document.removeEventListener('click', handleDocClick);
            container.removeEventListener('mousemove', handleMouseMove);
            container.removeEventListener('mouseleave', handleMouseLeave);
        };
    }

    // ── START SEQUENCE ──
    async function startIntroSequence() {
        if (!overlay) return;

        // Ensure page starts at top
        window.scrollTo(0, 0);
        document.body.style.overflow = 'hidden';

        await cleanRobotImage();
        
        await new Promise(r => setTimeout(r, 600));

        robotFlyer?.classList.add('flying');
        await animateFlight(2500); 
        robotFlyer?.classList.remove('flying');
        robotFlyer?.classList.add('floating');

        await new Promise(r => setTimeout(r, 500));

        // Display welcome speech panel
        if (speechText) speechText.innerHTML = '';
        speechPanel?.classList.add('visible');

        await new Promise(r => setTimeout(r, 200));

        const text = "Welcome to Mallikarjuna Rao's Portfolio. Scroll down to enter.";
        
        speak(text);
        
        robotFlyer?.classList.add('speaking', 'eyes-pulse');
        
        await typeText(text);

        robotFlyer?.classList.remove('speaking', 'eyes-pulse');

        // Intro is completely finished: unlock scroll and activate landing animation
        document.body.style.overflow = '';
        lenis.start();

        initScrollLanding();
    }
    
    startIntroSequence();
    const cleanupUniverse = initTechnicalUniverse();

    const handleResize = () => {
      ScrollTrigger.refresh();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cleanupUniverse?.();
      lenis.destroy();
      ScrollTrigger.getAll().forEach(t => t.kill());
    };
  }, []);

  return (
    <div dangerouslySetInnerHTML={{ __html: `
    <!-- ===== GLASSMORPHISM NAVBAR ===== -->
    <nav class="glass-nav font-body" id="glassNav" aria-label="Main Navigation">
        <div class="nav-pmr font-heading" id="navPmr" aria-label="PMR Logo">PMR</div>
        <ul class="nav-links" id="navLinks">
            <li><a href="#about" data-section="about">About</a></li>
            <li><a href="#skills" data-section="skills">Skills</a></li>
            <li><a href="#projects" data-section="projects">Projects</a></li>
            <li><a href="#experience" data-section="experience">Experience</a></li>
            <li><a href="#contact" data-section="contact">Contact</a></li>
        </ul>
        <button class="nav-hamburger" id="hamburger" aria-label="Toggle menu" aria-expanded="false">
            <span></span><span></span><span></span>
        </button>
    </nav>
    <div class="mobile-menu font-body" id="mobileMenu" aria-label="Mobile Navigation">
        <a href="#about" data-section="about">About</a>
        <a href="#skills" data-section="skills">Skills</a>
        <a href="#projects" data-section="projects">Projects</a>
        <a href="#experience" data-section="experience">Experience</a>
        <a href="#contact" data-section="contact">Contact</a>
    </div>

    <!-- ===== COSMIC BACKGROUND LAYER (Fixed) ===== -->
    <div id="intro-overlay" aria-label="Cinematic Intro">
        <div id="space-bg" aria-hidden="true"></div>
        <canvas id="star-canvas" aria-hidden="true" style="position:absolute; inset:0; width:100%; height:100%; z-index:1; mix-blend-mode:screen; pointer-events:none; opacity:0.7;"></canvas>
    </div>

    <!-- ===== COMPANION ROBOT LAYER (Fixed in Front) ===== -->
    <div id="robot-scene">
        <div id="robot-flyer" style="left: 78%;">
            <div id="speech-panel" class="font-body" aria-live="polite">
                <span id="speech-label" class="font-heading">AI Assistant</span>
                <span id="speech-text"></span>
                <span class="thought-trail" aria-hidden="true">
                    <span class="thought-dot dot-lg"></span>
                    <span class="thought-dot dot-sm"></span>
                </span>
            </div>
            <div id="robot-body">
                <img id="robot-img" src="/cute-robot.jpg" alt="AI Assistant">
                <div id="eye-glow" aria-hidden="true"></div>
                <div id="robot-fire" aria-hidden="true">
                    <div class="fire-flame flame-outer"></div>
                    <div class="fire-flame flame-mid"></div>
                    <div class="fire-flame flame-core"></div>
                </div>
            </div>
        </div>
    </div>

    <!-- ===== SCROLLABLE PAGE CONTENT LAYER ===== -->
    <main class="page-content" id="mainContent">
        <!-- Spacer for the initial pure space intro -->
        <div style="height: 100vh;"></div>

        <!-- ABOUT SECTION -->
        <section class="section-container" id="about" aria-label="About Section">
            <div class="about-card">
                <!-- Header Badge -->
                <div class="card-header-badge">
                    <span class="badge-pill font-heading">
                        <span class="pulse-dot"></span>
                        AI &amp; Data Science Student
                    </span>
                    <span class="badge-tag font-body">Software &amp; AI Builder</span>
                </div>

                <!-- Name Title in Syne -->
                <h2 class="about-name font-heading">
                    P. M<span class="accent-char">Λ</span>LLIK<span class="accent-char">Λ</span>RJUN<span class="accent-char">Λ</span> R<span class="accent-char">Λ</span>O
                </h2>

                <!-- Natural, human-written Bio -->
                <p class="about-bio font-body">
                    I build software at the intersection of <span class="accent-tech">Artificial Intelligence</span>, full-stack systems, and automation. Curious by nature, I love experimenting with new technologies and turning ambitious ideas into fast, reliable software that actually works.
                </p>

                <!-- Current Focus Chips -->
                <div class="focus-area">
                    <span class="focus-title font-heading">CORE FOCUS</span>
                    <div class="focus-grid font-body">
                        <div class="focus-chip">
                            <svg class="chip-icon-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                <rect x="4" y="4" width="16" height="16" rx="2"/>
                                <rect x="9" y="9" width="6" height="6"/>
                                <line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/>
                                <line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/>
                                <line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/>
                                <line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/>
                            </svg>
                            <span>AI Engineering &amp; Machine Learning</span>
                        </div>
                        <div class="focus-chip">
                            <svg class="chip-icon-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                            </svg>
                            <span>Intelligent Systems &amp; Automation</span>
                        </div>
                        <div class="focus-chip">
                            <svg class="chip-icon-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                <polyline points="16 18 22 12 16 6"/>
                                <polyline points="8 6 2 12 8 18"/>
                            </svg>
                            <span>Full-Stack Web Applications</span>
                        </div>
                        <div class="focus-chip">
                            <svg class="chip-icon-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                                <line x1="8" y1="21" x2="16" y2="21"/>
                                <line x1="12" y1="17" x2="12" y2="21"/>
                            </svg>
                            <span>Interactive UIs &amp; Human-Computer Interaction</span>
                        </div>
                    </div>
                </div>

                <!-- Footer Status -->
                <div class="card-footer-status font-body">
                    <div class="status-item">
                        <span class="status-label">STUDIES</span>
                        <span class="status-val">AI &amp; Data Science</span>
                    </div>
                    <div class="status-item">
                        <span class="status-label">AVAILABILITY</span>
                        <span class="status-val text-green">Open to Projects &amp; Internships</span>
                    </div>
                    <div class="status-item">
                        <span class="status-label">STACK</span>
                        <span class="status-val">Python • Machine Learning • Next.js</span>
                    </div>
                </div>
            </div>
        </section>

        <!-- SKILLS SECTION: MY TECHNICAL UNIVERSE -->
        <section class="section-container universe-section" id="skills" aria-label="Technical Universe">
            <!-- Header -->
            <div class="universe-header">
                <div class="card-header-badge">
                    <span class="badge-pill font-heading">
                        <span class="pulse-dot"></span>
                        SYSTEM ARCHITECTURE
                    </span>
                    <span class="badge-tag font-body">Triangular Orbit</span>
                </div>
                <h2 class="universe-title font-heading">
                    MY TECHNICAL UNIVERSE
                </h2>
                <p class="universe-subtitle font-body">
                    Nine technologies that shape what I build.
                </p>
            </div>

            <!-- Universe Viewport (Merged into original page background) -->
            <div class="universe-pic-container" id="universePicContainer">
                <div class="universe-pic-frame" id="universePicFrame">
                    <!-- Orbit Stage (3D Coordinate Space centered at 0,0) -->
                    <div class="orbit-stage" id="orbitStage">
                        <!-- 9 Skill Asteroids Floating in the Universe -->
                        <!-- 1. Artificial Intelligence (Inner Orbit) -->
                        <div class="skill-asteroid" data-skill="ai" data-orbit="inner" role="button" tabindex="0" aria-label="Artificial Intelligence">
                            <div class="asteroid-mesh">
                                <img src="/asteroid.png" alt="Asteroid" class="asteroid-rock-img" />
                                <div class="asteroid-glow-ring"></div>
                                <div class="asteroid-energy-core">
                                    <div class="asteroid-icon-wrap icon-neural-pulse">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M12 2a4 4 0 0 1 4 4v1a4 4 0 0 1-4 4 4 4 0 0 1-4-4V6a4 4 0 0 1 4-4z"/><path d="M18 10a6 6 0 0 1-12 0"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/><path d="M9 14l-4 4"/><path d="M15 14l4 4"/></svg>
                                    </div>
                                </div>
                            </div>
                            <div class="asteroid-label font-heading"><span class="label-bracket">[</span><span>Artificial Intelligence</span><span class="label-bracket">]</span></div>
                            <div class="asteroid-tooltip font-body">
                                <span class="tooltip-category font-heading">INNER ORBIT</span>
                                <div class="tooltip-title font-heading">Artificial Intelligence</div>
                                <div class="tooltip-desc">Deep neural networks, LLMs, prompt engineering, and agentic autonomous systems.</div>
                            </div>
                        </div>

                        <!-- 2. Python (Inner Orbit) -->
                        <div class="skill-asteroid" data-skill="python" data-orbit="inner" role="button" tabindex="0" aria-label="Python">
                            <div class="asteroid-mesh">
                                <img src="/asteroid.png" alt="Asteroid" class="asteroid-rock-img" />
                                <div class="asteroid-glow-ring"></div>
                                <div class="asteroid-energy-core">
                                    <div class="asteroid-icon-wrap icon-glow-pulse">
                                        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M12 2c2.76 0 5 2.24 5 5v2h-4V8a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h5v2H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5h5zm0 20c-2.76 0-5-2.24-5-5v-2h4v1a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1h-5v-2h5a5 5 0 0 1 5 5v2a5 5 0 0 1-5 5h-5z"/></svg>
                                    </div>
                                </div>
                            </div>
                            <div class="asteroid-label font-heading"><span class="label-bracket">[</span><span>Python</span><span class="label-bracket">]</span></div>
                            <div class="asteroid-tooltip font-body">
                                <span class="tooltip-category font-heading">INNER ORBIT</span>
                                <div class="tooltip-title font-heading">Python</div>
                                <div class="tooltip-desc">Core language for AI models, PyTorch, FastAPI microservices, and high-performance data processing.</div>
                            </div>
                        </div>

                        <!-- 3. Machine Learning (Inner Orbit) -->
                        <div class="skill-asteroid" data-skill="ml" data-orbit="inner" role="button" tabindex="0" aria-label="Machine Learning">
                            <div class="asteroid-mesh">
                                <img src="/asteroid.png" alt="Asteroid" class="asteroid-rock-img" />
                                <div class="asteroid-glow-ring"></div>
                                <div class="asteroid-energy-core">
                                    <div class="asteroid-icon-wrap icon-network-pulse">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                                    </div>
                                </div>
                            </div>
                            <div class="asteroid-label font-heading"><span class="label-bracket">[</span><span>Machine Learning</span><span class="label-bracket">]</span></div>
                            <div class="asteroid-tooltip font-body">
                                <span class="tooltip-category font-heading">INNER ORBIT</span>
                                <div class="tooltip-title font-heading">Machine Learning</div>
                                <div class="tooltip-desc">Predictive modeling, scikit-learn, supervised/unsupervised learning, and feature engineering.</div>
                            </div>
                        </div>

                        <!-- 4. Full-Stack Development (Middle Orbit) -->
                        <div class="skill-asteroid" data-skill="fullstack" data-orbit="middle" role="button" tabindex="0" aria-label="Full-Stack Development">
                            <div class="asteroid-mesh">
                                <img src="/asteroid.png" alt="Asteroid" class="asteroid-rock-img" />
                                <div class="asteroid-glow-ring"></div>
                                <div class="asteroid-energy-core">
                                    <div class="asteroid-icon-wrap icon-layers-glow">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
                                    </div>
                                </div>
                            </div>
                            <div class="asteroid-label font-heading"><span class="label-bracket">[</span><span>Full-Stack Development</span><span class="label-bracket">]</span></div>
                            <div class="asteroid-tooltip font-body">
                                <span class="tooltip-category font-heading">MIDDLE ORBIT</span>
                                <div class="tooltip-title font-heading">Full-Stack Development</div>
                                <div class="tooltip-desc">End-to-end architectures connecting performant frontend clients with scalable, secure cloud backends.</div>
                            </div>
                        </div>

                        <!-- 5. Next.js (Middle Orbit) -->
                        <div class="skill-asteroid" data-skill="nextjs" data-orbit="middle" role="button" tabindex="0" aria-label="Next.js">
                            <div class="asteroid-mesh">
                                <img src="/asteroid.png" alt="Asteroid" class="asteroid-rock-img" />
                                <div class="asteroid-glow-ring"></div>
                                <div class="asteroid-energy-core">
                                    <div class="asteroid-icon-wrap icon-edge-highlight">
                                        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm3.3 14.6l-5.6-7.3v7.3H8.2V7.4h1.6l5.7 7.4V7.4h1.5v9.2z"/></svg>
                                    </div>
                                </div>
                            </div>
                            <div class="asteroid-label font-heading"><span class="label-bracket">[</span><span>Next.js</span><span class="label-bracket">]</span></div>
                            <div class="asteroid-tooltip font-body">
                                <span class="tooltip-category font-heading">MIDDLE ORBIT</span>
                                <div class="tooltip-title font-heading">Next.js</div>
                                <div class="tooltip-desc">Production framework with Turbopack, App Router, SSR, Server Actions, and edge optimizations.</div>
                            </div>
                        </div>

                        <!-- 6. JavaScript (Middle Orbit) -->
                        <div class="skill-asteroid" data-skill="javascript" data-orbit="middle" role="button" tabindex="0" aria-label="JavaScript">
                            <div class="asteroid-mesh">
                                <img src="/asteroid.png" alt="Asteroid" class="asteroid-rock-img" />
                                <div class="asteroid-glow-ring"></div>
                                <div class="asteroid-energy-core">
                                    <div class="asteroid-icon-wrap icon-brightness-pulse">
                                        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M3 3h18v18H3V3zm13.6 14.5c1.4 0 2.4-.8 2.4-2.1v-.1c0-1.3-.8-1.9-2.2-2.5l-.8-.3c-.7-.3-1.1-.6-1.1-1.1v-.1c0-.5.4-.9 1.1-.9.7 0 1.1.3 1.5.8l1.4-1c-.7-.9-1.6-1.4-2.9-1.4-1.7 0-2.8 1-2.8 2.4v.1c0 1.3.8 1.9 2.1 2.5l.8.3c.8.4 1.2.7 1.2 1.2v.1c0 .6-.5 1-1.3 1-.9 0-1.4-.4-1.8-1.1l-1.5 1c.7 1.2 1.8 1.8 3.3 1.8zm-6.2-.2c.8 0 1.4-.2 1.8-.7V9h-1.8v5.5c0 .6-.3.9-.8.9-.4 0-.7-.2-.9-.5l-1.3 1c.5 1 1.6 1.7 3 1.7z"/></svg>
                                    </div>
                                </div>
                            </div>
                            <div class="asteroid-label font-heading"><span class="label-bracket">[</span><span>JavaScript</span><span class="label-bracket">]</span></div>
                            <div class="asteroid-tooltip font-body">
                                <span class="tooltip-category font-heading">MIDDLE ORBIT</span>
                                <div class="tooltip-title font-heading">JavaScript</div>
                                <div class="tooltip-desc">Modern ES6+ asynchronous programming, event-driven architectures, and rich interactive interfaces.</div>
                            </div>
                        </div>

                        <!-- 7. AI Automation & n8n (Outer Orbit) -->
                        <div class="skill-asteroid" data-skill="automation" data-orbit="outer" role="button" tabindex="0" aria-label="AI Automation & n8n">
                            <div class="asteroid-mesh">
                                <img src="/asteroid.png" alt="Asteroid" class="asteroid-rock-img" />
                                <div class="asteroid-glow-ring"></div>
                                <div class="asteroid-energy-core">
                                    <div class="asteroid-icon-wrap icon-workflow-pulse">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><circle cx="6" cy="6" r="3"/><circle cx="18" cy="6" r="3"/><circle cx="12" cy="18" r="3"/><line x1="8.6" y1="7.4" x2="15.4" y2="7.4"/><path d="M7.7 8.5L10.3 15.5"/><path d="M16.3 8.5L13.7 15.5"/></svg>
                                    </div>
                                </div>
                            </div>
                            <div class="asteroid-label font-heading"><span class="label-bracket">[</span><span>AI Automation &amp; n8n</span><span class="label-bracket">]</span></div>
                            <div class="asteroid-tooltip font-body">
                                <span class="tooltip-category font-heading">OUTER ORBIT</span>
                                <div class="tooltip-title font-heading">AI Automation &amp; n8n</div>
                                <div class="tooltip-desc">Designing autonomous trigger-action workflows, custom webhooks, and enterprise pipeline integrations.</div>
                            </div>
                        </div>

                        <!-- 8. API Integration (Outer Orbit) -->
                        <div class="skill-asteroid" data-skill="api" data-orbit="outer" role="button" tabindex="0" aria-label="API Integration">
                            <div class="asteroid-mesh">
                                <img src="/asteroid.png" alt="Asteroid" class="asteroid-rock-img" />
                                <div class="asteroid-glow-ring"></div>
                                <div class="asteroid-energy-core">
                                    <div class="asteroid-icon-wrap icon-connection-pulse">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                                    </div>
                                </div>
                            </div>
                            <div class="asteroid-label font-heading"><span class="label-bracket">[</span><span>API Integration</span><span class="label-bracket">]</span></div>
                            <div class="asteroid-tooltip font-body">
                                <span class="tooltip-category font-heading">OUTER ORBIT</span>
                                <div class="tooltip-title font-heading">API Integration</div>
                                <div class="tooltip-desc">Bridging distributed REST, GraphQL, and streaming WebSocket APIs into unified, fault-tolerant pipelines.</div>
                            </div>
                        </div>

                        <!-- 9. UI/UX & Interactive Web Design (Outer Orbit) -->
                        <div class="skill-asteroid" data-skill="uiux" data-orbit="outer" role="button" tabindex="0" aria-label="UI/UX & Interactive Web Design">
                            <div class="asteroid-mesh">
                                <img src="/asteroid.png" alt="Asteroid" class="asteroid-rock-img" />
                                <div class="asteroid-glow-ring"></div>
                                <div class="asteroid-energy-core">
                                    <div class="asteroid-icon-wrap icon-interface-glow">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><circle cx="12" cy="12" r="10"/><path d="M14.31 8l5.74 9.94M9.69 8h11.48M7.38 12l5.74-9.94M9.69 16L3.95 6.06M14.31 16H2.83M16.62 12l-5.74 9.94"/></svg>
                                    </div>
                                </div>
                            </div>
                            <div class="asteroid-label font-heading"><span class="label-bracket">[</span><span>UI/UX &amp; Interactive Web Design</span><span class="label-bracket">]</span></div>
                            <div class="asteroid-tooltip font-body">
                                <span class="tooltip-category font-heading">OUTER ORBIT</span>
                                <div class="tooltip-title font-heading">UI/UX &amp; Interactive Web Design</div>
                                <div class="tooltip-desc">Crafting fluid micro-animations, glassmorphic spatial layouts, and human-centered design systems.</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Spacer for smooth scroll headroom -->
        <div style="height: 60vh;"></div>
    </main>

    <!-- Scroll driver trigger -->
    <div id="zoom-trigger" style="position: absolute; top: 0; left: 0; width: 100%; height: 300vh; z-index: -1; pointer-events: none;"></div>
` }} />
  );
}
