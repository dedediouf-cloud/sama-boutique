"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { isAdmin } from "@/lib/roles";
import {
  Users,
  Plus,
  X,
  Shield,
  UserCog,
  Trash2,
  Search,
  Crown,
  Store,
} from "lucide-react";

export default function EmployeesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [employees, setEmployees] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "seller" });
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (status === "authenticated" && !isAdmin(session?.user?.role)) {
      router.push("/dashboard");
    }
  }, [session, status, router]);

  const fetchEmployees = () => {
    fetch("/api/employees")
      .then((res) => res.json())
      .then((data) => setEmployees(data));
  };

  useEffect(() => {
    if (isAdmin(session?.user?.role)) {
      fetchEmployees();
    }
  }, [session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      setForm({ name: "", email: "", password: "", role: "seller" });
      setShowForm(false);
      fetchEmployees();
    } else {
      const error = await res.json();
      alert(error.error || "Erreur lors de la création");
    }
  };

  const deleteEmployee = async (id: string) => {
    if (!confirm("Supprimer cet employé ?")) return;

    await fetch(`/api/employees/${id}`, { method: "DELETE" });
    fetchEmployees();
  };

  if (!isAdmin(session?.user?.role)) {
    return null;
  }

  const filteredEmployees = employees.filter((e) =>
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <ProtectedRoute>
      <div className="space-y-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="font-[family-name:var(--font-playfair)] text-3xl md:text-4xl font-semibold text-[#3D2B1F]">
              Gestion des employés
            </h1>
            <p className="text-[#5C4033] mt-1 flex items-center gap-2">
              <Users size={16} className="text-[#B87333]" />
              {employees.length} employé{sPlural(employees.length)} enregistré{sPlural(employees.length)}
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-6 py-3 rounded-xl btn-luxe flex items-center gap-2 font-medium"
          >
            {showForm ? <X size={18} /> : <Plus size={18} />}
            {showForm ? "Annuler" : "Ajouter un employé"}
          </button>
        </div>

        {/* Add form */}
        {showForm && (
          <div className="glass rounded-2xl p-6 md:p-8 tilt-card">
            <h2 className="font-[family-name:var(--font-playfair)] text-xl font-semibold text-[#3D2B1F] mb-5 flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#D4AF37]/20 to-[#B87333]/20 flex items-center justify-center">
                <UserCog size={18} className="text-[#B87333]" />
              </span>
              Nouvel employé
            </h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-[#5C4033] mb-1.5">Nom de l&apos;employé</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl input-warm text-[#3D2B1F]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#5C4033] mb-1.5">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl input-warm text-[#3D2B1F]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#5C4033] mb-1.5">Mot de passe</label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl input-warm text-[#3D2B1F]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#5C4033] mb-1.5">Rôle</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl input-warm text-[#3D2B1F]"
                  >
                    <option value="seller">Vendeur</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <button type="submit" className="px-8 py-3.5 rounded-xl btn-luxe font-medium">
                Enregistrer l&apos;employé
              </button>
            </form>
          </div>
        )}

        {/* Search */}
        <div className="glass rounded-2xl p-4 flex items-center gap-3">
          <Search size={20} className="text-[#B87333]" />
          <input
            type="text"
            placeholder="Rechercher un employé..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-[#3D2B1F] placeholder-[#B87333]/50"
          />
        </div>

        {/* Employees table */}
        <div className="glass rounded-2xl overflow-hidden tilt-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#FDF6E3]/50 text-left">
                <tr>
                  <th className="px-6 py-4 font-semibold text-[#5C4033]">Employé</th>
                  <th className="px-6 py-4 font-semibold text-[#5C4033]">Email</th>
                  <th className="px-6 py-4 font-semibold text-[#5C4033]">Rôle</th>
                  <th className="px-6 py-4 font-semibold text-[#5C4033]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D4AF37]/10">
                {filteredEmployees.map((e) => (
                  <tr key={e.id} className="hover:bg-[#FDF6E3]/30 transition-colors duration-300">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4AF37]/20 to-[#B87333]/20 flex items-center justify-center">
                          <UserCog size={18} className="text-[#B87333]" />
                        </div>
                        <div className="font-semibold text-[#3D2B1F]">{e.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-[#5C4033]">{e.email}</td>
                    <td className="px-6 py-5">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                        e.role === "admin"
                          ? "bg-[#D4AF37]/15 text-[#B87333] border border-[#D4AF37]/20"
                          : "bg-[#FDF6E3]/80 text-[#5C4033] border border-[#D4AF37]/20"
                      }`}>
                        {e.role === "admin" ? <Crown size={12} /> : <Store size={12} />}
                        {e.role === "admin" ? "Admin" : "Vendeur"}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <button
                        onClick={() => deleteEmployee(e.id)}
                        className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 text-sm font-medium transition-colors"
                      >
                        <Trash2 size={14} /> Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredEmployees.length === 0 && (
            <div className="p-12 text-center text-[#5C4033]/60">
              <Users size={64} className="mx-auto mb-4 text-[#D4AF37]/40" />
              <p className="text-lg">Aucun employé trouvé</p>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}

function sPlural(count: number) {
  return count > 1 ? "s" : "";
}
