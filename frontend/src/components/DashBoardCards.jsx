import { useContext } from 'react';
import { FaUserAlt, FaThLarge, FaClock, FaVideo } from "react-icons/fa";
import { TaskContext } from '../context/BillContext';

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

  // Calculate progress percentages
  const readyToAssignProgress = tasks.length > 0 ? Math.round((stats.readyToAssign / tasks.length) * 100) : 0;
  const completedProgress = tasks.length > 0 ? Math.round((stats.completed / tasks.length) * 100) : 0;
  // Progress against the hours the user actually estimated; 0 when there is nothing to measure
  const totalEstimatedHours = tasks.reduce((sum, t) => sum + (Number(t.estimatedHours) || 0), 0);
  const hoursLoggedProgress = totalEstimatedHours > 0
    ? Math.min(Math.round((stats.totalHoursLogged / totalEstimatedHours) * 100), 100)
    : 0;
  // share of all tasks that are meetings
  const meetingsProgress = tasks.length > 0 ? Math.round((stats.scheduled / tasks.length) * 100) : 0;

  const cards = [
    {
      id: 1,
      icon: <FaUserAlt size={18} />,
      gradient: "card-gradient-purple",
      progressColor: "text-violet-300",
      topText: "Ready to Assign",
      mainValue: stats.readyToAssign,
      bottomText: `In progress: ${stats.inProgress} · Total: ${tasks.length}`,
      progress: readyToAssignProgress,
    },
    {
      id: 2,
      icon: <FaThLarge size={18} />,
      gradient: "card-gradient-green",
      progressColor: "text-emerald-300",
      topText: "Tasks Completed",
      mainValue: `${stats.completed} / ${tasks.length}`,
      bottomText: `Remaining: ${tasks.length - stats.completed}`,
      progress: completedProgress,
    },
    {
      id: 3,
      icon: <FaClock size={18} />,
      gradient: "card-gradient-amber",
      progressColor: "text-violet-300",
      topText: "Hours Logged",
      mainValue: `${stats.totalHoursLogged}h`,
      bottomText: `Estimated: ${totalEstimatedHours}h`,
      progress: hoursLoggedProgress,
    },
    {
      id: 4,
      icon: <FaVideo size={18} />,
      gradient: "card-gradient-cyan",
      progressColor: "text-emerald-300",
      topText: "Meetings Scheduled",
      mainValue: `${stats.scheduled} Scheduled`,
      bottomText: stats.scheduled > 0 ? `Status: Active` : `No meetings yet`,
      progress: meetingsProgress,
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
