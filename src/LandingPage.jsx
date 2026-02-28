import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ChevronRight, Zap, Target, ArrowRight, Play, Check } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

export default function LandingPage() {
    const navigate = useNavigate();

    // References for GSAP
    const heroRef = useRef(null);
    const philosophyRef = useRef(null);
    const protocolWrapperRef = useRef(null);
    // `cardsRef` removed
    const textRefs = useRef([]);
    const scrollCardsRef = useRef([]);

    // Canvas Scroll Animation Refs
    const canvasRef = useRef(null);
    const imagesRef = useRef([]);
    const currentFrameRef = useRef(0);
    const rafRef = useRef(null);
    const heroScrollRef = useRef(null);

    // Shuffler State
    const [shufflerData, setShufflerData] = useState([
        { id: 1, text: "Fatura_012_A.pdf işlendi", sub: "100% Güven (0.2s)" },
        { id: 2, text: "Z_Raporu_Gunluk.jpg okundu", sub: "Kategorize Edildi" },
        { id: 3, text: "Gider_Fisi_3.pdf çıkarıldı", sub: "Mükerrerlik Testi OK" }
    ]);
    const shufflerIntervalRef = useRef(null);

    // Typewriter State
    const [typedText, setTypedText] = useState("");
    const fullText = "RUNNING_TELEMETRY:\n... Analiz: %388 hız aşırtma tespit edildi.\n....Doğruluk Puanı: 99.98%\n...Optimizasyon Tamam.\n";
    const typeIndexRef = useRef(0);

    // Scheduler Cursor State
    const cursorRef = useRef(null);
    // `btnRef` removed
    const [activeDay, setActiveDay] = useState(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            // 1. HERO ANIMATION
            gsap.fromTo(
                textRefs.current,
                { y: 40, opacity: 0 },
                { y: 0, opacity: 1, duration: 1, stagger: 0.1, ease: 'power3.out', delay: 0.2 }
            );

            // 2. PHILOSOPHY ANIMATION
            if (philosophyRef.current) {
                const textElements = philosophyRef.current.querySelectorAll('.split-text-line');
                gsap.fromTo(
                    textElements,
                    { y: 20, opacity: 0 },
                    {
                        y: 0, opacity: 1, duration: 0.8, stagger: 0.15, ease: 'power2.out',
                        scrollTrigger: {
                            trigger: philosophyRef.current,
                            start: "top 70%",
                        }
                    }
                );

                // Parallax Background
                gsap.to('.parallax-bg', {
                    yPercent: 30,
                    ease: "none",
                    scrollTrigger: {
                        trigger: philosophyRef.current,
                        start: "top bottom",
                        end: "bottom top",
                        scrub: true
                    }
                });
            }

            // 3. PROTOCOL STACKING (Sticky Stacking Archive)
            if (protocolWrapperRef.current) {
                scrollCardsRef.current.forEach((card, i) => {
                    ScrollTrigger.create({
                        trigger: card,
                        start: "top top",
                        endTrigger: protocolWrapperRef.current,
                        end: "bottom bottom",
                        pin: true,
                        pinSpacing: false,
                        id: `card-${i}`,
                        invalidateOnRefresh: true,
                    });

                    // Animation for the card underneath when a new card scrolls over
                    if (i < scrollCardsRef.current.length - 1) {
                        gsap.to(card, {
                            scale: 0.9,
                            opacity: 0.5,
                            filter: "blur(20px)",
                            scrollTrigger: {
                                trigger: scrollCardsRef.current[i + 1],
                                start: "top bottom",
                                end: "top top",
                                scrub: true
                            }
                        });
                    }
                });
            }

            // 4. MICRO UI TYPEWRITER
            const typeInterval = setInterval(() => {
                if (typeIndexRef.current < fullText.length) {
                    setTypedText((prev) => prev + fullText.charAt(typeIndexRef.current));
                    typeIndexRef.current += 1;
                } else {
                    // Reset
                    setTimeout(() => {
                        setTypedText("");
                        typeIndexRef.current = 0;
                    }, 4000);
                }
            }, 50);

            // 5. MICRO UI SHUFFLER
            shufflerIntervalRef.current = setInterval(() => {
                setShufflerData(prev => {
                    const newArr = [...prev];
                    const last = newArr.pop();
                    newArr.unshift(last);
                    return newArr;
                });
            }, 3000);

            // 6. MICRO UI CURSOR ANIMATION
            const runSchedulerCycle = () => {
                if (!cursorRef.current) return;
                const tl = gsap.timeline({
                    onStart: () => setActiveDay(null)
                });

                tl.fromTo(cursorRef.current, { x: 0, y: 150, opacity: 0 }, { opacity: 1, duration: 0.3 })
                    .to(cursorRef.current, { x: 100, y: 40, duration: 1, ease: "power2.inOut" })
                    .to(cursorRef.current, { scale: 0.9, duration: 0.1, yoyo: true, repeat: 1, onComplete: () => setActiveDay(3) })
                    .to(cursorRef.current, { x: 200, y: 90, duration: 1, ease: "power2.inOut", delay: 0.4 })
                    .to(cursorRef.current, { scale: 0.9, duration: 0.1, yoyo: true, repeat: 1 })
                    .to(cursorRef.current, { opacity: 0, duration: 0.3, delay: 0.5 });

                // repeat loop
                gsap.delayedCall(4.5, runSchedulerCycle);
            };
            runSchedulerCycle();

            return () => {
                clearInterval(typeInterval);
                clearInterval(shufflerIntervalRef.current);
            };
        });

        return () => ctx.revert();
    }, []);

    // ─── Canvas Scroll Animation ──────────────────────────────────────────────
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx2d = canvas.getContext('2d');
        const TOTAL = 142;

        // draw a single frame cover-fit onto canvas
        const drawFrame = (img, ctx, cvs) => {
            ctx.clearRect(0, 0, cvs.width, cvs.height);
            const scale = Math.max(cvs.width / img.naturalWidth, cvs.height / img.naturalHeight);
            const w = img.naturalWidth * scale;
            const h = img.naturalHeight * scale;
            const x = (cvs.width - w) / 2;
            const y = (cvs.height - h) / 2;
            ctx.drawImage(img, x, y, w, h);
        };

        // Fit canvas to viewport
        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            const img = imagesRef.current[currentFrameRef.current];
            if (img && img.complete) {
                drawFrame(img, ctx2d, canvas);
            }
        };
        resize();
        window.addEventListener('resize', resize);

        // Preload all frames
        let loaded = 0;
        const images = [];
        for (let i = 1; i <= TOTAL; i++) {
            const img = new Image();
            const num = String(i).padStart(5, '0');
            img.src = `/gursel/${num}.jpg`;
            img.onload = () => {
                loaded++;
                // Draw first frame as soon as it's ready
                if (i === 1) {
                    drawFrame(img, ctx2d, canvas);
                }
            };
            images.push(img);
        }
        imagesRef.current = images;

        // Scroll handler with RAF
        const handleScroll = () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            rafRef.current = requestAnimationFrame(() => {
                const scrollEl = heroScrollRef.current;
                if (!scrollEl) return;
                const rect = scrollEl.getBoundingClientRect();
                const scrollTop = -rect.top;
                const scrollHeight = scrollEl.offsetHeight - window.innerHeight;
                const progress = Math.min(Math.max(scrollTop / scrollHeight, 0), 1);
                const frameIndex = Math.min(Math.floor(progress * (TOTAL - 1)), TOTAL - 1);

                if (frameIndex !== currentFrameRef.current) {
                    currentFrameRef.current = frameIndex;
                    const img = imagesRef.current[frameIndex];
                    if (img && img.complete) {
                        drawFrame(img, ctx2d, canvas);
                    }
                }
            });
        };

        window.addEventListener('scroll', handleScroll, { passive: true });

        return () => {
            window.removeEventListener('resize', resize);
            window.removeEventListener('scroll', handleScroll);
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, []);

    // Morphing Navbar logic
    const [scrolled, setScrolled] = useState(false);
    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 100);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div className="bg-[#0A0A14] min-h-screen text-[#F0EFF4] font-sans selection:bg-[#7B61FF] selection:text-white relative">
            <div className="noise-overlay" />

            {/* A. NAVBAR — "The Floating Island" */}
            <div className="fixed top-6 left-0 right-0 z-50 flex justify-center px-4">
                <nav className={`transition-all duration-500 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] flex items-center justify-between px-6 py-3 rounded-[3rem] ${scrolled ? 'bg-[#0A0A14]/60 backdrop-blur-xl border border-white/10 w-full max-w-4xl shadow-2xl' : 'w-full max-w-7xl bg-transparent border-transparent'
                    }`}>
                    <div className="font-bold text-lg tracking-tight flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7B61FF] to-indigo-600 flex items-center justify-center">
                            <span className="text-white text-sm">M</span>
                        </div>
                        <span>MUHASY</span>
                    </div>

                    <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
                        <a href="#features" className="hover:text-white transition-colors hover:-translate-y-px transform block">Kabiliyetler</a>
                        <a href="#philosophy" className="hover:text-white transition-colors hover:-translate-y-px transform block">Manifesto</a>
                        <a href="#protocol" className="hover:text-white transition-colors hover:-translate-y-px transform block">Protokol</a>
                    </div>

                    <button onClick={() => navigate('/login')} className="relative overflow-hidden group bg-[#7B61FF] text-white px-5 py-2.5 rounded-full text-sm font-bold shadow-[0_4px_14px_0_rgba(123,97,255,0.39)] hover:scale-[1.03] transition-transform duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]">
                        <span className="absolute inset-0 w-full h-full bg-indigo-500 -translate-x-full group-hover:translate-x-0 transition-transform duration-500 ease-out z-0"></span>
                        <span className="relative z-10">Sisteme Giriş</span>
                    </button>
                </nav>
            </div>

            {/* B. HERO SECTION — Canvas Scroll Animation */}
            {/* Outer wrapper: tall enough to drive the scroll (300vh) */}
            <div ref={heroScrollRef} className="relative" style={{ height: '300vh' }}>

                {/* Sticky container: stays in view while user scrolls through 300vh */}
                <div className="sticky top-0 h-screen overflow-hidden" ref={heroRef}>

                    {/* Canvas — full bleed background */}
                    <canvas
                        ref={canvasRef}
                        className="absolute inset-0 w-full h-full"
                        style={{ display: 'block', background: '#0A0A14' }}
                    />

                    {/* Gradient overlay: bottom fade into site background */}
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0A0A14] pointer-events-none" />
                    {/* Left vignette so text is always readable */}
                    <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A14]/70 via-transparent to-transparent pointer-events-none" />

                    {/* Text overlay — positioned bottom-left like original */}
                    <div className="absolute bottom-0 left-0 right-0 z-10 flex items-end pb-24 px-6 md:px-16">
                        <div className="w-full md:w-2/3 lg:w-1/2 flex flex-col items-start gap-4">
                            <div className="w-12 h-1 overflow-hidden rounded-full mb-4">
                                <div className="w-full h-full bg-[#7B61FF] shadow-[0_0_15px_#7B61FF]"></div>
                            </div>
                            <h1 className="text-5xl md:text-7xl lg:text-8xl leading-[0.9] -ml-1">
                                <div ref={el => textRefs.current[0] = el} className="font-sans font-bold tracking-tight text-[#F0EFF4] drop-shadow-[0_2px_20px_rgba(0,0,0,0.8)]">Otomasyon ötesi</div>
                                <div ref={el => textRefs.current[1] = el} className="font-drama italic text-[#7B61FF] font-medium leading-[1] mt-2 pb-2 drop-shadow-2xl">sınırlarını aşın.</div>
                            </h1>
                            <p ref={el => textRefs.current[2] = el} className="text-lg md:text-xl text-gray-300 mt-4 max-w-md font-sans drop-shadow-[0_1px_10px_rgba(0,0,0,0.9)]">
                                Geleneksel evrak girişini unutun. Fiş, fatura ve Z-raporlarınızı saniyeler içinde sıfır hatayla dijitalleştirip Excel ve ERP sistemlerinize aktaran yapay zeka tabanlı muhasebe otomasyonu.
                            </p>
                            <div ref={el => textRefs.current[3] = el} className="mt-8 flex gap-4">
                                <button className="relative overflow-hidden group bg-[#7B61FF] text-white px-8 py-4 rounded-[2rem] text-sm md:text-base font-bold transition-transform hover:scale-[1.03] duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]">
                                    <span className="absolute inset-0 w-full h-full bg-indigo-500 -translate-x-full group-hover:translate-x-0 transition-transform duration-500 ease-out z-0"></span>
                                    <span className="relative z-10 flex items-center justify-center gap-2">Bekleme Listesine Katıl <ChevronRight size={18} /></span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* C. FEATURES — "Interactive Functional Artifacts" */}
            <section id="features" className="py-32 px-6 md:px-16 max-w-[1400px] mx-auto bg-[#0A0A14] relative z-10">
                <div className="mb-20">
                    <h2 className="text-3xl font-bold font-sans tracking-tight mb-2">Makine Düzeyinde Hız</h2>
                    <p className="text-gray-400 font-sans">Geleneksel işlemler yapay zeka çekirdeğimizde milisaniyelere dönüşüyor.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-auto lg:h-[450px]">
                    {/* Card 1: Diagnostic Shuffler */}
                    <div className="bg-[#18181B]/50 border border-white/5 rounded-[2rem] p-8 flex flex-col relative overflow-hidden group hover:border-[#7B61FF]/30 transition-colors">
                        <div className="mb-auto">
                            <div className="w-10 h-10 rounded-full bg-[#7B61FF]/10 flex items-center justify-center mb-6">
                                <Zap className="text-[#7B61FF]" size={18} />
                            </div>
                            <h3 className="font-bold text-xl mb-2">Biyolojik Hızda Sentez</h3>
                            <p className="text-sm text-gray-400">Binlerce evrağı insan gücünün sıfır hata payı ile eşzamanlı okur.</p>
                        </div>

                        <div className="relative h-48 mt-8 w-full perspective-1000">
                            {shufflerData.map((item, i) => {
                                // Layout logic for overlapping cards
                                const isTop = i === 0;
                                const isMid = i === 1;

                                let yOffset = isTop ? 0 : isMid ? 20 : 40;
                                let scaleStr = isTop ? 1 : isMid ? 0.95 : 0.9;
                                let zIndex = isTop ? 30 : isMid ? 20 : 10;
                                let opacity = isTop ? 1 : isMid ? 0.7 : 0.3;

                                return (
                                    <div key={item.id} className="absolute left-0 right-0 p-4 rounded-xl bg-[#2A2A35] border border-white/10 shadow-xl"
                                        style={{
                                            top: 0,
                                            transform: `translateY(${yOffset}px) scale(${scaleStr})`,
                                            zIndex: zIndex,
                                            opacity: opacity,
                                            transition: 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.8s'
                                        }}>
                                        <div className="flex justify-between items-center">
                                            <span className="font-data text-xs text-white truncate max-w-[200px]">{item.text}</span>
                                            {isTop && <Check size={14} className="text-[#7B61FF]" />}
                                        </div>
                                        <div className="text-[10px] text-gray-400 mt-2 font-data uppercase opacity-80">{item.sub}</div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Card 2: Telemetry Typewriter */}
                    <div className="bg-[#18181B]/50 border border-white/5 rounded-[2rem] p-8 flex flex-col relative overflow-hidden group hover:border-[#7B61FF]/30 transition-colors">
                        <div className="mb-auto">
                            <div className="flex justify-between items-center mb-6">
                                <div className="w-10 h-10 rounded-full bg-[#7B61FF]/10 flex items-center justify-center">
                                    <Target className="text-[#7B61FF]" size={18} />
                                </div>
                                <div className="flex items-center gap-2 bg-black/40 px-3 py-1 rounded-full border border-white/5">
                                    <div className="w-2 h-2 bg-[#7B61FF] rounded-full animate-pulse shadow-[0_0_10px_#7B61FF]"></div>
                                    <span className="text-[10px] font-data text-[#7B61FF]">CANLI YAYIN</span>
                                </div>
                            </div>
                            <h3 className="font-bold text-xl mb-2">Oto-Denetim Motoru</h3>
                            <p className="text-sm text-gray-400">Veriler çekilirken arka planda 4.000+ anlamsal doğrulama testinden geçer.</p>
                        </div>

                        <div className="bg-black/60 rounded-xl p-4 h-48 mt-8 border border-white/5 font-data text-xs text-[#7B61FF]/80 whitespace-pre-wrap flex flex-col">
                            <div className="flex-1 overflow-hidden relative">
                                {typedText}
                                <span className="inline-block w-2.5 h-3 bg-[#7B61FF] animate-pulse ml-1 align-middle"></span>
                            </div>
                        </div>
                    </div>

                    {/* Card 3: Cursor Protocol Scheduler */}
                    <div className="bg-[#18181B]/50 border border-white/5 rounded-[2rem] p-8 flex flex-col relative overflow-hidden group hover:border-[#7B61FF]/30 transition-colors">
                        <div className="mb-auto pointer-events-none">
                            <div className="w-10 h-10 rounded-full bg-[#7B61FF]/10 flex items-center justify-center mb-6">
                                <Play className="text-[#7B61FF]" size={18} />
                            </div>
                            <h3 className="font-bold text-xl mb-2">Akıllı Raporlama</h3>
                            <p className="text-sm text-gray-400">Muhasebe operasyonlarınızı tek ekran üzerinden tamamen asenkron yönetin.</p>
                        </div>

                        <div className="relative h-48 mt-8 bg-black/30 rounded-xl border border-white/5 p-4 pointer-events-none overflow-hidden">
                            {/* Grid */}
                            <div className="grid grid-cols-7 gap-1">
                                {['P', 'P', 'S', 'Ç', 'P', 'C', 'C'].map((d, i) => (
                                    <div key={i} className={`h-8 flex items-center justify-center text-[10px] font-data rounded border border-white/5 transition-colors ${activeDay === i ? 'bg-[#7B61FF] text-white border-[#7B61FF] shadow-[0_0_15px_#7B61FF80]' : 'text-gray-500 bg-gray-900/40'}`}>
                                        {d}
                                    </div>
                                ))}
                            </div>

                            {/* Save Button */}
                            <div className="absolute bottom-4 right-4 bg-gray-800/80 px-4 py-1.5 rounded-md text-[10px] font-data border border-white/10 text-gray-300">
                                AKTAR
                            </div>

                            {/* Simulated Cursor */}
                            <div ref={cursorRef} className="absolute inset-0 pointer-events-none drop-shadow-xl z-10" style={{ opacity: 0, x: 0, y: 150 }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white transform -rotate-12">
                                    <path d="M5.5 3.21V20.8A1.2 1.2 0 007.54 21.6L11.5 17h7.3a1.2 1.2 0 00.9-2.02L5.5 3.21z" fill="white" stroke="#000" strokeWidth="1.5" strokeLinejoin="round" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* D. PHILOSOPHY — "The Manifesto" */}
            <section ref={philosophyRef} className="py-40 px-6 relative flex flex-col items-center justify-center overflow-hidden min-h-[90vh]">
                {/* Parallax Background */}
                <div className="absolute inset-0 z-0 pointer-events-none">
                    <img src="https://images.unsplash.com/photo-1520085601670-ee14aa5fa3e8?auto=format&fit=crop&q=80&w=2000" alt="Texture" className="w-full h-[150%] object-cover parallax-bg" />
                    <div className="absolute inset-0 bg-[#0A0A14]/90 mix-blend-multiply"></div>
                </div>

                <div className="relative z-10 text-center max-w-4xl mx-auto flex flex-col gap-16">
                    <p className="split-text-line text-xl md:text-2xl text-gray-400 font-sans tracking-tight">
                        Çoğu yazılım odaklanır: <span className="line-through opacity-50">Evrak Tarama Formlarına.</span>
                    </p>
                    <p className="split-text-line text-4xl md:text-6xl lg:text-7xl font-sans tracking-tight leading-[1.1]">
                        Biz odaklanıyoruz: <br className="hidden md:block" />
                        <span className="font-drama italic text-white drop-shadow-[0_0_20px_#ffffff40]">Otonom Muhasebe Operasyonlarına.</span>
                    </p>
                </div>
            </section>

            {/* E. PROTOCOL — "Sticky Stacking Archive" */}
            <section ref={protocolWrapperRef} className="relative w-full bg-[#0A0A14] flex flex-col items-center pb-[20vh]">
                {/* Step 1 */}
                <div ref={el => scrollCardsRef.current[0] = el} className="h-screen w-full flex items-center justify-center sticky top-0 p-6">
                    <div className="w-full max-w-5xl bg-[#111118] border border-white/10 rounded-[3rem] h-[75vh] p-12 md:p-20 flex flex-col justify-between shadow-2xl relative overflow-hidden group">
                        <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#7B61FF]/10 rounded-full blur-3xl pointer-events-none"></div>
                        <div className="font-data text-[#7B61FF] text-xl opacity-80">001</div>
                        <div>
                            <h3 className="text-4xl md:text-6xl font-bold font-sans tracking-tight mb-4">Veri Alımı.</h3>
                            <p className="text-gray-400 text-lg md:text-xl max-w-lg">Evraklarınız sisteme çekilir, yapay zeka tabanlı karakter ve format analizi başlar. Format bağımsız, yüksek yoğunlukta.</p>
                        </div>

                        {/* Abstract Rotating Element */}
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/3 w-[50vh] h-[50vh] opacity-20 group-hover:opacity-40 transition-opacity duration-1000">
                            <div className="w-full h-full border-[1px] border-[#7B61FF] rounded-full flex items-center justify-center animate-[spin_40s_linear_infinite]">
                                <div className="w-[80%] h-[80%] border-[2px] border-dashed border-[#7B61FF] rounded-full animate-[spin_30s_reverse_linear_infinite]"></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Step 2 */}
                <div ref={el => scrollCardsRef.current[1] = el} className="h-screen w-full flex items-center justify-center sticky top-0 p-6">
                    <div className="w-full max-w-5xl bg-[#15151F] border border-[#7B61FF]/20 rounded-[3rem] h-[75vh] p-12 md:p-20 flex flex-col justify-between shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[200px] bg-[#7B61FF]/5 blur-[100px] pointer-events-none"></div>
                        <div className="font-data text-[#7B61FF] text-xl opacity-80 tracking-widest">002</div>
                        <div className="relative z-10">
                            <h3 className="text-4xl md:text-6xl font-bold font-sans tracking-tight mb-4">Derin Analiz.</h3>
                            <p className="text-gray-400 text-lg md:text-xl max-w-lg">Yapay zeka katmanlarımız her pikseli bir anlama dönüştürür. Kararsızlık yok, net veri çıkarımı var.</p>
                        </div>

                        {/* Scanning Laser SVG */}
                        <div className="absolute right-10 top-1/2 -translate-y-1/2 w-64 h-64 border border-white/5 rounded-2xl overflow-hidden bg-black/40">
                            <div className="w-full h-px bg-cyan-400 shadow-[0_0_15px_#22d3ee] animate-[bounce-dot_3s_ease-in-out_infinite]"></div>
                            <div className="grid grid-cols-4 grid-rows-4 gap-1 p-4 h-full">
                                {Array.from({ length: 16 }).map((_, i) => (
                                    <div key={i} className="bg-gray-800/30 rounded-sm"></div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Step 3 */}
                <div ref={el => scrollCardsRef.current[2] = el} className="h-screen w-full flex items-center justify-center sticky top-0 p-6">
                    <div className="w-full max-w-5xl bg-[#1C1C24] border border-white/10 rounded-[3rem] h-[75vh] p-12 md:p-20 flex flex-col justify-between shadow-2xl relative overflow-hidden group">
                        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#7B61FF]/20 rounded-full blur-[120px] pointer-events-none"></div>
                        <div className="font-data text-white text-xl opacity-80">003</div>
                        <div className="relative z-10">
                            <h3 className="text-4xl md:text-6xl font-bold font-sans tracking-tight mb-4 text-white">Kesintisiz Entegrasyon.</h3>
                            <p className="text-gray-400 text-lg md:text-xl max-w-lg">Sıfır hata ile yapılandırılmış veri bulutu, direkt olarak ERP veya Excel dökümlerinize aktarılır.</p>
                        </div>

                        {/* Pulsing EKG path */}
                        <div className="absolute right-0 bottom-1/4 w-[60%] h-32 opacity-30 group-hover:opacity-100 transition-opacity duration-700">
                            <svg width="100%" height="100%" viewBox="0 0 500 100" preserveAspectRatio="none">
                                <path d="M0,50 L200,50 L220,20 L240,90 L260,10 L280,50 L500,50"
                                    fill="none" stroke="#7B61FF" strokeWidth="4"
                                    strokeDasharray="1000" strokeDashoffset="1000"
                                    className="animate-[pulse-text_3s_linear_infinite]"
                                >
                                    <animate attributeName="stroke-dashoffset" from="1000" to="0" dur="4s" repeatCount="indefinite" />
                                </path>
                            </svg>
                        </div>
                    </div>
                </div>
            </section>

            {/* F. MEMBERSHIP / CTA */}
            <section className="py-24 px-6 relative z-10 flex justify-center bg-[#0A0A14] border-t border-white/5">
                <div className="bg-gradient-to-br from-[#18181B] to-[#0A0A14] border border-white/10 w-full max-w-5xl rounded-[3rem] p-12 md:p-24 flex flex-col items-center text-center shadow-2xl relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-[#7B61FF]/10 to-transparent pointer-events-none"></div>
                    <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 font-sans">Muhasebeni Yeniden İnşa Et</h2>
                    <p className="text-gray-400 max-w-xl text-lg mb-10">Zamanınızı operasyonel yüke değil, stratejik büyümeye ayırmak için ilk adımı atın.</p>
                    <button onClick={() => navigate('/login')} className="relative overflow-hidden group bg-[#7B61FF] text-white px-10 py-5 rounded-full text-lg font-bold shadow-[0_4px_24px_0_rgba(123,97,255,0.4)] hover:scale-[1.03] transition-transform duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] flex items-center gap-3">
                        <span className="absolute inset-0 w-full h-full bg-indigo-500 -translate-x-full group-hover:translate-x-0 transition-transform duration-500 ease-out z-0"></span>
                        <span className="relative z-10 flex items-center gap-2">Hemen Başla <ArrowRight size={20} /></span>
                    </button>
                </div>
            </section>

            {/* G. FOOTER */}
            <footer className="bg-[#05050A] rounded-t-[4rem] px-8 py-16 mt-0 relative z-10 border-t border-white/5">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="flex flex-col items-center md:items-start">
                        <div className="text-2xl font-bold tracking-tight flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7B61FF] to-blue-600 flex items-center justify-center">
                                <span className="text-white text-sm">M</span>
                            </div>
                            <span>MUHASY</span>
                        </div>
                        <p className="text-gray-500 text-sm font-data">© {new Date().getFullYear()} Nura Algorithmic Finance.</p>
                    </div>

                    {/* System Status */}
                    <div className="flex items-center gap-3 bg-[#111118] px-4 py-2 text-xs font-data border border-white/5 rounded-full">
                        <div className="w-2 h-2 rounded-full bg-[#7B61FF] animate-pulse shadow-[0_0_8px_#7B61FF]"></div>
                        <span className="text-gray-400 tracking-wider">SYSTEM_OPERATIONAL</span>
                    </div>
                </div>
            </footer>
        </div>
    );
}
