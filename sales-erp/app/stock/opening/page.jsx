"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppPageShell from "../../components/AppPageShell";
import {
  Check,
  ChevronDown,
  Trash2,
  Pencil,
  X,
} from "lucide-react";
import {
  APP_EVENTS,
  getDefaultAgingStockDate,
  parseQuantity,
  persistInventoryAlerts,
  persistOpeningStockBalances,
  persistOpeningStockRows,
  readOpeningStockBalances,
  readOpeningStockRows,
  readSalesRuleRecords,
} from "../../utils/businessRules";
import { buildApiUrl } from "../../utils/api";

export default function OpeningStockPage() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [openingRows, setOpeningRows] = useState([]);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [toast, setToast] = useState(null);
  const itemApiCandidates = [buildApiUrl("/api/items/"), buildApiUrl("/api/items")];

  const fetchFirstWorking = async (urls, options = {}) => {
    let lastError = null;

    for (const url of urls) {
      try {
        const response = await fetch(url, options);
        if (response.ok) return response;
        if (response.status !== 404) throw new Error(`Failed with status ${response.status}`);
        lastError = new Error(`404 at ${url}`);
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error("Unable to fetch items");
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    const fetchItems = async () => {
      try {
        const response = await fetchFirstWorking(itemApiCandidates, {
          headers: { Authorization: `Token ${token}` },
        });

        const data = await response.json();
        const safeItems = Array.isArray(data) ? data : [];
        setItems(safeItems);
        setOpeningRows(readOpeningStockRows());
      } catch (error) {
        console.error(error);
        setItems([]);
        setOpeningRows([]);
      }
    };

    fetchItems();
  }, [router]);

  useEffect(() => {
    const syncOpeningRows = () => {
      setOpeningRows(readOpeningStockRows());
    };

    window.addEventListener("focus", syncOpeningRows);
    window.addEventListener("storage", syncOpeningRows);
    window.addEventListener(APP_EVENTS.inventoryUpdated, syncOpeningRows);

    return () => {
      window.removeEventListener("focus", syncOpeningRows);
      window.removeEventListener("storage", syncOpeningRows);
      window.removeEventListener(APP_EVENTS.inventoryUpdated, syncOpeningRows);
    };
  }, []);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3000);
  };

  const selectedItem = useMemo(
    () => items.find((item) => String(item.id) === String(selectedItemId)) || null,
    [items, selectedItemId]
  );

  useEffect(() => {
    if (!selectedItem) {
      setQuantity("");
      return;
    }

    const existingOpeningRow = openingRows.find(
      (row) => String(row.item_id ?? row.id) === String(selectedItem.id)
    );
    const stockBalances = readOpeningStockBalances();
    const savedBalance = stockBalances[String(selectedItem.id)];

    setQuantity(
      String(
        existingOpeningRow
          ? parseQuantity(existingOpeningRow.quantity)
          : savedBalance !== undefined
            ? parseQuantity(savedBalance)
          : parseQuantity(selectedItem.min_stock_qty || selectedItem.min_order_qty)
      )
    );
  }, [openingRows, selectedItem]);

  const handleAdd = () => {
    if (!selectedItem || quantity === "") return;

    setOpeningRows((prev) =>
      prev.some((row) => String(row.item_id ?? row.id) === String(selectedItem.id))
        ? prev.map((row) =>
            String(row.item_id ?? row.id) === String(selectedItem.id)
              ? {
                  ...row,
                  item_code: selectedItem.item_code || "",
              item_name: selectedItem.item_name || "",
              unit: selectedItem.unit || "",
              quantity: parseQuantity(quantity),
              item_category: selectedItem.item_category || "",
              min_stock_qty: parseQuantity(selectedItem.min_stock_qty),
              stock_date: row.stock_date || getDefaultAgingStockDate(),
            }
          : row
      )
        : [
            ...prev,
            {
              id: selectedItem.id,
              item_id: selectedItem.id,
              item_code: selectedItem.item_code || "",
              item_name: selectedItem.item_name || "",
              unit: selectedItem.unit || "",
              quantity: parseQuantity(quantity),
              item_category: selectedItem.item_category || "",
              min_stock_qty: parseQuantity(selectedItem.min_stock_qty),
              stock_date: getDefaultAgingStockDate(),
            },
          ]
    );

    setSelectedItemId("");
    setQuantity("");
  };

  const handleRemoveRow = (id) => {
    setOpeningRows((prev) => prev.filter((row) => row.id !== id));
  };

  const handleEditRow = (row) => {
    setEditingId(row.id);
    setEditFormData({ ...row });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveRow = (id) => {
    setOpeningRows((prev) =>
      prev.map((row) =>
        row.id === id
          ? {
              ...row,
              ...editFormData,
              quantity: parseQuantity(editFormData.quantity),
            }
          : row
      )
    );
    setEditingId(null);
    setEditFormData({});
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditFormData({});
  };

  const handleSubmit = () => {
    const existingBalances = readOpeningStockBalances();
    const nextBalances = { ...existingBalances };

    openingRows.forEach((row) => {
      nextBalances[String(row.item_id ?? row.id ?? row.item_code)] = parseQuantity(row.quantity);
    });

    persistOpeningStockBalances(nextBalances);
    persistOpeningStockRows(openingRows);
    persistInventoryAlerts({
      openingRows,
      salesRecords: readSalesRuleRecords(),
    });
    showToast("Opening stock submitted successfully!", "success");
  };

  return (
    <AppPageShell
      contentClassName="mx-auto w-full max-w-[1240px] px-2 py-2"
    >
          {toast ? (
            <div className={`fixed right-5 top-5 z-[100] flex items-center gap-3 rounded-lg px-5 py-3 text-white shadow-2xl ${toast.type === "success" ? "bg-emerald-500" : "bg-red-500"}`}>
              <span className="text-[13px] font-bold">{toast.message}</span>
              <button onClick={() => setToast(null)} className="text-white">
                <X size={16} />
              </button>
            </div>
          ) : null}
            <div className="mt-3 rounded-[24px] border border-slate-300 bg-white px-5 py-5 shadow-[0_4px_18px_rgba(15,23,42,0.05)]">
              <div className="flex items-start justify-between">
                <h1 className="text-[17px] font-bold text-slate-900">New Opening</h1>

                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="mb-2 block text-[12px] font-semibold text-slate-800">Date</label>
                    <input
                      className="h-[34px] w-[190px] rounded-[10px] border border-slate-300 bg-slate-100 px-3 text-[12px] text-slate-800 outline-none"
                      defaultValue="23-03-2026"
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-[12px] font-semibold text-slate-800">Code</label>
                    <input
                      className="h-[34px] w-[190px] rounded-[10px] border border-slate-300 bg-slate-100 px-3 text-[12px] text-slate-800 outline-none"
                      defaultValue="OP01"
                      readOnly
                    />
                  </div>
                </div>
              </div>

              <div className="mt-12">
                <h2 className="text-[17px] font-bold text-slate-900">Item Details</h2>

                <div className="mt-6 grid grid-cols-[1fr_1.8fr_1fr_1fr_auto] items-end gap-4">
                  <div>
                    <label className="mb-2 block text-[12px] font-semibold text-slate-800">Item Code</label>
                    <input
                      className="h-[34px] w-full rounded-[10px] border border-slate-300 bg-slate-100 px-3 text-[12px] outline-none"
                      value={selectedItem?.item_code || ""}
                      readOnly
                    />
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between text-[12px] font-semibold text-slate-800">
                      <span>Item Name</span>
                      <span>
                        Avl.Qty: <span className="text-red-500">{quantity || 0}</span>
                      </span>
                    </div>
                    <div className="relative">
                      <select
                        className="h-[34px] w-full appearance-none rounded-[10px] border border-slate-300 bg-white px-3 text-[12px] text-slate-500 outline-none"
                        value={selectedItemId}
                        onChange={(e) => setSelectedItemId(e.target.value)}
                      >
                        <option value="">Choose Item</option>
                        {items.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.item_name}
                          </option>
                        ))}
                      </select>
                      <span className="pointer-events-none absolute inset-y-0 right-11 my-auto h-5 w-px bg-slate-300" />
                      <ChevronDown className="pointer-events-none absolute inset-y-0 right-3 my-auto text-slate-400" size={16} />
                    </div>
                  </div>
                  <div>
                    <label className="mb-2 block text-[12px] font-semibold text-slate-800">Unit</label>
                    <input
                      className="h-[34px] w-full rounded-[10px] border border-slate-300 bg-slate-100 px-3 text-[12px] outline-none"
                      value={selectedItem?.unit || ""}
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-[12px] font-semibold text-slate-800">Quantity</label>
                    <input
                      className="h-[34px] w-full rounded-[10px] border border-slate-300 bg-slate-100 px-3 text-[12px] outline-none"
                      value={quantity}
                      readOnly
                    />
                  </div>
                  <button
                    onClick={handleAdd}
                    className="h-[34px] rounded-[10px] bg-[#2faf52] px-6 text-[13px] font-bold text-white shadow-[0_8px_18px_rgba(47,175,82,0.28)]"
                  >
                    ADD
                  </button>
                </div>

                <div className="mt-6 overflow-hidden rounded-[12px] border border-sky-100">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="bg-white">
                        <th className="w-[42px] border border-slate-200 px-2 py-2.5 text-center text-[13px] font-bold">#</th>
                        <th className="border border-slate-200 px-4 py-2.5 text-center text-[13px] font-bold">Item Code</th>
                        <th className="border border-slate-200 px-4 py-2.5 text-center text-[13px] font-bold">Item Name</th>
                        <th className="border border-slate-200 px-4 py-2.5 text-center text-[13px] font-bold">Unit</th>
                        <th className="border border-slate-200 px-4 py-2.5 text-center text-[13px] font-bold">Quantity</th>
                        <th className="border border-slate-200 px-4 py-2.5 text-center text-[13px] font-bold">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {openingRows.length > 0 ? (
                        openingRows.map((row, index) => (
                          <tr key={row.id} className="bg-white">
                            <td className="border border-slate-200 px-2 py-2.5 text-center text-[13px]">{index + 1}</td>
                            <td className="border border-slate-200 px-4 py-2.5 text-center text-[13px]">
                              {editingId === row.id ? (
                                <input
                                  name="item_code"
                                  value={editFormData.item_code || ""}
                                  onChange={handleEditChange}
                                  className="w-full rounded border border-slate-300 px-2 py-1 text-center outline-none"
                                />
                              ) : (
                                row.item_code
                              )}
                            </td>
                            <td className="border border-slate-200 px-4 py-2.5 text-center text-[13px]">
                              {editingId === row.id ? (
                                <input
                                  name="item_name"
                                  value={editFormData.item_name || ""}
                                  onChange={handleEditChange}
                                  className="w-full rounded border border-slate-300 px-2 py-1 text-center outline-none"
                                />
                              ) : (
                                row.item_name
                              )}
                            </td>
                            <td className="border border-slate-200 px-4 py-2.5 text-center text-[13px]">
                              {editingId === row.id ? (
                                <input
                                  name="unit"
                                  value={editFormData.unit || ""}
                                  onChange={handleEditChange}
                                  className="w-full rounded border border-slate-300 px-2 py-1 text-center outline-none"
                                />
                              ) : (
                                row.unit
                              )}
                            </td>
                            <td className="border border-slate-200 px-4 py-2.5 text-center text-[13px]">
                              {editingId === row.id ? (
                                <input
                                  name="quantity"
                                  value={editFormData.quantity || ""}
                                  onChange={handleEditChange}
                                  className="w-full rounded border border-slate-300 px-2 py-1 text-center outline-none"
                                />
                              ) : (
                                row.quantity
                              )}
                            </td>
                            <td className="border border-slate-200 px-4 py-2.5 text-center">
                              <div className="flex items-center justify-center gap-3">
                                {editingId === row.id ? (
                                  <>
                                    <button onClick={() => handleSaveRow(row.id)} className="text-emerald-600">
                                      <Check size={16} />
                                    </button>
                                    <button onClick={handleCancelEdit} className="text-slate-400">
                                      <X size={16} />
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button onClick={() => handleEditRow(row)} className="text-blue-600">
                                      <Pencil size={16} />
                                    </button>
                                    <button onClick={() => handleRemoveRow(row.id)} className="text-rose-500">
                                      <Trash2 size={16} />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="border border-slate-200 px-4 py-9 text-center text-[13px] text-slate-400">
                            No Records Added
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="mt-7 flex items-center gap-3">
                  <button
                    onClick={handleSubmit}
                    className="rounded-[10px] bg-[#34b556] px-6 py-2.5 text-[13px] font-bold text-white shadow-[0_8px_18px_rgba(52,181,86,0.25)]"
                  >
                    SUBMIT
                  </button>
                  <button className="rounded-[10px] bg-[#ff9533] px-6 py-2.5 text-[13px] font-bold text-white shadow-[0_8px_18px_rgba(255,149,51,0.25)]">
                    CANCEL
                  </button>
                </div>

                <div className="mt-3 text-right text-[12px] font-semibold">
                  <span className="text-red-500">Note:</span>{" "}
                  <span className="text-slate-700">Fields marked with [ ] are mandatory.</span>
                </div>
              </div>
            </div>
    </AppPageShell>
  );
}
