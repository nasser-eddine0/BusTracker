import { useRef, useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";
import { Line, Bar, Doughnut } from "react-chartjs-2";
import PanelCard from "./PanelCard";
import { useLanguage } from "../../i18n";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Filler,
  Tooltip,
  Legend
);

/* ── colour palette ───────────────────────── */
const PALETTE = {
  accent:      "#F4C542",
  accentLight: "rgba(244, 197, 66, 0.18)",
  dark:        "#111827",
  darkSoft:    "rgba(17, 24, 39, 0.55)",
  rose:        "#fb7185",
  roseSoft:    "rgba(251, 113, 133, 0.18)",
  emerald:     "#34d399",
  emeraldSoft: "rgba(52, 211, 153, 0.18)",
  sky:         "#38bdf8",
  skySoft:     "rgba(56, 189, 248, 0.18)",
  violet:      "#a78bfa",
  violetSoft:  "rgba(167, 139, 250, 0.18)",
  amber:       "#fbbf24",
  amberSoft:   "rgba(251, 191, 36, 0.18)",
};

const SERIES_COLORS = [
  PALETTE.accent,
  PALETTE.dark,
  PALETTE.rose,
  PALETTE.emerald,
  PALETTE.sky,
  PALETTE.violet,
];

const SERIES_BG = [
  PALETTE.accentLight,
  PALETTE.darkSoft,
  PALETTE.roseSoft,
  PALETTE.emeraldSoft,
  PALETTE.skySoft,
  PALETTE.violetSoft,
];

const DOUGHNUT_COLORS = [
  PALETTE.accent,
  PALETTE.dark,
  PALETTE.rose,
  PALETTE.emerald,
  PALETTE.sky,
  PALETTE.violet,
  PALETTE.amber,
];

const DOUGHNUT_HOVER = [
  "#e0b233",
  "#1f2937",
  "#f43f5e",
  "#10b981",
  "#0ea5e9",
  "#8b5cf6",
  "#f59e0b",
];

/* ── shared chart options ─────────────────── */
const BASE_FONT = {
  family: "'Manrope', 'Segoe UI', ui-sans-serif, system-ui, sans-serif",
  weight: 600,
};

function buildGradient(ctx, chartArea, colorStart, colorEnd) {
  if (!chartArea) return colorStart;
  const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
  gradient.addColorStop(0, colorEnd);
  gradient.addColorStop(1, colorStart);
  return gradient;
}

/* ── COMPONENT ────────────────────────────── */
function ChartCard({
  title,
  subtitle,
  tone = "line",        // "line" | "bar" | "doughnut"
  footer,
  metrics = [],
  categories = [],
  series = [],
  seriesLabels = [],
}) {
  const chartRef = useRef(null);
  const { t } = useLanguage();

  /* ── line chart ──────────────────────────── */
  const lineData = useMemo(() => {
    return {
      labels: categories,
      datasets: series.map((s, i) => ({
        label: seriesLabels[i] || `Serie ${i + 1}`,
        data: s.data,
        borderColor: SERIES_COLORS[i % SERIES_COLORS.length],
        backgroundColor: SERIES_BG[i % SERIES_BG.length],
        borderWidth: 3,
        pointRadius: 5,
        pointHoverRadius: 8,
        pointBackgroundColor: "#fff",
        pointBorderColor: SERIES_COLORS[i % SERIES_COLORS.length],
        pointBorderWidth: 2.5,
        pointHoverBorderWidth: 3,
        tension: 0.4,
        fill: i === 0,
      })),
    };
  }, [categories, series, seriesLabels]);

  const lineOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    animation: {
      duration: 900,
      easing: "easeOutQuart",
    },
    plugins: {
      legend: {
        display: series.length > 1,
        position: "top",
        align: "end",
        labels: {
          ...BASE_FONT,
          color: "#374151",
          usePointStyle: true,
          pointStyle: "circle",
          padding: 16,
          boxWidth: 8,
          boxHeight: 8,
        },
      },
      tooltip: {
        backgroundColor: "#111827",
        titleColor: "#F4C542",
        bodyColor: "#e5e7eb",
        titleFont: { ...BASE_FONT, size: 13 },
        bodyFont: { ...BASE_FONT, size: 12, weight: 400 },
        padding: { top: 10, bottom: 10, left: 14, right: 14 },
        cornerRadius: 14,
        displayColors: true,
        boxPadding: 6,
        caretSize: 6,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: {
          ...BASE_FONT,
          color: "#9ca3af",
          padding: 8,
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: "rgba(148, 163, 184, 0.10)",
          lineWidth: 1,
        },
        border: { display: false, dash: [4, 4] },
        ticks: {
          ...BASE_FONT,
          color: "#9ca3af",
          padding: 12,
          precision: 0,
        },
      },
    },
  }), [series.length]);

  /* ── bar chart ───────────────────────────── */
  const barData = useMemo(() => {
    return {
      labels: categories,
      datasets: series.map((s, i) => ({
        label: seriesLabels[i] || `Serie ${i + 1}`,
        data: s.data,
        backgroundColor: (ctx) => {
          const chart = ctx.chart;
          const { ctx: context, chartArea } = chart;
          return buildGradient(
            context,
            chartArea,
            SERIES_COLORS[i % SERIES_COLORS.length],
            SERIES_BG[i % SERIES_BG.length]
          );
        },
        borderColor: SERIES_COLORS[i % SERIES_COLORS.length],
        borderWidth: 0,
        borderRadius: 12,
        borderSkipped: false,
        maxBarThickness: 44,
        hoverBackgroundColor: SERIES_COLORS[i % SERIES_COLORS.length],
      })),
    };
  }, [categories, series, seriesLabels]);

  const barOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 800,
      easing: "easeOutQuart",
    },
    plugins: {
      legend: {
        display: series.length > 1,
        position: "top",
        align: "end",
        labels: {
          ...BASE_FONT,
          color: "#374151",
          usePointStyle: true,
          pointStyle: "roundRect",
          padding: 16,
          boxWidth: 10,
          boxHeight: 10,
        },
      },
      tooltip: {
        backgroundColor: "#111827",
        titleColor: "#F4C542",
        bodyColor: "#e5e7eb",
        titleFont: { ...BASE_FONT, size: 13 },
        bodyFont: { ...BASE_FONT, size: 12, weight: 400 },
        padding: { top: 10, bottom: 10, left: 14, right: 14 },
        cornerRadius: 14,
        displayColors: true,
        boxPadding: 6,
        caretSize: 6,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: {
          ...BASE_FONT,
          color: "#9ca3af",
          padding: 8,
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: "rgba(148, 163, 184, 0.10)",
          lineWidth: 1,
        },
        border: { display: false },
        ticks: {
          ...BASE_FONT,
          color: "#9ca3af",
          padding: 12,
          precision: 0,
        },
      },
    },
  }), [series.length]);

  /* ── doughnut chart ─────────────────────── */
  const doughnutData = useMemo(() => {
    const primary = series[0]?.data || [];
    return {
      labels: categories,
      datasets: [
        {
          data: primary,
          backgroundColor: DOUGHNUT_COLORS.slice(0, primary.length),
          hoverBackgroundColor: DOUGHNUT_HOVER.slice(0, primary.length),
          borderWidth: 3,
          borderColor: "#ffffff",
          hoverBorderColor: "#ffffff",
          hoverOffset: 8,
        },
      ],
    };
  }, [categories, series]);

  const doughnutOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    cutout: "68%",
    animation: {
      animateRotate: true,
      animateScale: true,
      duration: 1000,
      easing: "easeOutQuart",
    },
    plugins: {
      legend: {
        display: true,
        position: "bottom",
        labels: {
          ...BASE_FONT,
          color: "#374151",
          usePointStyle: true,
          pointStyle: "circle",
          padding: 18,
          boxWidth: 10,
          boxHeight: 10,
        },
      },
      tooltip: {
        backgroundColor: "#111827",
        titleColor: "#F4C542",
        bodyColor: "#e5e7eb",
        titleFont: { ...BASE_FONT, size: 13 },
        bodyFont: { ...BASE_FONT, size: 12, weight: 400 },
        padding: { top: 10, bottom: 10, left: 14, right: 14 },
        cornerRadius: 14,
        displayColors: true,
        boxPadding: 6,
        caretSize: 6,
      },
    },
  }), []);

  /* ── render chart by tone ────────────────── */
  const renderChart = () => {
    switch (tone) {
      case "bar":
        return (
          <div className="chartjs-container rounded-[24px] border border-line bg-[linear-gradient(135deg,#fff7de_0%,#ffffff_100%)] px-4 pb-4 pt-6" style={{ height: 300 }}>
            <Bar ref={chartRef} data={barData} options={barOptions} />
          </div>
        );
      case "doughnut":
        return (
          <div className="chartjs-container flex items-center justify-center rounded-[24px] border border-line bg-[radial-gradient(circle_at_center,#fffaf0_0%,#ffffff_70%)] p-6" style={{ height: 320 }}>
            <div style={{ width: "100%", maxWidth: 320, height: "100%" }}>
              <Doughnut ref={chartRef} data={doughnutData} options={doughnutOptions} />
            </div>
          </div>
        );
      case "line":
      default:
        return (
          <div className="chartjs-container rounded-[24px] border border-line bg-[radial-gradient(circle_at_bottom_left,rgba(244,197,66,0.10),transparent_26%),linear-gradient(180deg,#ffffff,#fffaf0)] px-4 pb-4 pt-6" style={{ height: 300 }}>
            <Line ref={chartRef} data={lineData} options={lineOptions} />
          </div>
        );
    }
  };

  const pillLabel = tone === "bar" ? t("activity") : tone === "doughnut" ? t("distribution") : t("analysis");

  return (
    <PanelCard className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h3 className="text-2xl font-extrabold tracking-tight text-main">{title}</h3>
          {subtitle ? <p className="text-sm font-semibold text-muted">{subtitle}</p> : null}
        </div>
        <div className="app-pill">{pillLabel}</div>
      </div>

      {renderChart()}

      {metrics.length > 0 ? (
        <div className={`grid gap-4 ${metrics.length <= 2 ? "grid-cols-2" : metrics.length === 3 ? "md:grid-cols-3" : "md:grid-cols-4"}`}>
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-[20px] bg-card-soft px-4 py-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
              <p className="text-sm text-muted">{metric.label}</p>
              <strong className={`mt-2 block text-xl font-bold ${metric.color || "text-main"}`}>
                {metric.value}
              </strong>
            </div>
          ))}
        </div>
      ) : null}

      {footer ? <div>{footer}</div> : null}
    </PanelCard>
  );
}

export default ChartCard;
