"use client";

import { API_BASE } from "@/config/api";
import { useState, useEffect } from "react";
import { Plus, Trash2, Edit, X } from "lucide-react";
import useAuthCheck from "@/hooks/useAuthCheck";
import { showAlert, showConfirm } from "@/utils/popup";

const API = `${API_BASE}/api/categories`;

export default function Categories(){

    useAuthCheck();

const [categories,setCategories] = useState([]);
const [name,setName] = useState("");

const [showModal,setShowModal] = useState(false);
const [editing,setEditing] = useState(null);

/* FETCH */

const fetchCategories = async()=>{

const res = await fetch(API);
const data = await res.json();
setCategories(data);

};

useEffect(()=>{
fetchCategories();
},[]);

/* ADD */

const addCategory = async()=>{

if(!name.trim()) return showAlert("Enter category name","warning");

const res = await fetch(API,{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({name})
});

if(!res.ok){
  const data = await res.json().catch(()=>({}));
  return showAlert(data.message || "Could not add category","error");
}

showAlert("Category added","success");
setName("");
fetchCategories();

};

/* DELETE */

const deleteCategory = async(id)=>{
if(!(await showConfirm("Delete this category?",{title:"Delete category",danger:true}))) return;

await fetch(`${API}/${id}`,{
method:"DELETE"
});

showAlert("Category deleted","success");
fetchCategories();

};

/* UPDATE */

const updateCategory = async()=>{

if(!name.trim()) return showAlert("Enter category name","warning");

await fetch(`${API}/${editing.id}`,{
method:"PUT",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({name})
});

showAlert("Category updated","success");
setShowModal(false);
setEditing(null);
setName("");

fetchCategories();

};

return(

<div className="p-4 md:p-8">

<h1 className="text-xl md:text-2xl font-bold mb-6">
Category Management
</h1>

{/* ADD CATEGORY */}

<div className="bg-white p-4 rounded-xl shadow mb-6 flex flex-col sm:flex-row gap-3">

<input
value={name}
onChange={(e)=>setName(e.target.value)}
placeholder="Category name"
className="border p-2 rounded-lg w-full"
onKeyDown={(e)=>{ if(e.key==="Enter") addCategory(); }}
/>

<button
onClick={addCategory}
className="bg-orange-500 hover:bg-orange-600 transition text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2"
>

<Plus size={18}/>
Add

</button>

</div>

{/* CATEGORY TABLE */}

<div className="bg-white rounded-xl shadow overflow-x-auto max-h-[70vh]">

<table className="w-full">

<thead className="bg-gray-50 sticky top-0 z-10">

<tr>

<th className="text-left p-4 border-b">ID</th>
<th className="text-left p-4 border-b">Name</th>
<th className="text-right p-4 border-b">Action</th>

</tr>

</thead>

<tbody>

{categories.map(cat=>(

<tr key={cat.id} className="border-b hover:bg-gray-50">

<td className="p-3">{cat.id}</td>

<td className="p-3">{cat.name}</td>

<td className="p-3 flex justify-end gap-2">

<button
onClick={()=>{
setEditing(cat);
setName(cat.name);
setShowModal(true);
}}
className="bg-blue-500 hover:bg-blue-600 transition text-white px-3 py-1 rounded-lg flex items-center gap-1"
>

<Edit size={16}/>
Edit

</button>

<button
onClick={()=>deleteCategory(cat.id)}
className="bg-red-500 hover:bg-red-600 transition text-white px-3 py-1 rounded-lg flex items-center gap-1"
>

<Trash2 size={16}/>
Delete

</button>

</td>

</tr>

))}

</tbody>

</table>

</div>

{/* EDIT MODAL */}

{showModal && (

<div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50 p-4">

<div className="bg-white p-6 rounded-xl w-[90%] max-w-md shadow-xl">

<div className="flex justify-between mb-4">

<h2 className="font-bold text-lg">
Edit Category
</h2>

<X
onClick={()=>setShowModal(false)}
className="cursor-pointer"
/>

</div>

<input
value={name}
onChange={(e)=>setName(e.target.value)}
className="w-full border p-2 rounded mb-4"
/>

<button
onClick={updateCategory}
className="bg-orange-500 hover:bg-orange-600 transition text-white px-4 py-2 rounded-lg w-full"
>

Update Category

</button>

</div>

</div>

)}

</div>

);

}
