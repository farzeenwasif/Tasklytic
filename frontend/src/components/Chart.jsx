import React, { useState, useContext, useMemo } from "react";
import { TaskContext } from "../context/BillContext";

const BAR_COLORS = ["#10B981", "#10B981", "#10B981", "#10B981", "#10B981", "#10B981"];
const HIGHLIGHT_COLOR = "#34D399";
// Months with no hours still show a small faded stub so the chart never looks empty
const ZERO_BAR_HEIGHT = 10;
// The chart's full height is at least this many hours (about one work week), so a
// single small task doesn't fill the whole chart. Busier months raise the scale.
const MIN_SCALE_HOURS = 40;

const Chart = () => {
  const { tasks } = useContext(TaskContext);
  const [hovered, setHovered] = useState(null);

  // Generate months: 3 before current, current, 2 after
  const monthlyData = useMemo(() => {
    const currentDate = new Date();

    return Array.from({ length: 6 }, (_, i) => {
      const date = new Date(currentDate);
      date.setMonth(currentDate.getMonth() - 3 + i);

      return {
        label: date.toLocaleString("default", { month: "short" }),
        tooltip: date.toLocaleString("default", { month: "long" }),
        monthIndex: date.getMonth(),
        year: date.getFullYear(),
      };
    });
  }, []);

  // Calculate hours per month
  const data = useMemo(() => {
    return monthlyData.map((month) => {
      const monthSum = tasks.reduce((sum, task) => {
        if (!task?.dueDate) return sum;

        const taskDate = new Date(task.dueDate);

        if (
          taskDate.getMonth() === month.monthIndex &&
          taskDate.getFullYear() === month.year
        ) {
          return sum + (task.hoursLogged || 0);
        }

        return sum;
      }, 0);

      return {
        label: month.label,
        value: monthSum,
        tooltip: `${month.tooltip}: ${monthSum}h`,
      };
    });
  }, [tasks, monthlyData]);

  const width = 430;
  const height = 320;
  const chartBottom = 270;
  const barHeightMax = 220;
  const barWidth = 44;
  const gap = 24;
  const maxValue = Math.max(...data.map((d) => d.value), 0);
  // round the top of the scale up to the next 20h step
  const scaleMax = Math.max(MIN_SCALE_HOURS, Math.ceil(maxValue / 20) * 20);
  const heightFor = (value) =>
    value > 0 ? Math.max((value / scaleMax) * barHeightMax, 14) : ZERO_BAR_HEIGHT;

  return (
    <div className="w-full h-[335px] glass-card rounded-2xl p-5 flex flex-col">
      <div className="flex items-center justify-between shrink-0">
        <h3 className="text-white font-bold">Hours by month</h3>
        <span className="text-xs text-gray-400">by due date</span>
      </div>
      <div className="flex-1 min-h-0">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMax meet"
        className="block overflow-visible"
      >
        {data.map((d, i) => {
          const barHeight = heightFor(d.value);
          const x = i * (barWidth + gap) + 10;
          const y = chartBottom - barHeight;
          const isHovered = hovered === i;

          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fillOpacity={d.value > 0 ? 1 : 0.3}
                rx={8}
                fill={isHovered ? HIGHLIGHT_COLOR : BAR_COLORS[i % BAR_COLORS.length]}
                style={{
                  filter: isHovered
                    ? "drop-shadow(0 2px 12px #10B98188)"
                    : "drop-shadow(0 2px 8px #0006)",
                  cursor: "pointer",
                  transition: "fill 0.2s, filter 0.2s",
                }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              />

              {/* hours on top of the bar (the hover tooltip replaces it) */}
              {d.value > 0 && !isHovered && (
                <text
                  x={x + barWidth / 2}
                  y={y - 8}
                  textAnchor="middle"
                  fill="#e5e5e5"
                  fontSize="14"
                  fontWeight="600"
                  style={{ pointerEvents: "none" }}
                >
                  {Math.round(d.value * 10) / 10}h
                </text>
              )}

              <text
                x={x + barWidth / 2}
                y={chartBottom + 24}
                textAnchor="middle"
                fill="#bdbdbd"
                fontSize="16"
                fontWeight="500"
                style={{ letterSpacing: 1 }}
              >
                {d.label}
              </text>
            </g>
          );
        })}

        {hovered !== null && (() => {
          const i = hovered;
          const d = data[i];
          const barHeight = heightFor(d.value);
          const x = i * (barWidth + gap) + 10;
          const y = chartBottom - barHeight;

          return (
            <g>
              <foreignObject
                x={x - 16}
                y={y - 48}
                width="120"
                height="40"
                style={{ pointerEvents: "none" }}
              >
                <div
                  className="bg-white text-black text-[16px] font-bold rounded-md px-3 py-1 shadow-lg"
                  style={{
                    position: "relative",
                    width: "max-content",
                    minWidth: 90,
                  }}
                >
                  {d.tooltip}

                  <div
                    style={{
                      position: "absolute",
                      left: 32,
                      bottom: -10,
                      width: 0,
                      height: 0,
                      borderLeft: "8px solid transparent",
                      borderRight: "8px solid transparent",
                      borderTop: "10px solid #fff",
                    }}
                  />
                </div>
              </foreignObject>
            </g>
          );
        })()}
      </svg>
      </div>
    </div>
  );
};

export default Chart;