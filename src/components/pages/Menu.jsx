"use client";

import { API_BASE } from "@/config/api";
import { useEffect, useState } from "react";
import { Search, Plus, X } from "lucide-react";
import useAuthCheck from "@/hooks/useAuthCheck";
import Pagination from "@/components/Pagination";
import { showAlert, showConfirm } from "@/utils/popup";
import { imgUrl } from "@/lib/img";
import { useRef } from "react";

const API = `${API_BASE}/api/products`;
const CATEGORY_API = `${API_BASE}/api/categories`;

export default function Menu({ initialProducts = null, initialCategoryNames = null }) {

  useAuthCheck();
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const [items, setItems] = useState(() => initialProducts?.rows || []);
  const [categories, setCategories] = useState(() =>
    initialCategoryNames ? ["All", ...initialCategoryNames] : ["All"]
  );

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    pages: initialProducts?.pages || 1,
    total: initialProducts?.total || 0,
  });

  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [form, setForm] = useState({
    name: "",
    price: "",
    category: "",
    image: null
  });

  const fetchProducts = async (pageArg, qArg, catArg) => {

    try {

      const params = new URLSearchParams();
      params.set("page", pageArg ?? page);
      const qq = (qArg ?? search).trim();
      if (qq) params.set("q", qq);
      const cat = catArg ?? selectedCategory;
      if (cat && cat !== "All") params.set("category", cat);

      const res = await fetch(`${API}?${params.toString()}`,{
        headers:{
          Authorization:`Bearer ${token}`
        }
      });

      const data = await res.json();

      if(Array.isArray(data?.rows)){
        setItems(data.rows);
        setPagination({ pages: data.pages || 1, total: data.total || 0 });
      } else{
        setItems([]);
        setPagination({ pages: 1, total: 0 });
      }

    }catch(err){
      console.log(err);
      setItems([]);
    }

  };

  const fetchCategories = async () => {

    try{

      const res = await fetch(CATEGORY_API);

      const data = await res.json();

      const names = [...new Set(data.map(c=>c.name))];

      setCategories(["All",...names]);

    }catch(err){

      console.log(err);

    }

  };

  const didInitCats = useRef(!initialCategoryNames);
  const didInitProducts = useRef(!initialProducts);

  useEffect(()=>{

    if (!didInitCats.current) {
      didInitCats.current = true;
      return;
    }
    fetchCategories();

  },[]);

  useEffect(()=>{
    setPage(1);
  },[search, selectedCategory]);

  useEffect(()=>{
    if (!didInitProducts.current) {
      didInitProducts.current = true;
      return;
    }
    const t = setTimeout(
      ()=>fetchProducts(page, search, selectedCategory),
      search ? 300 : 0
    );
    return ()=>clearTimeout(t);
  },[page, search, selectedCategory]);

  const handleAdd = async () => {

    if (!form.name.trim() || !form.price)
      return showAlert("Fill name and price", "warning");

    try{

      const formData = new FormData();

      formData.append("name",form.name);
      formData.append("price",form.price);
      formData.append("category",form.category);

      if(form.image){
        formData.append("image",form.image);
      }

      const method = editingItem ? "PUT":"POST";

      const url = editingItem
      ? `${API}/${editingItem.id}`
      : API;

      const res = await fetch(url,{
        method,
        headers:{
          Authorization:`Bearer ${token}`
        },
        body:formData
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return showAlert(data.message || "Could not save product", "error");
      }

      showAlert(editingItem ? "Product updated" : "Product added", "success");
      setShowModal(false);
      setEditingItem(null);

      setForm({
        name:"",
        price:"",
        category:"",
        image:null
      });

      fetchProducts();

    }catch(err){
      console.log(err);
      showAlert("Could not save product","error");
    }

  };

  const handleDelete = async(id)=>{
    if(!(await showConfirm("Delete this product?",{title:"Delete product",danger:true}))) return;

    try{

      await fetch(`${API}/${id}`,{
        method:"DELETE",
        headers:{
          Authorization:`Bearer ${token}`
        }
      });

      showAlert("Product deleted","success");
      fetchProducts();

    }catch(err){
      console.log(err);
      showAlert("Delete failed","error");
    }

  };

  const filtered = Array.isArray(items) ? items : [];

return (

<div className="p-4 sm:p-6 w-full">

<div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-3">

<div>

<h1 className="text-xl sm:text-2xl font-bold">
Menu Management
</h1>

<p className="text-gray-500 text-sm sm:text-base">
Manage your products
</p>

</div>

<button
onClick={()=>{
setEditingItem(null);
setShowModal(true);
}}
className="bg-orange-500 text-white px-4 py-2 rounded-xl flex gap-2 justify-center items-center hover:bg-orange-600"
>
<Plus size={18}/>
Add Product
</button>

</div>

<div className="bg-white p-3 sm:p-4 rounded-xl mb-4 flex items-center shadow">

<Search size={18}/>

<input
className="ml-3 outline-none w-full text-sm sm:text-base"
placeholder="Search..."
value={search}
onChange={(e)=>setSearch(e.target.value)}
/>

</div>

<div className="flex gap-2 mb-6 flex-wrap">

{categories.map(cat=>(

<button
key={cat}
onClick={()=>setSelectedCategory(cat)}
className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-sm sm:text-base transition ${
selectedCategory === cat
? "bg-orange-500 text-white"
: "bg-gray-200 hover:bg-gray-300"
}`}
>
{cat}
</button>

))}

</div>

<div className="max-h-[65vh] overflow-y-auto pr-1">

<div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">

{filtered.map(item=>(

<div
key={item.id}
className="bg-white rounded-xl shadow hover:shadow-lg transition"
>

<img
src={
item.image
? imgUrl(item.image)
: "https://via.placeholder.com/300"
}
className="h-32 sm:h-40 md:h-48 w-full object-cover rounded-t-xl"
/>

<div className="p-3 sm:p-4">

<h3 className="font-bold text-sm sm:text-base">
{item.name}
</h3>

<p className="text-red-500 font-bold text-sm sm:text-base">
Rs {item.price}
</p>

<p className="text-gray-500 text-xs sm:text-sm">
{item.category}
</p>

<div className="flex gap-2 mt-3">

<button
onClick={()=>{
setEditingItem(item);
setForm({
name:item.name,
price:item.price,
category:item.category,
image:null
});
setShowModal(true);
}}
className="bg-blue-500 text-white px-2 sm:px-3 py-1 rounded text-xs sm:text-sm hover:bg-blue-600 w-full"
>
Edit
</button>

<button
onClick={()=>handleDelete(item.id)}
className="bg-red-500 text-white px-2 sm:px-3 py-1 rounded text-xs sm:text-sm hover:bg-red-600 w-full"
>
Delete
</button>

</div>

</div>

</div>

))}

</div>

</div>

<Pagination
page={page}
pages={pagination.pages}
total={pagination.total}
onChange={setPage}
label="products"
/>

{showModal &&(

<div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">

<div className="bg-white p-6 rounded-xl w-[90%] max-w-md">

<div className="flex justify-between mb-4">

<h2 className="font-bold text-lg">
{editingItem ? "Edit Product":"Add Product"}
</h2>

<X
onClick={()=>setShowModal(false)}
className="cursor-pointer"
/>

</div>

<input
placeholder="Name"
value={form.name}
className="w-full border p-2 mb-2 rounded"
onChange={(e)=>setForm({...form,name:e.target.value})}
/>

<input
placeholder="Price"
type="number"
value={form.price}
className="w-full border p-2 mb-2 rounded"
onChange={(e)=>setForm({...form,price:e.target.value})}
/>

<select
value={form.category}
className="w-full border p-2 mb-2 rounded"
onChange={(e)=>setForm({...form,category:e.target.value})}
>

<option value="">
Select Category
</option>

{categories
.filter(c=>c!=="All")
.map(cat=>(

<option key={cat}>
{cat}
</option>

))}

</select>

<input
type="file"
accept="image/*"
className="w-full border p-2 mb-4 rounded"
onChange={(e)=>
setForm({...form,image:e.target.files[0]})
}
/>

<button
onClick={handleAdd}
className="bg-orange-500 text-white px-4 py-2 rounded w-full hover:bg-orange-600"
>
{editingItem ? "Update Product":"Add Product"}
</button>

</div>

</div>

)}

</div>

);
}
