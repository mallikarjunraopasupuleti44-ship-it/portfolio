
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

    // ── 6. TECHNICAL UNIVERSE (Interactive 3D Solar System) ──
    function initTechnicalUniverse() {
        const viewport = document.getElementById('universeViewport');
        const stage = document.getElementById('orbitStage');
        const canvas = document.getElementById('universeCanvas') as HTMLCanvasElement | null;
        const centralPlanet = document.getElementById('centralPlanet');
        const trackInner = document.querySelector('.orbit-track.track-inner');
        const trackMiddle = document.querySelector('.orbit-track.track-middle');
        const trackOuter = document.querySelector('.orbit-track.track-outer');

        if (!viewport || !stage) return () => {};
        const stageEl: HTMLElement = stage as HTMLElement;
        const viewportEl: HTMLElement = viewport as HTMLElement;

        // Track highlights helper
        function updateTrackHighlights() {
            const activeOrHovered = Array.from(document.querySelectorAll('.skill-asteroid.active, .skill-asteroid:hover'));
            const orbits = new Set(activeOrHovered.map(el => el.getAttribute('data-orbit')));

            if (trackInner) {
                if (orbits.has('inner')) trackInner.classList.add('highlighted');
                else trackInner.classList.remove('highlighted');
            }
            if (trackMiddle) {
                if (orbits.has('middle')) trackMiddle.classList.add('highlighted');
                else trackMiddle.classList.remove('highlighted');
            }
            if (trackOuter) {
                if (orbits.has('outer')) trackOuter.classList.add('highlighted');
                else trackOuter.classList.remove('highlighted');
            }
        }

        // Setup Particles Canvas
        let animFrameId: number;
        let isVisible = false;
        const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        let particles: Array<{
            x: number;
            y: number;
            r: number;
            baseAlpha: number;
            speedX: number;
            speedY: number;
            color: string;
            pulseSpeed: number;
            pulseVal: number;
        }> = [];

        let ctx: CanvasRenderingContext2D | null = null;
        let canvasW = 0;
        let canvasH = 0;

        const initCanvas = () => {
            if (!canvas) return;
            ctx = canvas.getContext('2d');
            const rect = canvas.getBoundingClientRect();
            canvasW = rect.width || 800;
            canvasH = rect.height || 600;
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = canvasW * dpr;
            canvas.height = canvasH * dpr;
            if (ctx) ctx.scale(dpr, dpr);

            particles = [];
            const colors = ['rgba(56, 189, 248,', 'rgba(168, 85, 247,', 'rgba(147, 197, 253,'];
            for (let i = 0; i < 45; i++) {
                const baseAlpha = 0.15 + Math.random() * 0.45;
                particles.push({
                    x: Math.random() * canvasW,
                    y: Math.random() * canvasH,
                    r: 0.8 + Math.random() * 1.6,
                    baseAlpha,
                    speedX: (Math.random() - 0.5) * 0.18,
                    speedY: (Math.random() - 0.5) * 0.18,
                    color: colors[Math.floor(Math.random() * colors.length)],
                    pulseSpeed: 0.02 + Math.random() * 0.03,
                    pulseVal: Math.random() * Math.PI * 2
                });
            }
        };

        if (canvas) {
            initCanvas();
            window.addEventListener('resize', initCanvas);
        }

        // Asteroid Orbit Configurations
        // 3 concentric layers: Inner (160x70), Middle (265x115), Outer (375x160)
        interface AsteroidConfig {
            element: HTMLElement;
            orbit: 'inner' | 'middle' | 'outer';
            rx: number;
            ry: number;
            speed: number;
            angle: number;
            isHovered: boolean;
            isActive: boolean;
        }

        const asteroidElements = Array.from(document.querySelectorAll('.skill-asteroid')) as HTMLElement[];
        const orbitMap: Record<string, { rx: number; ry: number; speed: number; baseOffset: number }> = {
            inner:  { rx: 160, ry: 70,  speed: 0.00038, baseOffset: 0 },
            middle: { rx: 265, ry: 115, speed: 0.00026, baseOffset: Math.PI / 4 },
            outer:  { rx: 375, ry: 160, speed: 0.00017, baseOffset: Math.PI / 2 }
        };

        const orbitCounts: Record<string, number> = { inner: 0, middle: 0, outer: 0 };
        const asteroids: AsteroidConfig[] = asteroidElements.map((el) => {
            const orbitType = (el.getAttribute('data-orbit') || 'inner') as 'inner' | 'middle' | 'outer';
            const spec = orbitMap[orbitType] || orbitMap.inner;
            const indexInOrbit = orbitCounts[orbitType]++;
            // 3 items per orbit -> evenly separated by 120° (2*PI/3)
            const angle = spec.baseOffset + (indexInOrbit * (Math.PI * 2 / 3));

            return {
                element: el,
                orbit: orbitType,
                rx: spec.rx,
                ry: spec.ry,
                speed: spec.speed,
                angle,
                isHovered: false,
                isActive: false
            };
        });

        // Click outside handler to dismiss active asteroid
        const handleDocClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest('.skill-asteroid') && !target.closest('#centralPlanet')) {
                asteroids.forEach(a => {
                    a.isActive = false;
                    a.element.classList.remove('active');
                });
                updateTrackHighlights();
            }
        };
        document.addEventListener('click', handleDocClick);

        // Bind Asteroid Events
        asteroids.forEach((item) => {
            const el = item.element;
            el.addEventListener('mouseenter', () => {
                item.isHovered = true;
                updateTrackHighlights();
            });

            el.addEventListener('mouseleave', () => {
                item.isHovered = false;
                updateTrackHighlights();
            });

            el.addEventListener('click', (e) => {
                e.stopPropagation();
                const willBeActive = !item.isActive;
                asteroids.forEach(a => {
                    a.isActive = false;
                    a.element.classList.remove('active');
                });
                item.isActive = willBeActive;
                if (willBeActive) {
                    el.classList.add('active');
                }
                updateTrackHighlights();
            });

            // Keyboard accessibility
            el.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    el.click();
                }
            });
        });

        // Central Planet pulse on click
        if (centralPlanet) {
            centralPlanet.addEventListener('click', () => {
                const halo = centralPlanet.querySelector('.planet-atmosphere-halo') as HTMLElement;
                if (halo) {
                    gsap.fromTo(halo, 
                        { scale: 1.4, opacity: 1 }, 
                        { scale: 1, opacity: 0.8, duration: 1, ease: "power2.out" }
                    );
                }
            });
        }

        // Viewport 3D perspective mouse tilt
        const handleMouseMove = (e: MouseEvent) => {
            const rect = viewportEl.getBoundingClientRect();
            const normX = (e.clientX - rect.left) / rect.width - 0.5;
            const normY = (e.clientY - rect.top) / rect.height - 0.5;
            gsap.to(stageEl, {
                rotateY: normX * 9,
                rotateX: -normY * 9,
                duration: 0.8,
                ease: "power1.out"
            });
        };

        const handleMouseLeave = () => {
            gsap.to(stageEl, {
                rotateY: 0,
                rotateX: 0,
                duration: 1.2,
                ease: "power2.out"
            });
        };

        viewportEl.addEventListener('mousemove', handleMouseMove);
        viewportEl.addEventListener('mouseleave', handleMouseLeave);

        // Visibility observer
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                isVisible = entry.isIntersecting;
            });
        }, { rootMargin: '100px' });
        observer.observe(viewportEl);

        // ScrollTrigger entrance animation for the stage
        gsap.fromTo(stageEl,
            { opacity: 0, scale: 0.85, y: 30 },
            {
                opacity: 1,
                scale: 1,
                y: 0,
                duration: 1.2,
                ease: "power2.out",
                scrollTrigger: {
                    trigger: "#skills",
                    start: "top 80%",
                    toggleActions: "play none none reverse"
                }
            }
        );

        // Physics & Animation Loop
        let lastTime = performance.now();

        function render(now: number) {
            const dt = Math.min(now - lastTime, 100);
            lastTime = now;

            if (isVisible) {
                // 1. Draw star canvas
                if (ctx && canvasW > 0 && canvasH > 0) {
                    ctx.clearRect(0, 0, canvasW, canvasH);
                    for (let i = 0; i < particles.length; i++) {
                        const p = particles[i];
                        p.x += p.speedX;
                        p.y += p.speedY;
                        if (p.x < 0) p.x = canvasW;
                        if (p.x > canvasW) p.x = 0;
                        if (p.y < 0) p.y = canvasH;
                        if (p.y > canvasH) p.y = 0;

                        p.pulseVal += p.pulseSpeed;
                        const alpha = Math.max(0.05, Math.min(1, p.baseAlpha + Math.sin(p.pulseVal) * 0.2));

                        ctx.beginPath();
                        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                        ctx.fillStyle = `${p.color} ${alpha})`;
                        ctx.fill();
                    }
                }

                // 2. Responsive scale calculation
                const stageW = stageEl.clientWidth || 900;
                const responsiveScale = Math.min(1, Math.max(0.40, stageW / 850));

                // 3. Update Asteroid Positions with 3D Depth
                asteroids.forEach((item, idx) => {
                    // Update angle if not paused/reduced motion
                    if (!prefersReducedMotion) {
                        // If hovered or active, asteroid slows down to 10% speed
                        const speedFactor = (item.isHovered || item.isActive) ? 0.10 : 1.0;
                        item.angle += item.speed * dt * speedFactor;
                    }

                    const cos = Math.cos(item.angle);
                    const sin = Math.sin(item.angle);

                    const x = item.rx * responsiveScale * cos;
                    const y = item.ry * responsiveScale * sin;

                    // Vertical bobbing for organic floating sensation
                    const bob = Math.sin(now * 0.0018 + idx * 1.2) * 4;

                    // Depth: 0 (top/back) to 1 (bottom/front)
                    const depth = (sin + 1) / 2;

                    // Scale: smaller when behind, larger when in front
                    let scale = 0.78 + depth * 0.36;
                    if (item.isHovered || item.isActive) {
                        scale *= 1.18;
                    }

                    // Opacity: lower when behind, full when in front
                    const opacity = (item.isHovered || item.isActive) ? 1.0 : (0.58 + depth * 0.42);

                    // Z-Index Occlusion:
                    // Central planet is z-index 20
                    // Behind planet: z-index 10
                    // In front of planet: z-index 30
                    // Active or hovered: z-index 150
                    let zIndex = 10;
                    if (item.isHovered || item.isActive) {
                        zIndex = 150;
                    } else if (sin >= 0) {
                        zIndex = 30; // Foreground
                    } else {
                        zIndex = 10; // Background (behind planet)
                    }

                    // Apply styles
                    const el = item.element;
                    el.style.transform = `translate3d(calc(-50% + ${x.toFixed(2)}px), calc(-50% + ${(y + bob).toFixed(2)}px), 0px) scale(${scale.toFixed(3)})`;
                    el.style.opacity = opacity.toFixed(3);
                    el.style.zIndex = zIndex.toString();
                });
            }

            animFrameId = requestAnimationFrame(render);
        }

        animFrameId = requestAnimationFrame(render);

        return () => {
            cancelAnimationFrame(animFrameId);
            observer.disconnect();
            if (canvas) window.removeEventListener('resize', initCanvas);
            document.removeEventListener('click', handleDocClick);
            viewportEl.removeEventListener('mousemove', handleMouseMove);
            viewportEl.removeEventListener('mouseleave', handleMouseLeave);
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
                    <span class="badge-tag font-body">Interactive Orbit</span>
                </div>
                <h2 class="universe-title font-heading">
                    MY TECHNICAL UNIVERSE
                </h2>
                <p class="universe-subtitle font-body">
                    Nine technologies that shape what I build.
                </p>
            </div>

            <!-- Universe Viewport -->
            <div class="universe-viewport" id="universeViewport">
                <!-- Ambient Galactic Canvas -->
                <canvas class="universe-particle-canvas" id="universeCanvas" aria-hidden="true"></canvas>

                <!-- Orbit Stage -->
                <div class="orbit-stage" id="orbitStage">
                    <!-- Orbit Rings (SVG with glowing dashed strokes) -->
                    <svg class="orbit-tracks-svg" id="orbitTracksSvg" viewBox="-450 -250 900 500" aria-hidden="true">
                        <defs>
                            <linearGradient id="orbitGlowInner" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stop-color="rgba(56, 189, 248, 0.4)"/>
                                <stop offset="50%" stop-color="rgba(168, 85, 247, 0.25)"/>
                                <stop offset="100%" stop-color="rgba(56, 189, 248, 0.2)"/>
                            </linearGradient>
                            <linearGradient id="orbitGlowMid" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stop-color="rgba(56, 189, 248, 0.3)"/>
                                <stop offset="50%" stop-color="rgba(147, 197, 253, 0.25)"/>
                                <stop offset="100%" stop-color="rgba(168, 85, 247, 0.2)"/>
                            </linearGradient>
                            <linearGradient id="orbitGlowOuter" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stop-color="rgba(99, 102, 241, 0.3)"/>
                                <stop offset="50%" stop-color="rgba(56, 189, 248, 0.2)"/>
                                <stop offset="100%" stop-color="rgba(147, 197, 253, 0.25)"/>
                            </linearGradient>
                        </defs>
                        <ellipse class="orbit-track track-inner" cx="0" cy="0" rx="160" ry="70" />
                        <ellipse class="orbit-track track-middle" cx="0" cy="0" rx="265" ry="115" />
                        <ellipse class="orbit-track track-outer" cx="0" cy="0" rx="375" ry="160" />
                    </svg>

                    <!-- Central Planet -->
                    <div class="central-planet" id="centralPlanet">
                        <div class="planet-atmosphere-halo"></div>
                        <div class="planet-sphere">
                            <div class="planet-specular"></div>
                            <div class="planet-texture-glow"></div>
                        </div>
                        <div class="planet-core-label font-body">
                            <span class="core-tag font-heading">CORE TECHNOLOGY</span>
                            <span class="core-tech font-heading">AI • SOFTWARE • AUTOMATION</span>
                        </div>
                    </div>

                    <!-- 9 Asteroids (3 per orbit) -->
                    <!-- 1. Artificial Intelligence (Inner Orbit) -->
                    <div class="skill-asteroid" data-skill="ai" data-orbit="inner" role="button" tabindex="0" aria-label="Artificial Intelligence">
                        <div class="asteroid-mesh">
                            <div class="asteroid-facet"></div>
                            <div class="asteroid-glow-ring"></div>
                            <div class="asteroid-core-light"></div>
                            <div class="asteroid-icon-wrap">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M12 2a4 4 0 0 1 4 4v1a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2v1a4 4 0 0 1-8 0v-1a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2V6a4 4 0 0 1 4-4z"/><circle cx="9" cy="10" r="1"/><circle cx="15" cy="10" r="1"/><path d="M9 15h6"/><path d="M12 2v3"/><path d="M5 10H2"/><path d="M22 10h-3"/><path d="M7 19l-2 3"/><path d="M17 19l2 3"/></svg>
                            </div>
                        </div>
                        <div class="asteroid-label font-heading"><span class="label-bracket">[</span><span>Artificial Intelligence</span><span class="label-bracket">]</span></div>
                        <div class="asteroid-tooltip font-body">
                            <div class="tooltip-title font-heading">Artificial Intelligence</div>
                            <div class="tooltip-desc">Architecting autonomous LLM agents, multi-agent orchestrations, and multimodal GenAI systems.</div>
                        </div>
                    </div>

                    <!-- 2. Python (Inner Orbit) -->
                    <div class="skill-asteroid" data-skill="python" data-orbit="inner" role="button" tabindex="0" aria-label="Python">
                        <div class="asteroid-mesh">
                            <div class="asteroid-facet"></div>
                            <div class="asteroid-glow-ring"></div>
                            <div class="asteroid-core-light"></div>
                            <div class="asteroid-icon-wrap">
                                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M11.91 2c-4.48 0-4.18 1.94-4.18 1.94l.01 2.01h4.25v.61H6.01S2 6.1 2 10.64c0 4.53 3.51 4.38 3.51 4.38h2.09v-2.94s-.11-3.52 3.48-3.52h5.37s3.38.05 3.38-3.32c0-3.38-3.08-3.24-3.08-3.24H11.91zm-2.3 1.25a.88.88 0 1 1 0 1.76.88.88 0 0 1 0-1.76zm2.48 18.75c4.48 0 4.18-1.94 4.18-1.94l-.01-2.01h-4.25v-.61h5.98s4.01.46 4.01-4.08c0-4.53-3.51-4.38-3.51-4.38h-2.09v2.94s.11 3.52-3.48 3.52H9.05s-3.38-.05-3.38 3.32c0 3.38 3.08 3.24 3.08 3.24h4.84zm2.3-1.25a.88.88 0 1 1 0-1.76.88.88 0 0 1 0 1.76z"/></svg>
                            </div>
                        </div>
                        <div class="asteroid-label font-heading"><span class="label-bracket">[</span><span>Python</span><span class="label-bracket">]</span></div>
                        <div class="asteroid-tooltip font-body">
                            <div class="tooltip-title font-heading">Python</div>
                            <div class="tooltip-desc">Primary language for AI engineering, backend microservices, PyTorch, and automated data processing.</div>
                        </div>
                    </div>

                    <!-- 3. Machine Learning (Inner Orbit) -->
                    <div class="skill-asteroid" data-skill="ml" data-orbit="inner" role="button" tabindex="0" aria-label="Machine Learning">
                        <div class="asteroid-mesh">
                            <div class="asteroid-facet"></div>
                            <div class="asteroid-glow-ring"></div>
                            <div class="asteroid-core-light"></div>
                            <div class="asteroid-icon-wrap">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="6" r="3"/><circle cx="18" cy="18" r="3"/><line x1="8.5" y1="7.5" x2="15.5" y2="16.5"/><line x1="8.5" y1="16.5" x2="15.5" y2="7.5"/><line x1="6" y1="9" x2="6" y2="15"/><line x1="18" y1="9" x2="18" y2="15"/></svg>
                            </div>
                        </div>
                        <div class="asteroid-label font-heading"><span class="label-bracket">[</span><span>Machine Learning</span><span class="label-bracket">]</span></div>
                        <div class="asteroid-tooltip font-body">
                            <div class="tooltip-title font-heading">Machine Learning</div>
                            <div class="tooltip-desc">Designing predictive models, statistical forecasting, deep neural nets, and intelligent pipelines.</div>
                        </div>
                    </div>

                    <!-- 4. Full-Stack Development (Middle Orbit) -->
                    <div class="skill-asteroid" data-skill="fullstack" data-orbit="middle" role="button" tabindex="0" aria-label="Full-Stack Development">
                        <div class="asteroid-mesh">
                            <div class="asteroid-facet"></div>
                            <div class="asteroid-glow-ring"></div>
                            <div class="asteroid-core-light"></div>
                            <div class="asteroid-icon-wrap">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/><line x1="10" y1="6" x2="18" y2="6"/><line x1="10" y1="18" x2="18" y2="18"/></svg>
                            </div>
                        </div>
                        <div class="asteroid-label font-heading"><span class="label-bracket">[</span><span>Full-Stack Development</span><span class="label-bracket">]</span></div>
                        <div class="asteroid-tooltip font-body">
                            <div class="tooltip-title font-heading">Full-Stack Development</div>
                            <div class="tooltip-desc">End-to-end architectures connecting performant frontend clients with scalable, secure cloud backends.</div>
                        </div>
                    </div>

                    <!-- 5. Next.js (Middle Orbit) -->
                    <div class="skill-asteroid" data-skill="nextjs" data-orbit="middle" role="button" tabindex="0" aria-label="Next.js">
                        <div class="asteroid-mesh">
                            <div class="asteroid-facet"></div>
                            <div class="asteroid-glow-ring"></div>
                            <div class="asteroid-core-light"></div>
                            <div class="asteroid-icon-wrap">
                                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm3.3 14.6l-5.6-7.3v7.3H8.2V7.4h1.6l5.7 7.4V7.4h1.5v9.2z"/></svg>
                            </div>
                        </div>
                        <div class="asteroid-label font-heading"><span class="label-bracket">[</span><span>Next.js</span><span class="label-bracket">]</span></div>
                        <div class="asteroid-tooltip font-body">
                            <div class="tooltip-title font-heading">Next.js</div>
                            <div class="tooltip-desc">Production framework with Turbopack, App Router, SSR, Server Actions, and edge optimizations.</div>
                        </div>
                    </div>

                    <!-- 6. JavaScript (Middle Orbit) -->
                    <div class="skill-asteroid" data-skill="js" data-orbit="middle" role="button" tabindex="0" aria-label="JavaScript">
                        <div class="asteroid-mesh">
                            <div class="asteroid-facet"></div>
                            <div class="asteroid-glow-ring"></div>
                            <div class="asteroid-core-light"></div>
                            <div class="asteroid-icon-wrap">
                                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M3 3h18v18H3V3zm13.6 14.5c1.4 0 2.4-.8 2.4-2.1v-.1c0-1.3-.8-1.9-2.2-2.5l-.8-.3c-.7-.3-1.1-.6-1.1-1.1v-.1c0-.5.4-.9 1.1-.9.7 0 1.1.3 1.5.8l1.4-1c-.7-.9-1.6-1.4-2.9-1.4-1.7 0-2.8 1-2.8 2.4v.1c0 1.3.8 1.9 2.1 2.5l.8.3c.8.4 1.2.7 1.2 1.2v.1c0 .6-.5 1-1.3 1-.9 0-1.4-.4-1.8-1.1l-1.5 1c.7 1.2 1.8 1.8 3.3 1.8zm-6.2-.2c.8 0 1.4-.2 1.8-.7V9h-1.8v5.5c0 .6-.3.9-.8.9-.4 0-.7-.2-.9-.5l-1.3 1c.5 1 1.6 1.7 3 1.7z"/></svg>
                            </div>
                        </div>
                        <div class="asteroid-label font-heading"><span class="label-bracket">[</span><span>JavaScript</span><span class="label-bracket">]</span></div>
                        <div class="asteroid-tooltip font-body">
                            <div class="tooltip-title font-heading">JavaScript</div>
                            <div class="tooltip-desc">Modern ES6+ asynchronous programming, event-driven architectures, and rich interactive interfaces.</div>
                        </div>
                    </div>

                    <!-- 7. AI Automation & n8n (Outer Orbit) -->
                    <div class="skill-asteroid" data-skill="automation" data-orbit="outer" role="button" tabindex="0" aria-label="AI Automation & n8n">
                        <div class="asteroid-mesh">
                            <div class="asteroid-facet"></div>
                            <div class="asteroid-glow-ring"></div>
                            <div class="asteroid-core-light"></div>
                            <div class="asteroid-icon-wrap">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><circle cx="6" cy="6" r="3"/><circle cx="18" cy="6" r="3"/><circle cx="12" cy="18" r="3"/><line x1="8.6" y1="7.4" x2="15.4" y2="7.4"/><path d="M7.7 8.5L10.3 15.5"/><path d="M16.3 8.5L13.7 15.5"/></svg>
                            </div>
                        </div>
                        <div class="asteroid-label font-heading"><span class="label-bracket">[</span><span>AI Automation &amp; n8n</span><span class="label-bracket">]</span></div>
                        <div class="asteroid-tooltip font-body">
                            <div class="tooltip-title font-heading">AI Automation &amp; n8n</div>
                            <div class="tooltip-desc">Designing autonomous trigger-action workflows, custom webhooks, and enterprise pipeline integrations.</div>
                        </div>
                    </div>

                    <!-- 8. API Integration (Outer Orbit) -->
                    <div class="skill-asteroid" data-skill="api" data-orbit="outer" role="button" tabindex="0" aria-label="API Integration">
                        <div class="asteroid-mesh">
                            <div class="asteroid-facet"></div>
                            <div class="asteroid-glow-ring"></div>
                            <div class="asteroid-core-light"></div>
                            <div class="asteroid-icon-wrap">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                            </div>
                        </div>
                        <div class="asteroid-label font-heading"><span class="label-bracket">[</span><span>API Integration</span><span class="label-bracket">]</span></div>
                        <div class="asteroid-tooltip font-body">
                            <div class="tooltip-title font-heading">API Integration</div>
                            <div class="tooltip-desc">Bridging distributed REST, GraphQL, and streaming WebSocket APIs into unified, fault-tolerant pipelines.</div>
                        </div>
                    </div>

                    <!-- 9. UI/UX & Interactive Web Design (Outer Orbit) -->
                    <div class="skill-asteroid" data-skill="uiux" data-orbit="outer" role="button" tabindex="0" aria-label="UI/UX & Interactive Web Design">
                        <div class="asteroid-mesh">
                            <div class="asteroid-facet"></div>
                            <div class="asteroid-glow-ring"></div>
                            <div class="asteroid-core-light"></div>
                            <div class="asteroid-icon-wrap">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><circle cx="12" cy="12" r="10"/><path d="M14.31 8l5.74 9.94M9.69 8h11.48M7.38 12l5.74-9.94M9.69 16L3.95 6.06M14.31 16H2.83M16.62 12l-5.74 9.94"/></svg>
                            </div>
                        </div>
                        <div class="asteroid-label font-heading"><span class="label-bracket">[</span><span>UI/UX &amp; Interactive Web Design</span><span class="label-bracket">]</span></div>
                        <div class="asteroid-tooltip font-body">
                            <div class="tooltip-title font-heading">UI/UX &amp; Interactive Web Design</div>
                            <div class="tooltip-desc">Crafting fluid micro-animations, glassmorphic spatial layouts, and human-centered design systems.</div>
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
