export default function SkeletonCard() {
  return (
    <div className="max-w-md mx-auto mt-6 space-y-4 animate-pulse">
       {/* loading text */}
      <div className="text-center text-gray-400 text-sm">
        ✈️ 正在为你生成专属旅行计划...
      </div>
      {/* Header */}
      <div className="bg-white rounded-3xl shadow p-5 border space-y-3">
        <div className="h-4 bg-gray-200 rounded w-1/3 mx-auto"></div>
        <div className="h-6 bg-gray-200 rounded w-1/2 mx-auto"></div>
      </div>

      {/* Overview */}
      <div className="bg-white rounded-3xl shadow p-5 border space-y-3">
        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        <div className="h-4 bg-gray-200 rounded w-full"></div>
        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
      </div>

      {/* Days */}
      <div className="bg-white rounded-3xl shadow p-5 border space-y-3">
        <div className="h-5 bg-gray-200 rounded w-1/3"></div>
        <div className="h-4 bg-gray-200 rounded w-full"></div>
        <div className="h-4 bg-gray-200 rounded w-4/5"></div>
        <div className="h-4 bg-gray-200 rounded w-3/5"></div>
      </div>

      {/* Food */}
      <div className="bg-white rounded-3xl shadow p-5 border space-y-3">
        <div className="h-5 bg-gray-200 rounded w-1/3"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>

    </div>
  );
}