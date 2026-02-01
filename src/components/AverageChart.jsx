import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const COLORS = ["#EC802B", "#66BCB4", "#EDC55B", "#3D3D3D"];

/** رسم بياني للوسط الحسابي حسب المادة أو التصنيف */
export default function AverageChart({ data, title = "متوسط الدرجات" }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="text-lg font-bold text-dark-600 mb-4">{title}</h3>
        <p className="text-gray-500 text-center py-8">لا توجد بيانات لعرضها</p>
      </div>
    );
  }

  const chartData = data.map((d) => ({ name: d.name, متوسط: d.avg }));

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h3 className="text-lg font-bold text-dark-600 mb-4">{title}</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ right: 24 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              type="number"
              domain={[0, 100]}
              tick={{ fill: "#6b7280", fontSize: 12 }}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={80}
              tick={{ fill: "#374151", fontSize: 13 }}
            />
            <Tooltip
              formatter={(value) => [`${value}%`, "المتوسط"]}
              contentStyle={{ direction: "rtl", textAlign: "right" }}
            />
            <Bar dataKey="متوسط" fill="#EC802B" radius={[0, 4, 4, 0]}>
              {chartData.map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
