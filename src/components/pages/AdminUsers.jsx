"use client";

import { API_BASE } from "@/config/api";
import { useEffect, useState } from "react";
import { Plus, Trash2, Edit, Search } from "lucide-react";
import useAuthCheck from "@/hooks/useAuthCheck";
import Pagination from "@/components/Pagination";
import { showAlert, showConfirm } from "@/utils/popup";

export default function AdminUsers() {
  useAuthCheck();
  const [users, setUsers] = useState([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("cashier");
  const [editingUser, setEditingUser] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ pages: 1, total: 0 });

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const fetchUsers = async (pageArg, qArg) => {
    const params = new URLSearchParams();
    params.set("page", pageArg ?? page);
    const qq = (qArg ?? search).trim();
    if (qq) params.set("q", qq);

    const res = await fetch(`${API_BASE}/api/users?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await res.json();
    setUsers(Array.isArray(data?.rows) ? data.rows : []);
    setPagination({ pages: data?.pages || 1, total: data?.total || 0 });
  };

  useEffect(() => {
    setPage(1);
  }, [search]);

  useEffect(() => {
    const t = setTimeout(
      () => fetchUsers(page, search),
      search ? 300 : 0
    );
    return () => clearTimeout(t);
  }, [page, search]);

  const addUser = async () => {
    if (!email || !password) return showAlert("Fill all fields", "warning");

    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ email, password, role }),
    });

    const data = await res.json();
    if (!res.ok) return showAlert(data.message, "error");

    setEmail("");
    setPassword("");
    setRole("cashier");
    showAlert("User added successfully", "success");
    fetchUsers();
  };

  const updateRole = async () => {
    const res = await fetch(
      `${API_BASE}/api/users/${editingUser.id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role }),
      }
    );

    if (!res.ok) return showAlert("Update failed", "error");
    setEditingUser(null);
    showAlert("Role updated", "success");
    fetchUsers();
  };

  const deleteUser = async (id) => {
    if (!(await showConfirm("Delete this user?", { danger: true }))) return;

    await fetch(`${API_BASE}/api/users/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    showAlert("User deleted", "success");
    fetchUsers();
  };

  return (
    <div className="p-4 md:p-8 space-y-6">

      {/* Header */}
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <h1 className="text-2xl font-bold">User Management</h1>

        <div className="flex items-center bg-white rounded-xl px-4 py-2 shadow">
          <Search size={16} className="text-gray-400" />
          <input
            placeholder="Search email..."
            className="ml-2 outline-none text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Add User */}
      <div className="bg-white p-6 rounded-xl shadow space-y-4">
        <h2 className="font-semibold text-lg">Add New User</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <input
            placeholder="Email"
            className="border p-2 rounded"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            placeholder="Password"
            type="password"
            className="border p-2 rounded"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <select
            className="border p-2 rounded"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="admin">Admin</option>
            <option value="cashier">Cashier</option>
            <option value="chef">Chef</option>
          </select>
          <button
            onClick={addUser}
            className="bg-orange-500 text-white rounded flex items-center justify-center gap-2"
          >
            <Plus size={16} /> Add
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white p-6 rounded-xl shadow">
        <h2 className="font-semibold text-lg mb-4">All Users</h2>

        <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left">
          <thead>
            <tr className="border-b">
              <th className="pb-2">Email</th>
              <th className="pb-2">Role</th>
              <th className="pb-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b">
                <td className="py-3">{u.email}</td>
                <td className="py-3">{u.role}</td>
                <td className="py-3 text-right flex gap-3 justify-end">
                  <button
                    onClick={() => {
                      setEditingUser(u);
                      setRole(u.role);
                    }}
                    className="text-blue-500"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => deleteUser(u.id)}
                    className="text-red-500"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>

        <Pagination
          page={page}
          pages={pagination.pages}
          total={pagination.total}
          onChange={setPage}
          label="users"
        />
      </div>

      {/* Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white p-6 rounded-xl w-80 space-y-4">
            <h3 className="font-semibold text-lg">Edit Role</h3>

            <select
              className="border p-2 rounded w-full"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="admin">Admin</option>
              <option value="cashier">Cashier</option>
              <option value="chef">Chef</option>
            </select>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 bg-gray-200 rounded"
              >
                Cancel
              </button>
              <button
                onClick={updateRole}
                className="px-4 py-2 bg-red-500 text-white rounded"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
