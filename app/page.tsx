
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

    // ── 6. TECHNICAL UNIVERSE (Nano Banana Picture & 3D Interactive Hotspots) ──
    function initTechnicalUniverse() {
        const container = document.getElementById('universePicContainer');
        const frame = document.getElementById('universePicFrame');
        if (!container || !frame) return () => {};

        const hotspots = Array.from(document.querySelectorAll('.skill-hotspot')) as HTMLElement[];

        // 3D perspective mouse tilt
        const handleMouseMove = (e: MouseEvent) => {
            const rect = container.getBoundingClientRect();
            const normX = (e.clientX - rect.left) / rect.width - 0.5;
            const normY = (e.clientY - rect.top) / rect.height - 0.5;
            gsap.to(frame, {
                rotateY: normX * 8,
                rotateX: -normY * 8,
                duration: 0.6,
                ease: "power1.out"
            });
        };

        const handleMouseLeave = () => {
            gsap.to(frame, {
                rotateY: 0,
                rotateX: 0,
                duration: 1.0,
                ease: "power2.out"
            });
        };

        container.addEventListener('mousemove', handleMouseMove);
        container.addEventListener('mouseleave', handleMouseLeave);

        // Click outside to dismiss active hotspot
        const handleDocClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest('.skill-hotspot')) {
                hotspots.forEach(h => h.classList.remove('active'));
            }
        };
        document.addEventListener('click', handleDocClick);

        // Hotspot click / keyboard toggle
        hotspots.forEach(h => {
            h.addEventListener('click', (e) => {
                e.stopPropagation();
                const wasActive = h.classList.contains('active');
                hotspots.forEach(other => other.classList.remove('active'));
                if (!wasActive) h.classList.add('active');
            });

            h.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    h.click();
                }
            });
        });

        // ScrollTrigger entrance reveal
        gsap.fromTo(frame,
            { opacity: 0, scale: 0.88, y: 25 },
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

        return () => {
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
                    <span class="badge-tag font-body">Interactive Orbit</span>
                </div>
                <h2 class="universe-title font-heading">
                    MY TECHNICAL UNIVERSE
                </h2>
                <p class="universe-subtitle font-body">
                    Nine technologies that shape what I build.
                </p>
            </div>

            <!-- Universe Picture Container (Nano Banana Masterpiece) -->
            <div class="universe-pic-container" id="universePicContainer">
                <div class="universe-pic-frame" id="universePicFrame">
                    <img src="/technical-universe.jpg" alt="My Technical Universe - 9 Technologies Solar System" class="universe-pic-img" id="universePicImg" />
                    <div class="universe-pic-glow-overlay"></div>

                    <!-- 1. Central Core AI Planet -->
                    <div class="skill-hotspot" style="left: 50%; top: 53.5%;" data-skill="core" role="button" tabindex="0" aria-label="Core Technology">
                        <div class="hotspot-pulse-ring"></div>
                        <div class="hotspot-dot"></div>
                        <div class="hotspot-tooltip font-body">
                            <span class="hotspot-category font-heading">SYSTEM CORE</span>
                            <div class="hotspot-title font-heading">AI • Software • Automation</div>
                            <div class="hotspot-desc">Autonomous intelligence systems, full-stack architecture, and unified API automation pipelines.</div>
                        </div>
                    </div>

                    <!-- 2. Artificial Intelligence -->
                    <div class="skill-hotspot" style="left: 35.8%; top: 53.5%;" data-skill="ai" role="button" tabindex="0" aria-label="Artificial Intelligence">
                        <div class="hotspot-pulse-ring"></div>
                        <div class="hotspot-dot"></div>
                        <div class="hotspot-tooltip font-body">
                            <span class="hotspot-category font-heading">INNER ORBIT</span>
                            <div class="hotspot-title font-heading">Artificial Intelligence</div>
                            <div class="hotspot-desc">Architecting autonomous LLM agents, multi-agent orchestrations, and multimodal GenAI systems.</div>
                        </div>
                    </div>
                    <!-- 3. Python -->
                    <div class="skill-hotspot" style="left: 61.6%; top: 50%;" data-skill="python" role="button" tabindex="0" aria-label="Python">
                        <div class="hotspot-pulse-ring"></div>
                        <div class="hotspot-dot"></div>
                        <div class="hotspot-tooltip font-body">
                            <span class="hotspot-category font-heading">INNER ORBIT</span>
                            <div class="hotspot-title font-heading">Python</div>
                            <div class="hotspot-desc">High-performance backend systems, asynchronous pipelines, data engineering, and AI model workflows.</div>
                        </div>
                    </div>

                    <!-- 4. Machine Learning -->
                    <div class="skill-hotspot" style="left: 52.3%; top: 66.5%;" data-skill="ml" role="button" tabindex="0" aria-label="Machine Learning">
                        <div class="hotspot-pulse-ring"></div>
                        <div class="hotspot-dot"></div>
                        <div class="hotspot-tooltip font-body">
                            <span class="hotspot-category font-heading">INNER ORBIT</span>
                            <div class="hotspot-title font-heading">Machine Learning</div>
                            <div class="hotspot-desc">End-to-end model training, fine-tuning, embeddings, vector search, and predictive analytics.</div>
                        </div>
                    </div>

                    <!-- 5. Full-Stack Development -->
                    <div class="skill-hotspot" style="left: 25.8%; top: 56.5%;" data-skill="fullstack" role="button" tabindex="0" aria-label="Full-Stack Development">
                        <div class="hotspot-pulse-ring"></div>
                        <div class="hotspot-dot"></div>
                        <div class="hotspot-tooltip font-body">
                            <span class="hotspot-category font-heading">MIDDLE ORBIT</span>
                            <div class="hotspot-title font-heading">Full-Stack Development</div>
                            <div class="hotspot-desc">Building scalable modern applications from responsive reactive frontends to robust cloud backends.</div>
                        </div>
                    </div>

                    <!-- 6. Next.js -->
                    <div class="skill-hotspot" style="left: 66.5%; top: 45.5%;" data-skill="nextjs" role="button" tabindex="0" aria-label="Next.js">
                        <div class="hotspot-pulse-ring"></div>
                        <div class="hotspot-dot"></div>
                        <div class="hotspot-tooltip font-body">
                            <span class="hotspot-category font-heading">MIDDLE ORBIT</span>
                            <div class="hotspot-title font-heading">Next.js</div>
                            <div class="hotspot-desc">Server Components, App Router, static generation, streaming SSR, and edge compute performance.</div>
                        </div>
                    </div>

                    <!-- 7. JavaScript -->
                    <div class="skill-hotspot" style="left: 58.2%; top: 72%;" data-skill="javascript" role="button" tabindex="0" aria-label="JavaScript">
                        <div class="hotspot-pulse-ring"></div>
                        <div class="hotspot-dot"></div>
                        <div class="hotspot-tooltip font-body">
                            <span class="hotspot-category font-heading">MIDDLE ORBIT</span>
                            <div class="hotspot-title font-heading">JavaScript</div>
                            <div class="hotspot-desc">Modern ESNext, asynchronous runtime mechanics, DOM manipulation, and interactive dynamic experiences.</div>
                        </div>
                    </div>

                    <!-- 8. AI Automation & n8n -->
                    <div class="skill-hotspot" style="left: 19.5%; top: 47%;" data-skill="automation" role="button" tabindex="0" aria-label="AI Automation & n8n">
                        <div class="hotspot-pulse-ring"></div>
                        <div class="hotspot-dot"></div>
                        <div class="hotspot-tooltip font-body">
                            <span class="hotspot-category font-heading">OUTER ORBIT</span>
                            <div class="hotspot-title font-heading">AI Automation &amp; n8n</div>
                            <div class="hotspot-desc">Designing autonomous trigger-action workflows, custom webhooks, and enterprise pipeline integrations.</div>
                        </div>
                    </div>

                    <!-- 9. API Integration -->
                    <div class="skill-hotspot" style="left: 79.2%; top: 45%;" data-skill="api" role="button" tabindex="0" aria-label="API Integration">
                        <div class="hotspot-pulse-ring"></div>
                        <div class="hotspot-dot"></div>
                        <div class="hotspot-tooltip font-body shift-left">
                            <span class="hotspot-category font-heading">OUTER ORBIT</span>
                            <div class="hotspot-title font-heading">API Integration</div>
                            <div class="hotspot-desc">Bridging distributed REST, GraphQL, and streaming WebSocket APIs into unified, fault-tolerant pipelines.</div>
                        </div>
                    </div>

                    <!-- 10. UI/UX & Interactive Web Design -->
                    <div class="skill-hotspot" style="left: 51%; top: 81%;" data-skill="uiux" role="button" tabindex="0" aria-label="UI/UX & Interactive Web Design">
                        <div class="hotspot-pulse-ring"></div>
                        <div class="hotspot-dot"></div>
                        <div class="hotspot-tooltip font-body">
                            <span class="hotspot-category font-heading">OUTER ORBIT</span>
                            <div class="hotspot-title font-heading">UI/UX &amp; Interactive Web Design</div>
                            <div class="hotspot-desc">Crafting fluid micro-animations, glassmorphic spatial layouts, and human-centered design systems.</div>
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
