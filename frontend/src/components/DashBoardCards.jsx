import { useContext } from 'react';
import { FaCalendarDay, FaThLarge, FaClock, FaPlay } from "react-icons/fa";
import { TaskContext } from '../context/BillContext';
import { formatDuration, localToday } from '../utils/taskUtils';

const Card = ({ icon, gradient, progressColor, topText, mainValue, bottomText, progress }) => {
  const circleLength = 126; // circumference of circle

  return (
    <div
      className={`relative rounded-2xl w-full min-h-[150px] gap-4 p-5 flex flex-col justify-between shadow-lg backdrop-blur-sm transition-transform duration-300 hover:-translate-y-1 ${gradient}`}
    >
      {/* Top Row */}
      <div className="flex justify-between items-start">
        <div className="w-11 h-11 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-white">{icon}</div>
        {/* Progress Circle */}
        <div className="relative w-12 h-12">
          <svg className="absolute top-0 left-0 w-12 h-12">
            <circle
              cx="24"
              cy="24"
              r="20"
              stroke="currentColor"
              strokeWidth="4"
              className="text-gray-500 opacity-30"
              fill="transparent"
            />
            <circle
              cx="24"
              cy="24"
              r="20"
              stroke="currentColor"
              strokeWidth="4"
              className={progressColor}
              fill="transparent"
              strokeDasharray={circleLength}
              strokeDashoffset={circleLength - (circleLength * progress) / 100}
              strokeLinecap="round"
              transform="rotate(-90 24 24)"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xs text-white">
            {progress}%
          </span>
        </div>
      </div>

      {/* Bottom Text */}
      <div className="text-white">
        <p className="text-sm opacity-75">{topText}</p>
        <p className="text-2xl font-bold tracking-tight">{mainValue}</p>
        <p className="text-xs text-gray-400 mt-0.5">{bottomText}</p>
      </div>
    </div>
  );
};

export default function DashboardCards() {
  const { getTaskStats, tasks } = useContext(TaskContext);
  const stats = getTaskStats();

  const pct = (part, whole) => (whole > 0 ? Math.min(100, Math.round((part / whole) * 100)) : 0);

  // Today: what is left (due today or overdue) against what was already finished today
  const today = localToday();
  const localDay = (iso) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const doneToday = tasks.filter((t) => t.status === "Done" && t.completedAt && localDay(t.completedAt) === today).length;
  const leftToday = stats.dueToday + stats.overdue;
  const totalEstimatedHours = tasks.reduce((sum, t) => sum + (Number(t.estimatedHours) || 0), 0);

  const cards = [
    {
      id: 1,
      icon: <FaCalendarDay size={18} />,
      gradient: "card-gradient-purple",
      progressColor: "text-violet-300",
      topText: "Left for today",
      mainValue: leftToday,
      bottomText: `Done today: ${doneToday}${stats.overdue ? ` · Overdue: ${stats.overdue}` : ""}`,
      progress: pct(doneToday, doneToday + leftToday),
    },
    {
      id: 2,
      icon: <FaThLarge size={18} />,
      gradient: "card-gradient-green",
      progressColor: "text-emerald-300",
      topText: "Tasks completed",
      mainValue: `${stats.completed} / ${tasks.length}`,
      bottomText: `Open: ${stats.open}`,
      progress: pct(stats.completed, tasks.length),
    },
    {
      id: 3,
      icon: <FaClock size={18} />,
      gradient: "card-gradient-amber",
      progressColor: "text-violet-300",
      topText: "Focus time",
      mainValue: formatDuration(stats.totalHoursLogged),
      bottomText: totalEstimatedHours > 0 ? `Estimated: ${formatDuration(totalEstimatedHours)}` : "Tracked by the focus timer",
      progress: pct(stats.totalHoursLogged, totalEstimatedHours),
    },
    {
      id: 4,
      icon: <FaPlay size={16} />,
      gradient: "card-gradient-cyan",
      progressColor: "text-emerald-300",
      topText: "In progress",
      mainValue: stats.doing,
      bottomText: stats.doing ? "Tasks you have started" : "Press Focus on a task to start",
      progress: pct(stats.doing, stats.open),
    },
  ];

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
        {cards.map((card) => (
          <Card
            key={card.id}
            icon={card.icon}
            gradient={card.gradient}
            progressColor={card.progressColor}
            topText={card.topText}
            mainValue={card.mainValue}
            bottomText={card.bottomText}
            progress={card.progress}
          />
        ))}
      </div>
    </div>
  );
}
