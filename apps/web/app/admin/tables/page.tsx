"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { Sidebar } from "@/components/layout/sidebar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { formatVND } from "@/lib/utils";
import { Plus, Trash2, Edit, TableProperties, DollarSign, Clock, Crown, Sparkles } from "lucide-react";

export default function AdminTablesPage() {
  const queryClient = useQueryClient();
  const [isAddTableModalOpen, setIsAddTableModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<any | null>(null);
  const [editingTable, setEditingTable] = useState<any | null>(null);

  // Form thêm bàn
  const [tableNumber, setTableNumber] = useState("");
  const [tableTypeId, setTableTypeId] = useState("");
  const [area, setArea] = useState<"STANDARD" | "VIP" | "OUTDOOR">("STANDARD");
  const [customHourlyRate, setCustomHourlyRate] = useState<string>("");
  const [note, setNote] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form sửa từng bàn
  const [editTableNumber, setEditTableNumber] = useState("");
  const [editTableTypeId, setEditTableTypeId] = useState("");
  const [editArea, setEditArea] = useState<"STANDARD" | "VIP" | "OUTDOOR">("STANDARD");
  const [editCustomHourlyRate, setEditCustomHourlyRate] = useState<string>("");
  const [editNote, setEditNote] = useState("");

  // Form sửa giá loại bàn
  const [typeName, setTypeName] = useState("");
  const [hourlyRate, setHourlyRate] = useState<number>(80000);
  const [typeDescription, setTypeDescription] = useState("");

  const { data: tables = [], isLoading: isLoadingTables } = useQuery({
    queryKey: ["admin-tables"],
    queryFn: () => apiClient("/tables"),
  });

  const { data: tableTypes = [], isLoading: isLoadingTypes } = useQuery({
    queryKey: ["table-types"],
    queryFn: () => apiClient("/table-types"),
  });

  // Thêm bàn mới
  const addTableMutation = useMutation({
    mutationFn: async () => {
      return apiClient("/tables", {
        method: "POST",
        body: JSON.stringify({
          tableNumber,
          tableTypeId,
          area,
          hourlyRate: customHourlyRate ? Number(customHourlyRate) : null,
          note,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tables"] });
      setIsAddTableModalOpen(false);
      setTableNumber("");
      setCustomHourlyRate("");
      setNote("");
      setErrorMsg(null);
    },
    onError: (err: any) => setErrorMsg(err.message || "Không thể tạo bàn mới"),
  });

  // Sửa thông tin & đơn giá riêng của từng bàn
  const updateTableMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        tableNumber: editTableNumber,
        tableTypeId: editTableTypeId,
        area: editArea,
        note: editNote,
      };

      if (editCustomHourlyRate) {
        payload.hourlyRate = Number(editCustomHourlyRate);
      }

      try {
        return await apiClient(`/tables/${editingTable.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } catch (err: any) {
        // Tự động tương thích nếu server backend chưa kịp restart nhận trường hourlyRate
        if (err?.message?.includes("hourlyRate") && payload.hourlyRate) {
          try {
            await apiClient(`/table-types/${editTableTypeId}`, {
              method: "PUT",
              body: JSON.stringify({
                hourlyRate: Number(editCustomHourlyRate),
              }),
            });
          } catch (typeErr) {
            console.warn("Could not update table-type price fallback", typeErr);
          }

          delete payload.hourlyRate;
          return await apiClient(`/tables/${editingTable.id}`, {
            method: "PUT",
            body: JSON.stringify(payload),
          });
        }
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tables"] });
      queryClient.invalidateQueries({ queryKey: ["table-types"] });
      setEditingTable(null);
      setErrorMsg(null);
      alert("✅ Đã cập nhật đơn giá và thông tin bàn thành công!");
    },
    onError: (err: any) => setErrorMsg(err.message || "Lỗi khi cập nhật bàn"),
  });

  // Cập nhật giá giờ của loại bàn
  const updateTypeMutation = useMutation({
    mutationFn: async () => {
      return apiClient(`/table-types/${editingType.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: typeName,
          hourlyRate: Number(hourlyRate),
          description: typeDescription,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["table-types"] });
      queryClient.invalidateQueries({ queryKey: ["admin-tables"] });
      setEditingType(null);
      setErrorMsg(null);
    },
    onError: (err: any) => setErrorMsg(err.message || "Lỗi khi cập nhật giá loại bàn"),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return apiClient(`/tables/${id}/status`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-tables"] }),
  });

  const deleteTableMutation = useMutation({
    mutationFn: async (id: string) => apiClient(`/tables/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-tables"] }),
    onError: (err: any) => alert(err.message || "Lỗi khi xóa bàn"),
  });

  const openEditTypeModal = (type: any) => {
    setEditingType(type);
    setTypeName(type.name);
    setHourlyRate(Number(type.hourlyRate));
    setTypeDescription(type.description || "");
    setErrorMsg(null);
  };

  const openEditTableModal = (table: any) => {
    setEditingTable(table);
    setEditTableNumber(table.tableNumber);
    setEditTableTypeId(table.tableTypeId);
    setEditArea(table.area || "STANDARD");
    setEditCustomHourlyRate(table.hourlyRate != null ? String(Number(table.hourlyRate)) : "");
    setEditNote(table.note || "");
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-zinc-950 text-zinc-100">
      <Sidebar role="ADMIN" />

      <main className="flex-1 p-3.5 sm:p-6 lg:p-8 overflow-y-auto min-w-0 w-full">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-white">QUẢN LÝ BÀN & ĐƠN GIÁ GIỜ</h1>
              <p className="text-zinc-400 text-xs mt-1">
                Điều chỉnh giá giờ riêng cho từng bàn (Bàn VIP, Bàn chuẩn), sửa giá theo loại bàn và quản lý trạng thái.
              </p>
            </div>

            <Button
              className="gap-2 bg-emerald-600 font-semibold"
              onClick={() => {
                if (tableTypes.length > 0 && !tableTypeId) {
                  setTableTypeId(tableTypes[0].id);
                }
                setIsAddTableModalOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Thêm Bàn Bi-Da
            </Button>
          </div>

          {/* Section 1: Đơn Giá Theo Loại Bàn (Base Pricing) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-emerald-400" />
                Bảng Giá Mặc Định Theo Loại Bàn
              </h2>
              <span className="text-xs text-zinc-500">Bấm &quot;Sửa Giá&quot; để đổi giá chung của dòng bàn</span>
            </div>

            {isLoadingTypes ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-28 rounded-xl border border-zinc-800 bg-zinc-900/40 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {tableTypes.map((type: any) => (
                  <Card key={type.id} className="p-4 border-zinc-800 bg-zinc-900/60 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-white text-xs">{type.name}</span>
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {type.code}
                        </Badge>
                      </div>
                      <div className="mt-2 text-xl font-black text-emerald-400">
                        {formatVND(type.hourlyRate)}
                        <span className="text-xs font-normal text-zinc-500"> / giờ</span>
                      </div>
                      <p className="mt-1 text-[11px] text-zinc-400 line-clamp-2">
                        {type.description || "Chưa có mô tả"}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-zinc-800/80 flex justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1 border-zinc-700"
                        onClick={() => openEditTypeModal(type)}
                      >
                        <Edit className="h-3 w-3" />
                        Sửa Giá Loại Bàn
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Danh Sách Từng Bàn & Giá Riêng */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <TableProperties className="h-4 w-4 text-emerald-400" />
                Danh Sách Bàn Vật Lý &amp; Giá Thuê Từng Bàn ({tables.length} bàn)
              </h2>
              <span className="text-xs text-zinc-400">Bàn VIP có thể đặt giá riêng cao hơn bàn thường</span>
            </div>

            {isLoadingTables ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-16 rounded-xl border border-zinc-800 bg-zinc-900/40 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/60 text-xs">
                <table className="w-full text-left">
                  <thead className="bg-zinc-950 text-zinc-400 border-b border-zinc-800">
                    <tr>
                      <th className="p-3.5">Mã Bàn</th>
                      <th className="p-3.5">Loại Bàn</th>
                      <th className="p-3.5">Khu Vực</th>
                      <th className="p-3.5">Đơn Giá / Giờ</th>
                      <th className="p-3.5">Trạng Thái</th>
                      <th className="p-3.5 text-right">Hành Động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800 text-zinc-300">
                    {tables.map((t: any) => {
                      const effectiveRate = t.hourlyRate != null ? Number(t.hourlyRate) : Number(t.tableType?.hourlyRate || 80000);
                      const isCustom = t.hourlyRate != null;
                      const isVip = t.area === "VIP";

                      return (
                        <tr key={t.id} className="hover:bg-zinc-900/50">
                          <td className="p-3.5 font-black text-white text-sm">
                            <div className="flex items-center gap-1.5">
                              {isVip && <Crown className="h-3.5 w-3.5 text-amber-400" />}
                              <span>{t.tableNumber}</span>
                            </div>
                          </td>
                          <td className="p-3.5 font-semibold text-zinc-200">
                            {t.tableType?.name}
                          </td>
                          <td className="p-3.5">
                            <span
                              className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                                isVip
                                  ? "bg-amber-950/80 text-amber-300 border border-amber-800/60"
                                  : "bg-zinc-800 text-zinc-300"
                              }`}
                            >
                              {t.area}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-emerald-400 text-sm">
                                {formatVND(effectiveRate)}/h
                              </span>
                              {isCustom ? (
                                <Badge className="bg-amber-600 text-white text-[10px] font-semibold py-0 px-1.5">
                                  Giá riêng
                                </Badge>
                              ) : (
                                <span className="text-[10px] text-zinc-500 font-medium">
                                  (Giá loại bàn)
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3.5">
                            <select
                              value={t.status}
                              disabled={updateStatusMutation.isPending}
                              onChange={(e) =>
                                updateStatusMutation.mutate({
                                  id: t.id,
                                  status: e.target.value,
                                })
                              }
                              className="bg-zinc-900 border border-zinc-700 text-zinc-200 rounded-md px-2 py-1 text-xs focus:ring-emerald-500"
                            >
                              <option value="AVAILABLE">AVAILABLE (Trống)</option>
                              <option value="OCCUPIED">OCCUPIED (Đang chơi)</option>
                              <option value="RESERVED">RESERVED (Đã đặt)</option>
                              <option value="MAINTENANCE">MAINTENANCE (Bảo trì)</option>
                            </select>
                          </td>
                          <td className="p-3.5 text-right space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs px-2.5 gap-1 border-zinc-700 hover:bg-zinc-800 text-emerald-400 font-semibold"
                              onClick={() => openEditTableModal(t)}
                            >
                              <Edit className="h-3.5 w-3.5" />
                              Sửa Giá Bàn
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              className="h-7 text-xs px-2"
                              onClick={() => {
                                if (confirm(`Bạn chắc chắn muốn xóa bàn ${t.tableNumber}?`)) {
                                  deleteTableMutation.mutate(t.id);
                                }
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modal 1: Sửa Giá Giờ Riêng Từng Bàn (Bàn VIP / Bàn Thường) */}
      <Modal
        isOpen={Boolean(editingTable)}
        onClose={() => setEditingTable(null)}
        title={`Sửa Giá & Thông Tin Bàn ${editingTable?.tableNumber}`}
        description="Bạn có thể đặt giá thuê riêng cho bàn này (VD: Bàn VIP) hoặc để trống để dùng giá mặc định của loại bàn."
      >
        <div className="space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-300">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-zinc-300 font-semibold mb-1">Mã số bàn:</label>
            <Input
              value={editTableNumber}
              onChange={(e) => setEditTableNumber(e.target.value.toUpperCase())}
            />
          </div>

          <div>
            <label className="block text-zinc-300 font-semibold mb-1">Loại bàn:</label>
            <select
              value={editTableTypeId}
              onChange={(e) => setEditTableTypeId(e.target.value)}
              className="w-full h-10 rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-zinc-100"
            >
              {tableTypes.map((t: any) => (
                <option key={t.id} value={t.id}>
                  {t.name} (Giá gốc loại bàn: {formatVND(t.hourlyRate)}/h)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-zinc-300 font-semibold mb-1">Khu vực phân bố:</label>
            <select
              value={editArea}
              onChange={(e) => setEditArea(e.target.value as any)}
              className="w-full h-10 rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-zinc-100"
            >
              <option value="STANDARD">Khu Tiêu Chuẩn (STANDARD)</option>
              <option value="VIP">Phòng VIP (VIP)</option>
              <option value="OUTDOOR">Khu Ngoài Trời (OUTDOOR)</option>
            </select>
          </div>

          {/* Đơn giá riêng của bàn */}
          <div className="p-3 rounded-xl bg-zinc-950 border border-emerald-900/60 space-y-1.5">
            <label className="block text-emerald-400 font-bold">
              Đơn Giá Thuê Riêng Của Bàn Này (VNĐ / giờ):
            </label>
            <Input
              type="number"
              min={0}
              step={5000}
              value={editCustomHourlyRate}
              onChange={(e) => setEditCustomHourlyRate(e.target.value)}
              placeholder="Để trống nếu dùng giá mặc định loại bàn"
              className="text-emerald-400 font-bold text-base"
            />
            <p className="text-[11px] text-zinc-400">
              💡 <em>Ví dụ bàn VIP bạn có thể đặt <strong>120.000 đ/h</strong> hoặc <strong>150.000 đ/h</strong>. Nếu để trống, hệ thống tự động tính theo giá loại bàn.</em>
            </p>
          </div>

          <div>
            <label className="block text-zinc-300 font-semibold mb-1">Ghi chú đặc điểm:</label>
            <Input
              value={editNote}
              onChange={(e) => setEditNote(e.target.value)}
              placeholder="VD: Phòng VIP sô pha riêng, view thoáng..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
            <Button variant="outline" size="sm" onClick={() => setEditingTable(null)}>
              Hủy
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 font-semibold"
              isLoading={updateTableMutation.isPending}
              disabled={!editTableNumber}
              onClick={() => updateTableMutation.mutate()}
            >
              Lưu Đơn Giá Bàn
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal 2: Sửa Giá Mặc Định Loại Bàn */}
      <Modal
        isOpen={Boolean(editingType)}
        onClose={() => setEditingType(null)}
        title={`Sửa Giá Giờ Loại Bàn: ${editingType?.name}`}
        description={`Mã loại bàn: ${editingType?.code}`}
      >
        <div className="space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-300">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-zinc-300 font-semibold mb-1">Tên loại bàn:</label>
            <Input
              value={typeName}
              onChange={(e) => setTypeName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-zinc-300 font-semibold mb-1">Đơn giá giờ mới (VNĐ/giờ):</label>
            <Input
              type="number"
              min={10000}
              step={5000}
              value={hourlyRate}
              onChange={(e) => setHourlyRate(Number(e.target.value))}
              className="text-emerald-400 font-bold text-base"
            />
          </div>

          <div>
            <label className="block text-zinc-300 font-semibold mb-1">Mô tả đặc điểm:</label>
            <Input
              value={typeDescription}
              onChange={(e) => setTypeDescription(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
            <Button variant="outline" size="sm" onClick={() => setEditingType(null)}>
              Hủy
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 font-semibold"
              isLoading={updateTypeMutation.isPending}
              disabled={!typeName}
              onClick={() => updateTypeMutation.mutate()}
            >
              Cập Nhật Giá Bàn
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal 3: Thêm Bàn Mới */}
      <Modal
        isOpen={isAddTableModalOpen}
        onClose={() => setIsAddTableModalOpen(false)}
        title="Thêm Bàn Bi-Da Mới"
        description="Tạo bàn mới và có thể đặt giá riêng cho bàn VIP hoặc bàn đặc biệt"
      >
        <div className="space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-300">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-zinc-300 font-semibold mb-1">Số / Mã bàn (VD: B11, VIP03):</label>
            <Input
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value.toUpperCase())}
              placeholder="VD: B11"
            />
          </div>

          <div>
            <label className="block text-zinc-300 font-semibold mb-1">Loại bàn bi-da:</label>
            <select
              value={tableTypeId}
              onChange={(e) => setTableTypeId(e.target.value)}
              className="w-full h-10 rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-zinc-100"
            >
              {tableTypes.map((t: any) => (
                <option key={t.id} value={t.id}>
                  {t.name} (Giá gốc loại bàn: {formatVND(t.hourlyRate)}/h)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-zinc-300 font-semibold mb-1">Khu vực phân bố:</label>
            <select
              value={area}
              onChange={(e) => setArea(e.target.value as any)}
              className="w-full h-10 rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-zinc-100"
            >
              <option value="STANDARD">Khu Tiêu Chuẩn (STANDARD)</option>
              <option value="VIP">Phòng VIP (VIP)</option>
              <option value="OUTDOOR">Khu Ngoài Trời (OUTDOOR)</option>
            </select>
          </div>

          <div>
            <label className="block text-zinc-300 font-semibold mb-1">
              Đơn giá giờ riêng của bàn này (VNĐ/giờ - Tùy chọn):
            </label>
            <Input
              type="number"
              min={0}
              step={5000}
              value={customHourlyRate}
              onChange={(e) => setCustomHourlyRate(e.target.value)}
              placeholder="VD: 120000 (để trống nếu dùng giá mặc định)"
            />
          </div>

          <div>
            <label className="block text-zinc-300 font-semibold mb-1">Ghi chú thêm:</label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="VD: Phòng VIP riêng tư, sofa cao cấp..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
            <Button variant="outline" size="sm" onClick={() => setIsAddTableModalOpen(false)}>
              Hủy
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 font-semibold"
              isLoading={addTableMutation.isPending}
              disabled={!tableNumber || !tableTypeId}
              onClick={() => addTableMutation.mutate()}
            >
              Tạo Bàn Mới
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
