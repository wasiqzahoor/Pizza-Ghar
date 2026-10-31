export default function Loading() {
  return (
    <div className="p-4 md:p-8 bg-[#f4f6f9] h-full overflow-auto">
      <div className="h-8 w-56 bg-gray-200 rounded animate-pulse mb-6" />
      <div className="bg-white rounded-3xl shadow-sm p-5 md:p-8 space-y-4">
        <div className="h-6 w-40 bg-gray-200 rounded animate-pulse" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
        ))}
      </div>
    </div>
  );
}
