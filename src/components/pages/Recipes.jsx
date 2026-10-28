"use client";

import { API_BASE } from "@/config/api";
import { useEffect, useState } from "react";
import axios from "axios";
import useAuthCheck from "@/hooks/useAuthCheck";
import Pagination from "@/components/Pagination";
import { showAlert, showConfirm } from "@/utils/popup";

export default function Recipes(){
  useAuthCheck();

const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

const [products,setProducts]=useState([]);
const [inventory,setInventory]=useState([]);
const [recipes,setRecipes]=useState([]);

const [search,setSearch]=useState("");
const [page,setPage]=useState(1);
const [pagination,setPagination]=useState({pages:1,total:0});

const [productId,setProductId]=useState("");

const [ingredients,setIngredients]=useState([
  {inventory_id:"",quantity:""}
]);

const [editing,setEditing]=useState(null);

/* LOAD PRODUCTS */

const loadProducts=async()=>{

const res=await axios.get(
`${API_BASE}/api/recipes/products`,
{headers:{Authorization:`Bearer ${token}`}}
)

setProducts(res.data)

}

/* LOAD INVENTORY */

const loadInventory=async()=>{

const res=await axios.get(
`${API_BASE}/api/recipes/inventory`,
{headers:{Authorization:`Bearer ${token}`}}
)

setInventory(res.data)

}

/* LOAD RECIPES */

const loadRecipes=async(pageArg,qArg)=>{

const params=new URLSearchParams()
params.set("page",pageArg ?? page)
params.set("limit","50")
const qq=(qArg ?? search).trim()
if(qq) params.set("q",qq)

const res=await axios.get(
`${API_BASE}/api/recipes/all?${params.toString()}`,
{headers:{Authorization:`Bearer ${token}`}}
)

setRecipes(Array.isArray(res.data?.rows) ? res.data.rows : [])
setPagination({pages:res.data?.pages || 1,total:res.data?.total || 0})

}

/* LOAD PRODUCT RECIPE FOR EDIT */

const loadProductRecipe=async(id)=>{

const res=await axios.get(
`${API_BASE}/api/recipes/product/${id}`,
{headers:{Authorization:`Bearer ${token}`}}
)

setIngredients(res.data.map(r=>({
inventory_id:r.inventory_id,
quantity:r.quantity
})))

setProductId(id)

}

/* INIT */

useEffect(()=>{

loadProducts()
loadInventory()

},[])

useEffect(()=>{

setPage(1)

},[search])

useEffect(()=>{

const t=setTimeout(
()=>loadRecipes(page,search),
search ? 300 : 0
)
return ()=>clearTimeout(t)

},[page,search])

/* ADD INGREDIENT ROW */

const addRow=()=>{

setIngredients([
...ingredients,
{inventory_id:"",quantity:""}
])

}

/* UPDATE ROW */

const updateRow=(index,field,value)=>{

const updated=[...ingredients]

updated[index][field]=value

setIngredients(updated)

}

/* SAVE */

const saveRecipe=async()=>{

if(!productId) return showAlert("Select a product first","warning");

const hasIngredient = ingredients.some(r=>r.inventory_id);
if(!hasIngredient) return showAlert("Add at least one ingredient","warning");

try{
await axios.post(
`${API_BASE}/api/recipes/add`,
{
product_id:productId,
ingredients
},
{headers:{Authorization:`Bearer ${token}`}}
)

showAlert("Recipe saved","success");
setIngredients([{inventory_id:"",quantity:""}])

setProductId("")

setEditing(null)

loadRecipes()
}catch(err){
  console.log(err);
  showAlert("Could not save recipe","error");
}

}

/* DELETE INGREDIENT */

const deleteIngredient=async(id)=>{
if(!(await showConfirm("Remove this ingredient from recipe?",{danger:true}))) return;

await axios.delete(
`${API_BASE}/api/recipes/${id}`,
{headers:{Authorization:`Bearer ${token}`}}
)

showAlert("Ingredient removed","success");
loadRecipes()

}

/* GROUP RECIPES BY PRODUCT */

const grouped=recipes.reduce((acc,r)=>{

if(!acc[r.product]) acc[r.product]=[]

acc[r.product].push(r)

return acc

},{})

/* SEARCH (server-driven) */

const filtered=Object.keys(grouped)

return(

<div className="p-4 md:p-8">

<h2 className="text-xl font-bold mb-4">
Recipe Manager
</h2>

{/* SEARCH */}

<input
placeholder="Search product..."
className="border p-2 mb-6 w-full sm:w-64"
value={search}
onChange={(e)=>setSearch(e.target.value)}
/>

{/* ADD / EDIT RECIPE */}

<div className="bg-white shadow p-4 mb-6">

<h3 className="font-semibold mb-3">
{editing ? "Edit Recipe" : "Add Recipe"}
</h3>

<select
className="border p-2 mb-3 w-full"
value={productId}
onChange={(e)=>setProductId(e.target.value)}
>

<option>Select Product</option>

{products.map(p=>(
<option key={p.id} value={p.id}>
{p.name}
</option>
))}

</select>

{ingredients.map((row,i)=>(

<div key={i} className="flex flex-wrap gap-2 mb-2">

<div className="flex-1 min-w-[140px]">
<select
className="border p-2 w-full"
value={row.inventory_id}
onChange={(e)=>updateRow(i,"inventory_id",e.target.value)}
>

<option>Ingredient</option>

{inventory.map(inv=>(
<option key={inv.id} value={inv.id}>
{inv.name}
</option>
))}

</select>
</div>

<input
type="number"
className="border p-2 w-24"
placeholder="weight"
value={row.quantity}
onChange={(e)=>updateRow(i,"quantity",e.target.value)}
/>

</div>

))}

<button
onClick={addRow}
className="bg-gray-500 hover:bg-gray-600 transition text-white px-3 py-1.5 mr-2 rounded-lg"
>
Add Ingredient
</button>

<button
onClick={saveRecipe}
className="bg-green-600 hover:bg-green-700 transition text-white px-4 py-1.5 rounded-lg"
>
Save Recipe
</button>

</div>

{/* RECIPE CARDS */}

<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

{filtered.map(product=>{

const items=grouped[product]

return(

<div
key={product}
className="bg-white shadow rounded-xl p-4 hover:shadow-md transition"
>

<div className="flex justify-between items-center mb-3">

<h3 className="font-bold">
{product}
</h3>

</div>

<div className="overflow-x-auto">
<table className="w-full min-w-[560px] text-sm">

<thead>

<tr className="border-b">
<th className="text-left py-2">Ingredient</th>
<th className="py-2">Qty</th>
<th></th>
</tr>

</thead>

<tbody>

{items.map(i=>(

<tr key={i.id} className="border-b last:border-0">

<td className="py-2">{i.ingredient}</td>

<td className="text-center py-2">
{i.quantity}
</td>

<td className="text-right py-2">

<button
onClick={()=>deleteIngredient(i.id)}
className="text-red-500 hover:text-red-700 text-sm"
>
Delete
</button>

</td>

</tr>

))}

</tbody>

</table>
</div>

</div>

)

})}

</div>

<Pagination
page={page}
pages={pagination.pages}
total={pagination.total}
onChange={setPage}
label="recipe rows"
/>

</div>

)

}
