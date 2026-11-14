import { useContext, useState } from "react";
import { RefreshCw } from "lucide-react";
import { TaskContext } from "../context/BillContext";

export default function ReloadButton() {
  const { refreshTasks } = useContext(TaskContext);
  const [rotating, setRotating] = useState(false);

  // Re-fetch the user's tasks from the server instead of reloading the whole page
  const handleReload = async () => {
    if (rotating) return;
    setRotating(true);
    try {
      await refreshTasks();
    } finally {
      setRotating(false);
    }
  };

  return (
    <button
      onClick={handleReload}
      className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-800 transition-colors"
      title="Reload"
    >
      <RefreshCw
        size={14}
        className={`text-white transition-transform duration-500 ${rotating ? "animate-spin" : ""}`}
      />
    </button>
  );
}
