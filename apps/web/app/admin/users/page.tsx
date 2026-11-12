"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { formatVND, formatDateTimeVN } from "@/lib/utils";
import { Plus, UserCheck, Shield, Users, Search, Award, Crown } from "lucide-react";

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("Staff@123456");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [role, setRole] = useState<"STAFF" | "CUSTOMER">("STAFF");
  const [search, setSearch] = useState("");
  const [selectedTier, setSelectedTier] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users", search, selectedTier, selectedRole],
    queryFn: () =>
      apiClient("/users", {
        params: {
          search: search || undefined,
          tier: selectedTier || undefined,
          role: selectedRole || undefined,
        },
      }),
  });

  const addUserMutation = useMutation({
    mutationFn: async () => {
      return apiClient("/users", {
        method: "POST",
        body: JSON.stringify({ email, password, fullName, phone, role }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setIsAddModalOpen(false);
      setEmail("");
      setFullName("");
      setPhone("");
      setErrorMsg(null);
    },
    onError: (err: any) => setErrorMsg(err.message || "Không thể tạo tài khoản"),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return apiClient(`/users/${id}/status`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case "VIP":
        return <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/40 font-black">VIP</Badge>;
      case "GOLD":
        return <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 font-black">GOLD</Badge>;
      case "SILVER":
        return <Badge className="bg-slate-400/20 text-slate-200 border-slate-400/40 font-black">SILVER</Badge>;
      default:
        return <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700">STANDARD</Badge>;
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-zinc-950 text-zinc-100">
      <Sidebar role="ADMIN" />

      <main className="flex-1 p-3.5 sm:p-6 lg:p-8 overflow-y-auto min-w-0 w-full">
        <div className="max-w-6xl mx-auto space-y-5 sm:space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                <Users className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-400" />
                KHÁCH HÀNG & PHÂN QUYỀN (RBAC)
              </h1>
              <p className="text-zinc-400 text-xs mt-1">
                Theo dõi dữ liệu khách hàng (SĐT, ngày sinh, tổng chi tiêu, tần suất chơi, phân hạng thành viên Silver, Gold, VIP).
              </p>
            </div>

            <Button
              size="sm"
              className="gap-2 bg-emerald-600 font-semibold"
              onClick={() => setIsAddModalOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Tạo Tài Khoản Mới
            </Button>
          </div>

          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs">
            <div className="relative">
              <Search className="h-4 w-4 text-zinc-500 absolute left-3 top-2.5" />
              <Input
                placeholder="Tìm theo họ tên, SĐT, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>

            <div>
              <select
                value={selectedTier}
                onChange={(e) => setSelectedTier(e.target.value)}
                className="w-full h-9 rounded-lg bg-zinc-950 border border-zinc-800 px-3 text-zinc-200 text-xs"
              >
                <option value="">Tất cả hạng thành viên</option>
                <option value="STANDARD">Hạng Thường (Standard)</option>
                <option value="SILVER">Hạng Bạc (Silver)</option>
                <option value="GOLD">Hạng Vàng (Gold)</option>
                <option value="VIP">Hạng VIP Kim Cương</option>
              </select>
            </div>

            <div>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full h-9 rounded-lg bg-zinc-950 border border-zinc-800 px-3 text-zinc-200 text-xs"
              >
                <option value="">Tất cả vai trò</option>
                <option value="CUSTOMER">Khách Hàng</option>
                <option value="STAFF">Nhân Viên</option>
                <option value="ADMIN">Quản Trị Viên</option>
              </select>
            </div>
          </div>

          {/* Users Table */}
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-xl border border-zinc-800 bg-zinc-900/40 animate-pulse" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12 border border-zinc-800 rounded-xl bg-zinc-900/40 text-xs text-zinc-500">
              Không tìm thấy người dùng phù hợp với điều kiện tìm kiếm.
            </div>
          ) : (
            <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/60 text-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[850px]">
                  <thead className="bg-zinc-950 text-zinc-400 border-b border-zinc-800">
                    <tr>
                      <th className="p-3 whitespace-nowrap">Họ và Tên</th>
                      <th className="p-3 whitespace-nowrap">Số Điện Thoại</th>
                      <th className="p-3 whitespace-nowrap">Ngày Sinh</th>
                      <th className="p-3 whitespace-nowrap">Hạng Thẻ</th>
                      <th className="p-3 whitespace-nowrap">Điểm Tích Lũy</th>
                      <th className="p-3 whitespace-nowrap">Tổng Chi Tiêu</th>
                      <th className="p-3 whitespace-nowrap">Tần Suất Chơi</th>
                      <th className="p-3 whitespace-nowrap">Vai Trò</th>
                      <th className="p-3 whitespace-nowrap">Trạng Thái</th>
                      <th className="p-3 text-right whitespace-nowrap">Khóa / Mở</th>
                    </tr>
                  </thead>
                <tbody className="divide-y divide-zinc-800 text-zinc-300">
                  {users.map((u: any) => (
                    <tr key={u.id} className="hover:bg-zinc-900/50">
                      <td className="p-3 font-semibold text-white">
                        <div>{u.fullName}</div>
                        <div className="text-[10px] text-zinc-500">{u.email}</div>
                      </td>
                      <td className="p-3 font-mono text-zinc-300">{u.phone || "-"}</td>
                      <td className="p-3 text-zinc-400">
                        {u.dateOfBirth
                          ? new Date(u.dateOfBirth).toLocaleDateString("vi-VN")
                          : "-"}
                      </td>
                      <td className="p-3">
                        {u.role === "CUSTOMER" ? getTierBadge(u.membershipTier) : <span className="text-zinc-600">-</span>}
                      </td>
                      <td className="p-3 font-bold text-amber-300">
                        {u.role === "CUSTOMER" ? `${(u.points || 0).toLocaleString("vi-VN")} PTS` : "-"}
                      </td>
                      <td className="p-3 font-bold text-emerald-400">
                        {u.role === "CUSTOMER" ? formatVND(Number(u.totalSpending || 0)) : "-"}
                      </td>
                      <td className="p-3 text-zinc-300">
                        {u.role === "CUSTOMER" ? `${u.visitCount || 0} lần` : "-"}
                      </td>
                      <td className="p-3">
                        <Badge
                          variant={
                            u.role === "ADMIN"
                              ? "danger"
                              : u.role === "STAFF"
                              ? "info"
                              : "default"
                          }
                        >
                          {u.role}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <span
                          className={`font-semibold ${
                            u.status === "ACTIVE"
                              ? "text-emerald-400"
                              : "text-rose-400"
                          }`}
                        >
                          {u.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {u.role !== "ADMIN" && (
                          <Button
                            variant={u.status === "ACTIVE" ? "danger" : "secondary"}
                            size="sm"
                            className="h-7 text-xs px-2"
                            onClick={() =>
                              updateStatusMutation.mutate({
                                id: u.id,
                                status: u.status === "ACTIVE" ? "BLOCKED" : "ACTIVE",
                              })
                            }
                          >
                            {u.status === "ACTIVE" ? "Khóa" : "Mở Khóa"}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          )}
        </div>
      </main>

      {/* Add Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Tạo Tài Khoản Mới"
      >
        <div className="space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-300">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-zinc-300 font-semibold mb-1">Vai trò người dùng:</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="w-full h-9 rounded-lg bg-zinc-950 border border-zinc-800 px-3 text-zinc-200 text-xs"
            >
              <option value="STAFF">Nhân Viên Thu Ngân (STAFF)</option>
              <option value="CUSTOMER">Khách Hàng (CUSTOMER)</option>
            </select>
          </div>

          <div>
            <label className="block text-zinc-300 font-semibold mb-1">Họ và tên:</label>
            <Input
              placeholder="VD: Trần Văn Nam"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-zinc-300 font-semibold mb-1">Email (Định danh đăng nhập):</label>
            <Input
              type="email"
              placeholder="VD: nam.tv@billiards.local"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-zinc-300 font-semibold mb-1">Số điện thoại:</label>
            <Input
              placeholder="VD: 0912345678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-zinc-300 font-semibold mb-1">Mật khẩu khởi tạo:</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsAddModalOpen(false)}>
              Hủy
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 font-semibold"
              isLoading={addUserMutation.isPending}
              onClick={() => addUserMutation.mutate()}
            >
              Tạo Người Dùng
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
