"use client";

import { API_BASE } from "@/config/api";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import Topbar from "@/components/Topbar";
import StatCard from "@/components/StatCard";
import RevenueChart from "@/components/RevenueChart";
import useAuthCheck from "@/hooks/useAuthCheck";

import {
TrendingUp,
ShoppingBag,
AlertCircle,
Users
} from "lucide-react";

export default function Dashboard(){
  useAuthCheck();

const router = useRouter();

  const API = `${API_BASE}/api/dashboard`;

const [loading,setLoading]=useState(true);

const [range,setRange]=useState("daily");

const [consumptionRange,setConsumptionRange]=useState("daily");

const [consumption,setConsumption]=useState([]);

const [stats,setStats]=useState({
totalSales:0,
totalOrders:0,
lowStockItems:0,
newCustomers:0,
recentOrders:[],
chart:[]
});

const fetchDashboard=async()=>{

try{

const token=localStorage.getItem("token");

const res=await fetch(
`${API}?range=${range}`,
{
headers:{Authorization:`Bearer ${token}`}
}
);

const data=await res.json();

const formattedChart=data.chart.map(item=>({
name:item.label,
revenue:item.total
}));

setStats({
...data,
chart:formattedChart
});

setLoading(false);

}
catch(error){

console.log(error);

}

};

const fetchConsumption=async()=>{

try{

const token=localStorage.getItem("token");

const res=await fetch(
`${API}/consumption?range=${consumptionRange}`,
{
headers:{Authorization:`Bearer ${token}`}
}
);

const data=await res.json();

setConsumption(data);

}
catch(err){

console.log(err);

}

};

useEffect(()=>{

fetchDashboard();

},[range]);

useEffect(()=>{

fetchConsumption();

},[consumptionRange]);

if(loading)
return <div className="p-6">Loading...</div>;

return(
<>

<Topbar/>

<div className="p-4 sm:p-6 space-y-6">

<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">

<StatCard
title="Total Sales "
value={`Rs ${stats.totalSales}`}
change="+12.5%"
changeColor="text-green-500"
icon={<TrendingUp className="text-red-500"/>}
/>

<StatCard
title="Total Orders"
value={stats.totalOrders}
change="+8.2%"
changeColor="text-green-500"
icon={<ShoppingBag className="text-orange-500"/>}
/>

<StatCard
title="Low Stock Items"
value={stats.lowStockItems}
change="Action needed"
changeColor="text-red-500"
icon={<AlertCircle className="text-red-500"/>}
/>

<StatCard
title="New Customers"
value={stats.newCustomers}
change="+2.4%"
changeColor="text-green-500"
icon={<Users className="text-blue-500"/>}
/>

</div>

<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

<div className="lg:col-span-2 bg-white rounded-2xl shadow p-4 sm:p-6">

<div className="flex gap-2 mb-4">

<button
onClick={()=>setRange("daily")}
className={`px-3 py-1 rounded ${
range==="daily"
? "bg-orange-500 text-white"
: "bg-gray-200"
}`}
>
Daily
</button>

<button
onClick={()=>setRange("week")}
className={`px-3 py-1 rounded ${
range==="week"
? "bg-orange-500 text-white"
: "bg-gray-200"
}`}
>
Week
</button>

<button
onClick={()=>setRange("month")}
className={`px-3 py-1 rounded ${
range==="month"
? "bg-orange-500 text-white"
: "bg-gray-200"
}`}
>
Month
</button>

<button
onClick={()=>setRange("year")}
className={`px-3 py-1 rounded ${
range==="year"
? "bg-orange-500 text-white"
: "bg-gray-200"
}`}
>
Year
</button>

</div>

<RevenueChart data={stats.chart}/>

</div>

<div className="bg-white p-4 sm:p-6 rounded-2xl shadow">

<h3 className="font-semibold text-lg mb-6">
Recent Orders
</h3>

<div className="space-y-6">

{stats.recentOrders.map((order,index)=>(

<div
key={index}
className="flex justify-between items-center">

<div>
<p className="font-medium">
{order.customer_name}
</p>

<p className="text-sm text-gray-400">
{order.payment_method}
</p>
</div>

<span className="bg-green-100 text-green-600 px-3 py-1 rounded-full text-xs">
{order.status || "Completed"}
</span>

</div>

))}

</div>

</div>

</div>

<div className="bg-white rounded-2xl shadow p-6">

<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">

<h3 className="font-semibold text-lg">
Ingredient Consumption Report
</h3>

<div className="flex flex-wrap gap-2">

<button
onClick={()=>setConsumptionRange("daily")}
className={`px-3 py-1 rounded ${
consumptionRange==="daily"
? "bg-orange-500 text-white"
: "bg-gray-200"
}`}
>
Daily
</button>

<button
onClick={()=>setConsumptionRange("week")}
className={`px-3 py-1 rounded ${
consumptionRange==="week"
? "bg-orange-500 text-white"
: "bg-gray-200"
}`}
>
Week
</button>

<button
onClick={()=>setConsumptionRange("month")}
className={`px-3 py-1 rounded ${
consumptionRange==="month"
? "bg-orange-500 text-white"
: "bg-gray-200"
}`}
>
Month
</button>

<button
onClick={()=>setConsumptionRange("year")}
className={`px-3 py-1 rounded ${
consumptionRange==="year"
? "bg-orange-500 text-white"
: "bg-gray-200"
}`}
>
Year
</button>

</div>

</div>

<div className="overflow-x-auto">

<table className="min-w-[420px] text-sm">

<thead>

<tr className="border-b text-left text-gray-600">

<th className="py-3 px-2 whitespace-nowrap">Ingredient</th>
<th className="py-3 px-2 whitespace-nowrap">Used</th>
<th className="py-3 px-2 whitespace-nowrap">Remaining</th>
<th className="py-3 px-2 whitespace-nowrap">Consumption</th>

</tr>

</thead>

<tbody>

{consumption.map((item) => {

const percent = item.consumption_percentage || 0

const color =
percent > 70
? "bg-red-500"
: percent > 40
? "bg-yellow-400"
: "bg-green-500"

return (

<tr key={item.id} className="border-b hover:bg-gray-50">

<td className="py-3 font-medium">
{item.name}
</td>

<td className="py-3">
{item.used_stock}
</td>

<td className="py-3">
{item.current_stock}
</td>

<td className="py-3">

<div className="flex items-center gap-3">

<div className="w-40 h-2 bg-gray-200 rounded">

<div
className={`${color} h-2 rounded`}
style={{ width: `${percent}%` }}
></div>

</div>

<span className="text-xs font-semibold">

{percent}%

</span>

</div>

</td>

</tr>

)

})}

</tbody>

</table>

</div>

</div>

</div>

</>
);

}
