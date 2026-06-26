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
    <div className="mx-auto max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="space-y-4">
        <input
          className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:border-gray-950 focus:outline-none"
          placeholder="Destination, for example Tokyo or Paris"
          value={destination}
          onChange={(event) => onDestinationChange(event.target.value)}
        />

        <input
          className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:border-gray-950 focus:outline-none"
          placeholder="Number of days, for example 3, 5, or 7"
          value={days}
          onChange={(event) => onDaysChange(event.target.value)}
        />

        <input
          className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:border-gray-950 focus:outline-none"
          placeholder="Budget, for example $1000 USD"
          value={budget}
          onChange={(event) => onBudgetChange(event.target.value)}
        />

        <button
          type="button"
          onClick={onGenerate}
          disabled={loading}
          className="w-full rounded-xl bg-gray-950 py-3 text-sm font-bold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          {loading ? loadingText || "Generating..." : "Generate travel plan"}
        </button>
      </div>
    </div>
  );
}
