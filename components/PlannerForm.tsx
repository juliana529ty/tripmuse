type PlannerFormProps = {
  destination: string;
  days: string;
  budget: string;
  loading: boolean;
  loadingText: string;
  onDestinationChange: (value: string) => void;
  onDaysChange: (value: string) => void;
  onBudgetChange: (value: string) => void;
  onGenerate: () => void;
};

export default function PlannerForm({
  destination,
  days,
  budget,
  loading,
  loadingText,
  onDestinationChange,
  onDaysChange,
  onBudgetChange,
  onGenerate,
}: PlannerFormProps) {
  return (
    <div className="max-w-md mx-auto bg-white rounded-3xl shadow-xl p-6 space-y-4">

      <input
        className="w-full p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400"
        placeholder="📍 目的地"
        value={destination}
        onChange={(e) => onDestinationChange(e.target.value)}
      />

      <input
        className="w-full p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400"
        placeholder="📅 天数"
        value={days}
        onChange={(e) => onDaysChange(e.target.value)}
      />

      <input
        className="w-full p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400"
        placeholder="💰 预算"
        value={budget}
        onChange={(e) => onBudgetChange(e.target.value)}
      />

      <button
        onClick={onGenerate}
        disabled={loading}
        className={`w-full py-3 rounded-xl font-bold transition-all duration-300 ${
          loading
            ? "bg-gray-400 cursor-not-allowed animate-pulse"
            : [
                "bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500",
                "hover:scale-[1.02]",
                "active:scale-95",
                "shadow-lg"
              ].join(" ")
        }`}
      
      >
        {loading ? loadingText : "✨ 生成旅行攻略"}
      </button>

    </div>
  );
}