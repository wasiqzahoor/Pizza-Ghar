export default function StatCard({
  title,
  value,
  change,
  changeColor,
  icon,
}) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow flex justify-between items-center">
      <div>
        <p className="text-gray-500 text-sm">{title}</p>
        <h3 className="text-2xl font-bold mt-2">{value}</h3>
        <p className={`text-sm mt-1 ${changeColor}`}>{change}</p>
      </div>

      <div className="bg-gray-100 p-4 rounded-xl">{icon}</div>
    </div>
  );
}
