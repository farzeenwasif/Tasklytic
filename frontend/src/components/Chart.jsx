import { useState, useContext, useMemo, useId } from "react";
import { TaskContext } from "../context/BillContext";

const LINE_COLOR = "#10B981";
const DOT_COLOR = "#34D399";
// The chart's full height is at least this many hours (about one work week), so a
// single small task doesn't fill the whole chart. Busier months raise the scale.
const MIN_SCALE_HOURS = 40;
// 3 months before the current one, the current month, and 2 after
const MONTHS_BEFORE = 3;
const MONTH_COUNT = 6;

// SVG layout (viewBox units)
const WIDTH = 430;
const HEIGHT = 320;
const LEFT = 44; // room for the hour labels
const RIGHT = 20;
const TOP = 36; // room for the value label above the dot
const BOTTOM = 270; // baseline (0h)

const formatHours = (v) => `${Math.round(v * 10) / 10}h`;

// Smooth line through the points (Catmull-Rom as cubic Beziers). Control points are
// clamped to the plot area so the curve never dips below 0h or above the top.
function smoothPath(points) {
  if (points.length < 2) return "";
  const clampY = (y) => Math.min(BOTTOM, Math.max(TOP, y));
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = clampY(p1.y + (p2.y - p0.y) / 6);
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = clampY(p2.y - (p3.y - p1.y) / 6);
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

const Chart = () => {
  const { tasks } = useContext(TaskContext);
  const [hovered, setHovered] = useState(null);
  const gradientId = `hours-fill-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  const months = useMemo(() => {
    const now = new Date();
    return Array.from({ length: MONTH_COUNT }, (_, i) => {
      // day 1 avoids month overflow (e.g. Jan 31 + 1 month)
      const date = new Date(now.getFullYear(), now.getMonth() - MONTHS_BEFORE + i, 1);
      return {
        label: date.toLocaleString("default", { month: "short" }),
        name: date.toLocaleString("default", { month: "long" }),
        monthIndex: date.getMonth(),
        year: date.getFullYear(),
      };
    });
  }, []);

  // Hours logged per month, grouped by due date
  const data = useMemo(
    () =>
      months.map((m) => ({
        ...m,
        value: tasks.reduce((sum, task) => {
          if (!task?.dueDate) return sum;
          const d = new Date(task.dueDate);
          return d.getMonth() === m.monthIndex && d.getFullYear() === m.year
            ? sum + (task.hoursLogged || 0)
            : sum;
        }, 0),
      })),
    [tasks, months]
  );

  const maxValue = Math.max(...data.map((d) => d.value), 0);
  // round the top of the scale up to the next 20h step
  const scaleMax = Math.max(MIN_SCALE_HOURS, Math.ceil(maxValue / 20) * 20);
  const step = (WIDTH - LEFT - RIGHT) / (data.length - 1);
  const points = data.map((d, i) => ({
    ...d,
    x: LEFT + i * step,
    y: BOTTOM - (d.value / scaleMax) * (BOTTOM - TOP),
  }));

  const linePath = smoothPath(points);
  const areaPath = `${linePath} L ${points.at(-1).x} ${BOTTOM} L ${points[0].x} ${BOTTOM} Z`;
  const gridValues = [0, 0.25, 0.5, 0.75, 1].map((f) => f * scaleMax);
  const current = points[MONTHS_BEFORE];
  const active = hovered !== null ? points[hovered] : null;

  return (
    <div className="w-full h-[335px] glass-card rounded-2xl p-5 flex flex-col">
      <div className="flex items-center justify-between shrink-0">
        <h3 className="text-white font-bold">Hours by month</h3>
        <span className="text-xs text-gray-400">by due date</span>
      </div>
      <div className="flex-1 min-h-0">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          width="100%"
          height="100%"
          preserveAspectRatio="xMidYMax meet"
          className="block overflow-visible"
          onMouseLeave={() => setHovered(null)}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={LINE_COLOR} stopOpacity="0.35" />
              <stop offset="100%" stopColor={LINE_COLOR} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* horizontal grid with hour labels */}
          {gridValues.map((v) => {
            const y = BOTTOM - (v / scaleMax) * (BOTTOM - TOP);
            return (
              <g key={v}>
                <line
                  x1={LEFT}
                  x2={WIDTH - RIGHT}
                  y1={y}
                  y2={y}
                  stroke="#ffffff"
                  strokeOpacity={v === 0 ? 0.18 : 0.07}
                  strokeDasharray={v === 0 ? undefined : "4 6"}
                />
                <text x={LEFT - 10} y={y + 4} textAnchor="end" fill="#8a8a8a" fontSize="12">
                  {formatHours(v)}
                </text>
              </g>
            );
          })}

          {/* vertical marker on the current month */}
          <line
            x1={current.x}
            x2={current.x}
            y1={TOP - 8}
            y2={BOTTOM}
            stroke={DOT_COLOR}
            strokeOpacity="0.25"
            strokeDasharray="3 5"
          />

          <path d={areaPath} fill={`url(#${gradientId})`} />
          <path
            d={linePath}
            fill="none"
            stroke={LINE_COLOR}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ filter: "drop-shadow(0 4px 10px #10B98155)" }}
          />

          {/* month labels; the current month is highlighted */}
          {points.map((p, i) => (
            <text
              key={p.label + p.year}
              x={p.x}
              y={BOTTOM + 28}
              textAnchor="middle"
              fill={i === MONTHS_BEFORE ? "#ffffff" : "#9a9a9a"}
              fontSize="15"
              fontWeight={i === MONTHS_BEFORE ? 700 : 500}
              style={{ letterSpacing: 1 }}
            >
              {p.label}
            </text>
          ))}

          {/* small dot when hovering another month */}
          {active && hovered !== MONTHS_BEFORE && (
            <circle cx={active.x} cy={active.y} r="5" fill="#18181b" stroke={LINE_COLOR} strokeWidth="2.5" />
          )}

          {/* the current-month dot */}
          <circle cx={current.x} cy={current.y} r="12" fill={DOT_COLOR} fillOpacity="0.18">
            <animate attributeName="r" values="9;14;9" dur="2.4s" repeatCount="indefinite" />
            <animate attributeName="fill-opacity" values="0.25;0.05;0.25" dur="2.4s" repeatCount="indefinite" />
          </circle>
          <circle cx={current.x} cy={current.y} r="6" fill={DOT_COLOR} stroke="#18181b" strokeWidth="2.5" />

          {/* value bubble: the hovered month, otherwise the current month */}
          {(() => {
            const p = active || current;
            const text = `${active ? p.name : "This month"}: ${formatHours(p.value)}`;
            const w = text.length * 7.4 + 20;
            const x = Math.min(WIDTH - w, Math.max(0, p.x - w / 2));
            const y = Math.max(0, p.y - 44);
            return (
              <g style={{ pointerEvents: "none" }}>
                <rect x={x} y={y} width={w} height="28" rx="7" fill="#ffffff" />
                <text x={x + w / 2} y={y + 19} textAnchor="middle" fill="#0b0b0c" fontSize="13" fontWeight="700">
                  {text}
                </text>
              </g>
            );
          })()}

          {/* invisible hover columns, one per month */}
          {points.map((p, i) => (
            <rect
              key={`hit-${i}`}
              x={p.x - step / 2}
              y={0}
              width={step}
              height={BOTTOM + 36}
              fill="transparent"
              style={{ cursor: "pointer" }}
              onMouseEnter={() => setHovered(i)}
            />
          ))}
        </svg>
      </div>
    </div>
  );
};

export default Chart;
