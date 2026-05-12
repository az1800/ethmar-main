"use client";

import Header from "../components/Header";
import Footer from "../components/Footer";
import { useState, useEffect, useRef } from "react";
import getPartners, { Partner } from "../Services/partnersAPI";
import { fetchAchievements } from "../Services/acheivementsAPI";
import { Achievement } from "../components/dashboard/types";
import Link from "next/link";

// ─── Config ────────────────────────────────────────────────────────────────
const STATS_CFG = [
  { raw: 100, suffix: "", label: "مستفيد", description: "في السنة الأولى" },
  { raw: 202, suffix: "", label: "مستفيد", description: "في السنة الثانية" },
  { raw: 104, suffix: "k", label: "مستفيد", description: "المستهدف التراكمي" },
];

const GOALS = [
  { text: "تعزيز الوعي المالي لدى الطلاب والأفراد", side: "right" as const },
  { text: "تعزيز مهارات التخطيط المالي", side: "left" as const },
  {
    text: "تزويد الطلاب بالأدوات والأساليب اللازمة لتقسيم الدخل",
    side: "right" as const,
  },
];

const VISIBLE_PARTNERS = 3;
const COUNT_MS = 2000;
const CHART_DRAW_MS = 1200;

// ─── Count-up hook ─────────────────────────────────────────────────────────
function useCountUp(target: number, duration: number, active: boolean) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!active) return;
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setCount(Math.floor((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) requestAnimationFrame(step);
      else setCount(target);
    };
    requestAnimationFrame(step);
  }, [active, target, duration]);

  return count;
}

// ─── Inline stock-chart SVG ────────────────────────────────────────────────
function StockChartSVG({
  drawChart,
  showArrow,
}: {
  drawChart: boolean;
  showArrow: boolean;
}) {
  const DASH = 260;
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ overflow: "visible", zIndex: 2 }}
    >
      <path
        d="M 4,90 L 16,80 L 26,78 L 38,64 L 47,68 L 58,52 L 68,48 L 78,33 L 87,18 L 94,8"
        fill="none"
        stroke="#2C953F"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        style={{
          strokeDasharray: DASH,
          strokeDashoffset: drawChart ? 0 : DASH,
          transition: drawChart
            ? `stroke-dashoffset ${CHART_DRAW_MS}ms ease-out`
            : "none",
        }}
      />
      <path
        d="M 94,8 L 87,17 M 94,8 L 82,6"
        fill="none"
        stroke="#2C953F"
        strokeWidth="2.2"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        style={{
          opacity: showArrow ? 1 : 0,
          transform: showArrow ? "translateY(0)" : "translateY(6px)",
          transition: showArrow
            ? "opacity 0.3s ease-out, transform 0.35s cubic-bezier(0.34,1.56,0.64,1)"
            : "none",
          transformBox: "fill-box",
          transformOrigin: "center",
        }}
      />
    </svg>
  );
}

// ─── Stat item ─────────────────────────────────────────────────────────────
function StatItem({
  raw,
  suffix,
  label,
  description,
  active,
}: {
  raw: number;
  suffix: string;
  label: string;
  description: string;
  active: boolean;
}) {
  const count = useCountUp(raw, COUNT_MS, active);
  const [drawChart, setDrawChart] = useState(false);
  const [showArrow, setShowArrow] = useState(false);

  useEffect(() => {
    if (!active) return;
    const t1 = setTimeout(() => setDrawChart(true), COUNT_MS + 50);
    const t2 = setTimeout(
      () => setShowArrow(true),
      COUNT_MS + 50 + CHART_DRAW_MS + 100
    );
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [active]);

  return (
    <div className="group flex flex-col items-center bg-white rounded-3xl px-6 py-8 sm:px-8 sm:py-10 border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
      <div className="w-8 h-0.5 bg-[#1f682c] rounded-full mb-5 opacity-35" />
      <div className="relative inline-block" style={{ lineHeight: 1 }}>
        <span
          className="relative text-[#1f682c] font-bold leading-none"
          style={{
            fontSize: "clamp(2.2rem, 8vw, 4.5rem)",
            zIndex: 1,
            position: "relative",
          }}
        >
          +{count}
          {suffix}
        </span>
        <StockChartSVG drawChart={drawChart} showArrow={showArrow} />
      </div>
      <span className="text-[#1f682c] text-lg sm:text-xl font-semibold mt-4">
        {label}
      </span>
      <span className="text-gray-400 text-xs sm:text-sm mt-1.5 text-center">
        {description}
      </span>
    </div>
  );
}

// ─── Partners carousel ─────────────────────────────────────────────────────
function PartnersCarousel({
  partners,
  loading,
}: {
  partners: Partner[];
  loading: boolean;
}) {
  const [idx, setIdx] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const visibleCount = isMobile ? 1 : VISIBLE_PARTNERS;
  const total = partners.length;
  const pageCount = Math.ceil(total / visibleCount);
  const maxIdx = Math.max(0, pageCount - 1);

  // Reset idx when screen size changes to avoid out-of-bounds
  useEffect(() => {
    setIdx(0);
  }, [isMobile]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-2xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }

  if (total === 0) {
    return (
      <p className="text-center text-gray-400 py-8">لا يوجد شركاء حالياً</p>
    );
  }

  const start = idx * visibleCount;
  const visible = partners.slice(start, start + visibleCount);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        {/* Prev */}
        <button
          onClick={() => setIdx((i) => Math.max(0, i - 1))}
          disabled={idx <= 0}
          className="flex-shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#1f682c] text-white text-lg flex items-center justify-center disabled:opacity-25 hover:bg-[#164b20] active:scale-95 transition-all duration-200 shadow-sm"
        >
          ›
        </button>

        {/* Cards */}
        <div
          className={`flex-1 grid gap-4 ${isMobile ? "grid-cols-1" : "grid-cols-3"}`}
          style={{ direction: "ltr" }}
        >
          {visible.map((p) => (
            <div
              key={p.id}
              className="rounded-2xl border border-gray-200 bg-white flex items-center justify-center h-28 sm:h-36 shadow-sm overflow-hidden hover:border-[#1f682c]/30 hover:shadow-md transition-all duration-300"
            >
              {p.Company_Logo ? (
                <img
                  src={p.Company_Logo}
                  alt={p.Company_name}
                  className="max-h-20 sm:max-h-24 max-w-full object-contain px-4 grayscale hover:grayscale-0 transition-all duration-300"
                />
              ) : (
                <span className="text-gray-500 text-sm text-center px-3 font-medium">
                  {p.Company_name}
                </span>
              )}
            </div>
          ))}
          {/* Fill empty slots on last page */}
          {Array.from({ length: visibleCount - visible.length }).map((_, i) => (
            <div key={`empty-${i}`} className="h-28 sm:h-36" />
          ))}
        </div>

        {/* Next */}
        <button
          onClick={() => setIdx((i) => Math.min(maxIdx, i + 1))}
          disabled={idx >= maxIdx}
          className="flex-shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#1f682c] text-white text-lg flex items-center justify-center disabled:opacity-25 hover:bg-[#164b20] active:scale-95 transition-all duration-200 shadow-sm"
        >
          ‹
        </button>
      </div>

      {/* Page dots */}
      {pageCount > 1 && (
        <div className="flex justify-center gap-2 mt-5 flex-wrap">
          {Array.from({ length: pageCount }).map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === idx ? "w-6 bg-[#1f682c]" : "w-1.5 bg-gray-300"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Achievement card ──────────────────────────────────────────────────────
function AchievementCard({ achievement }: { achievement: Achievement }) {
  return (
    <div className="group relative w-full aspect-video rounded-2xl overflow-hidden bg-[#edf2ee] cursor-pointer shadow-sm hover:shadow-xl transition-shadow duration-300">
      {achievement.image_url ? (
        <img
          src={achievement.image_url}
          alt={achievement.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <svg
            className="w-14 h-14 text-[#1f682c]/20"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0d3318]/80 via-[#0d3318]/15 to-transparent opacity-75 group-hover:opacity-90 transition-opacity duration-300" />
      <p className="absolute bottom-0 right-0 left-0 px-4 py-4 sm:px-5 sm:py-5 text-white text-base sm:text-xl font-semibold text-right leading-snug">
        {achievement.title}
      </p>
      <div className="absolute bottom-0 right-0 left-0 h-0.5 bg-[#2C953F] scale-x-0 group-hover:scale-x-100 origin-right transition-transform duration-300" />
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────
export default function Home() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [partnersLoading, setPartnersLoading] = useState(true);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [achievementsLoading, setAchievementsLoading] = useState(true);
  const [statsVisible, setStatsVisible] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getPartners()
      .then(({ data }) => setPartners(data ?? []))
      .catch(console.error)
      .finally(() => setPartnersLoading(false));

    fetchAchievements()
      .then((data) => setAchievements(data ?? []))
      .catch(console.error)
      .finally(() => setAchievementsLoading(false));
  }, []);

  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setStatsVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const displayedAchievements = achievements.slice(0, 4);

  return (
    <div className="font-sans overflow-x-hidden">
      <style>{`
        /* ── Hero chart animations ── */
        .hero-cross-line {
          stroke-dasharray: 2600;
          stroke-dashoffset: 2600;
          animation: drawCrossLine 3.8s cubic-bezier(0.4,0,0.2,1) 0.5s forwards;
        }
        .hero-arrow-head {
          opacity: 0;
          animation: showHeroArrow 0.35s ease-out 4.1s forwards;
        }
        .hero-cross-fill {
          opacity: 0;
          animation: fadeCrossFill 1.1s ease-out 2.8s forwards;
        }
        @keyframes drawCrossLine { to { stroke-dashoffset: 0; } }
        @keyframes showHeroArrow { to { opacity: 1; } }
        @keyframes fadeCrossFill { to { opacity: 1; } }

        /* ── Badge pulse dot ── */
        .pulse-dot { animation: pulseDot 2.4s ease-in-out infinite; }
        @keyframes pulseDot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.35; transform: scale(0.65); }
        }

        /* ── Scroll bounce indicator ── */
        .scroll-bounce { animation: scrollBounce 2.2s ease-in-out infinite; }
        @keyframes scrollBounce {
          0%, 100% { transform: translateY(0); opacity: 0.45; }
          50% { transform: translateY(8px); opacity: 0.9; }
        }

        /* ── Hero buttons ── */
        .hero-btn-primary {
          background: white;
          color: #164b20;
          font-weight: 600;
          transition: background 0.2s ease, transform 0.15s ease, box-shadow 0.2s ease;
        }
        .hero-btn-primary:hover {
          background: #f0faf2;
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        .hero-btn-primary:active { transform: translateY(0px); }

        .hero-btn-secondary {
          border: 1.5px solid rgba(255,255,255,0.3);
          color: white;
          font-weight: 600;
          backdrop-filter: blur(6px);
          transition: background 0.2s ease, border-color 0.2s ease, transform 0.15s ease;
        }
        .hero-btn-secondary:hover {
          background: rgba(255,255,255,0.1);
          border-color: rgba(255,255,255,0.65);
          transform: translateY(-2px);
        }
        .hero-btn-secondary:active { transform: translateY(0px); }

        /* ── Goals hover — desktop only ── */
        @media (hover: hover) {
          .goal-right { transition: transform 0.25s ease; }
          .goal-right:hover { transform: translateX(-5px); }
          .goal-left  { transition: transform 0.25s ease; }
          .goal-left:hover  { transform: translateX(5px); }
        }

        /* ── Section title underline accent ── */
        .section-heading::after {
          content: '';
          display: block;
          width: 44px;
          height: 3px;
          background: #1f682c;
          border-radius: 2px;
          margin: 14px auto 0;
          opacity: 0.45;
        }

        /* ── Mission/Vision: flatten clip-path on mobile ── */
        @media (max-width: 767px) {
          .mv-dark-panel {
            clip-path: none !important;
            position: relative !important;
          }
          .mv-light-panel {
            display: none;
          }
        }
      `}</style>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <div className="relative bg-[#164b20] overflow-hidden min-h-screen flex flex-col">
        {/* Radial glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 70% 55% at 50% 65%, rgba(44,149,63,0.22) 0%, transparent 68%)",
            zIndex: 0,
          }}
        />

        {/* Grain texture */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
            backgroundRepeat: "repeat",
            backgroundSize: "180px",
            opacity: 0.025,
            zIndex: 0,
          }}
        />

        {/* Animated stock chart */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ direction: "ltr", zIndex: 1 }}
        >
          <svg
            viewBox="0 0 1440 900"
            preserveAspectRatio="none"
            className="w-full h-full"
          >
            <defs>
              <linearGradient
                id="crossLineGradient"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor="rgba(107,181,121,0.16)" />
                <stop offset="100%" stopColor="rgba(107,181,121,0)" />
              </linearGradient>
              <filter
                id="lineGlow"
                x="-20%"
                y="-20%"
                width="140%"
                height="140%"
              >
                <feGaussianBlur stdDeviation="2.4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <polygon
              className="hero-cross-fill"
              points="0,895 70,865 145,825 200,795 225,810 285,765 330,710 365,735 430,690 500,625 535,675 575,650 620,580 650,600 710,535 770,470 830,430 875,455 930,405 990,315 1050,345 1085,470 1135,430 1190,335 1220,355 1270,235 1310,310 1365,225 1410,105 1432,18 1440,900 0,900"
              fill="url(#crossLineGradient)"
            />
            <polyline
              className="hero-cross-line"
              points="0,895 70,865 145,825 200,795 225,810 285,765 330,710 365,735 430,690 500,625 535,675 575,650 620,580 650,600 710,535 770,470 830,430 875,455 930,405 990,315 1050,345 1085,470 1135,430 1190,335 1220,355 1270,235 1310,310 1365,225 1410,105 1432,18"
              fill="none"
              stroke="rgba(150,220,160,0.42)"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="miter"
              filter="url(#lineGlow)"
            />
            <path
              className="hero-arrow-head"
              d="M 1418,32 L 1432,18 L 1437,37"
              fill="none"
              stroke="rgba(150,220,160,0.6)"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <div className="relative z-10">
          <Header />
        </div>

        {/* Hero content */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-4 sm:px-6 pb-20 pt-4">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 mb-6 sm:mb-8 px-4 py-1.5 sm:px-5 sm:py-2 rounded-full border border-white/20 bg-white/8 backdrop-blur-sm">
            <span className="pulse-dot w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#4ade80] flex-shrink-0" />
            <span className="text-white/75 text-xs sm:text-sm tracking-[0.15em] sm:tracking-[0.2em] font-medium">
              مبادرة مالية طلابية
            </span>
          </div>

          <h1
            className="text-white font-bold mb-5 sm:mb-7 drop-shadow-lg w-full"
            style={{ fontSize: "clamp(2.2rem, 8vw, 7.5rem)", lineHeight: 1.08 }}
          >
            مبادرة إثمار المالية
          </h1>

          <p
            className="text-white/65 max-w-xs sm:max-w-xl leading-relaxed mb-8 sm:mb-11 px-2"
            style={{ fontSize: "clamp(0.9rem, 3.5vw, 1.15rem)" }}
          >
            مبادرة مالية تهدف إلى تمكين الطلاب والطالبات من اكتساب المعرفة
            اللازمة لإدارة شؤونهم المالية وخلق مجتمع يتمتع بالوعي المالي
            <span className="text-white/30 mx-2">|</span>
            إحدى مبادرات برنامج الشراكة الطلابية
          </p>


        </div>

        {/* Scroll indicator — hidden on very small screens */}
       
      </div>

      {/* ── Mission & Vision ─────────────────────────────────────────── */}
      {/* Mobile: stacked cards. Desktop: diagonal split. */}
      <div className="relative overflow-hidden">
        {/* Desktop diagonal backgrounds */}
        <div className="mv-light-panel absolute inset-0 bg-[#7ba789] hidden md:block" />
        <div
          className="mv-dark-panel absolute inset-0 bg-[#17652a] hidden md:block"
          style={{
            clipPath: "polygon(62% 0%, 100% 0%, 100% 100%, 36% 100%, 60% 6%)",
          }}
        />
        {/* Diagonal texture — desktop only */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04] hidden md:block"
          style={{
            backgroundImage:
              "repeating-linear-gradient(135deg, white 0, white 1px, transparent 1px, transparent 40px)",
            zIndex: 1,
          }}
        />

        {/* Mobile: two stacked full-width cards */}
        <div className="md:hidden flex flex-col">
          <div className="bg-[#7ba789] px-6 py-12 text-right">
            <span className="text-white/30 text-xs font-semibold tracking-[0.35em] block mb-3">
              MISSION
            </span>
            <h2 className="text-white font-bold text-3xl mb-3">رسالتنا</h2>
            <div className="w-10 h-0.5 bg-white/35 rounded-full mb-4 ml-auto" />
            <p className="text-white/85 text-base leading-[1.9]">
              تمكين الطلاب والطالبات من اكتساب المعرفة والمهارات اللازمة لإدارة
              شؤونهم المالية, وخلق مجتمع يتمتع بالوعي المالي.
            </p>
          </div>
          <div className="bg-[#17652a] px-6 py-12 text-right">
            <span className="text-white/30 text-xs font-semibold tracking-[0.35em] block mb-3">
              VISION
            </span>
            <h2 className="text-white font-bold text-3xl mb-3">رؤيتنا</h2>
            <div className="w-10 h-0.5 bg-white/35 rounded-full mb-4 ml-auto" />
            <p className="text-white/85 text-base leading-[1.9]">
              أن نكون روادًا في مجال التوعية المالية, ملهمين للجيل الصاعد
              بتمكينهم من اتخاذ قرارات مالية سليمة, ودعمهم لتحقيق الاستقلال
              المالي.
            </p>
          </div>
        </div>

        {/* Desktop: diagonal grid */}
        <div className="hidden md:grid relative z-10 w-full max-w-6xl mx-auto px-6 py-20 grid-cols-2">
          <div className="flex flex-col justify-center text-right px-8 md:px-16 pb-14 md:pb-0">
            <span className="text-white/25 text-xs font-semibold tracking-[0.35em] mb-4">
              MISSION
            </span>
            <h2
              className="text-white font-bold mb-4"
              style={{
                fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)",
                textShadow: "0 4px 24px rgba(0,0,0,0.18)",
              }}
            >
              رسالتنا
            </h2>
            <div className="w-10 h-0.5 bg-white/35 rounded-full mb-5 ml-auto" />
            <p className="text-white/82 leading-[1.95] text-lg">
              تمكين الطلاب والطالبات من اكتساب المعرفة والمهارات اللازمة لإدارة
              شؤونهم المالية, وخلق مجتمع يتمتع بالوعي المالي.
            </p>
          </div>
          <div className="flex flex-col justify-center text-right px-8 md:px-16 pt-14 md:pt-0">
            <span className="text-white/25 text-xs font-semibold tracking-[0.35em] mb-4">
              VISION
            </span>
            <h2
              className="text-white font-bold mb-4"
              style={{
                fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)",
                textShadow: "0 4px 24px rgba(0,0,0,0.18)",
              }}
            >
              رؤيتنا
            </h2>
            <div className="w-10 h-0.5 bg-white/35 rounded-full mb-5 ml-auto" />
            <p className="text-white/82 leading-[1.95] text-lg">
              أن نكون روادًا في مجال التوعية المالية, ملهمين للجيل الصاعد
              بتمكينهم من اتخاذ قرارات مالية سليمة, ودعمهم لتحقيق الاستقلال
              المالي.
            </p>
          </div>
        </div>
      </div>

      {/* ── Stats ────────────────────────────────────────────────────── */}
      <div ref={statsRef} className="bg-[#f3f5f8] px-4 sm:px-6 py-16 sm:py-24">
        <div className="max-w-4xl mx-auto text-center mb-12 sm:mb-16">
          <h2
            className="text-[#1f682c] font-bold section-heading"
            style={{ fontSize: "clamp(1.6rem, 5vw, 2.8rem)" }}
          >
            إثمار في أرقام
          </h2>
        </div>
        {/* Single column on mobile, 3 cols on sm+ */}
        <div className="max-w-4xl w-full mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
          {STATS_CFG.map((s, i) => (
            <StatItem key={i} {...s} active={statsVisible} />
          ))}
        </div>
      </div>

      {/* ── Goals ────────────────────────────────────────────────────── */}
      <div className="bg-white py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center mb-14 sm:mb-20">
          <h2
            className="text-[#1f682c] font-bold section-heading"
            style={{ fontSize: "clamp(1.6rem, 5vw, 2.8rem)" }}
          >
            أهدافنا
          </h2>
        </div>

        <div className="max-w-3xl mx-auto flex flex-col gap-12 sm:gap-16">
          {GOALS.map((g, i) => (
            <div
              key={i}
              className={`${g.side === "right" ? "goal-right" : "goal-left"} relative flex flex-col items-end`}
            >
              {/* Faded background ordinal — smaller on mobile */}
              <span
                className="absolute select-none font-black text-[#1f682c] pointer-events-none"
                style={{
                  fontSize: "clamp(5rem, 18vw, 9rem)",
                  opacity: 0.04,
                  lineHeight: 1,
                  top: "-1rem",
                  right: "-0.25rem",
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>

              <span className="text-[#1f682c]/35 text-xs font-semibold tracking-[0.35em] mb-2 sm:mb-3">
                {String(i + 1).padStart(2, "0")}
              </span>

              {/* Always right-aligned on mobile for consistency; alternates on sm+ */}
              <p
                className={`relative text-[#1a5620] font-medium text-right max-w-full sm:max-w-md z-10 ${
                  g.side === "left" ? "sm:text-left sm:self-start" : ""
                }`}
                style={{
                  fontSize: "clamp(1.1rem, 4vw, 1.55rem)",
                  lineHeight: 1.65,
                }}
              >
                {g.text}
              </p>

              <div
                className={`mt-3 sm:mt-4 h-px rounded-full self-end ${
                  g.side === "left"
                    ? "sm:self-start sm:bg-gradient-to-r bg-gradient-to-l"
                    : "bg-gradient-to-l"
                } from-[#1f682c] to-transparent`}
                style={{ width: "clamp(8rem, 55vw, 20rem)" }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── Partners ─────────────────────────────────────────────────── */}
      <div className="bg-[#f3f5f8] py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center mb-10 sm:mb-14">
          <h2
            className="text-[#1f682c] font-bold section-heading"
            style={{ fontSize: "clamp(1.6rem, 5vw, 2.8rem)" }}
          >
            شركاء النجاح
          </h2>
          <p className="text-gray-400 text-sm sm:text-base mt-4 sm:mt-5">
            نفخر بشراكات تُرسّخ أثر المبادرة وتوسّع مدى وصولها
          </p>
        </div>
        <PartnersCarousel partners={partners} loading={partnersLoading} />
      </div>

      {/* ── Achievements ─────────────────────────────────────────────── */}
      <div className="bg-white py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center mb-12 sm:mb-16">
          <h2
            className="text-[#1f682c] font-bold section-heading"
            style={{ fontSize: "clamp(1.6rem, 5vw, 2.8rem)" }}
          >
            إنجازاتنا
          </h2>
          <p className="text-gray-400 text-sm sm:text-base mt-4 sm:mt-5">
            محطات فارقة في مسيرة إثمار المالية
          </p>
        </div>

        {achievementsLoading ? (
          <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="aspect-video rounded-2xl bg-gray-100 animate-pulse"
              />
            ))}
          </div>
        ) : displayedAchievements.length > 0 ? (
          <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {displayedAchievements.map((a) => (
              <AchievementCard key={a.id} achievement={a} />
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-400 py-8">
            لا توجد إنجازات حالياً
          </p>
        )}

        <div className="max-w-4xl mx-auto mt-8 sm:mt-10">
          <Link href="/acheivements">
            <button className="w-full border-2 border-[#164b20] text-[#164b20] hover:bg-[#164b20] hover:text-white font-semibold py-4 sm:py-5 rounded-2xl transition-all duration-300 text-lg sm:text-xl tracking-wide">
              عرض جميع الإنجازات
            </button>
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}
