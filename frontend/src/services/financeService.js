import api from "../utils/apiClient";
import { localToday } from "../utils/taskUtils";

// Money management (Premium). All functions return the ApiResponse.data payload.
const data = (res) => res.data.data;

export const getSettings = async () => data(await api.get("/api/finance/settings"));
export const saveSettings = async (changes) => data(await api.patch("/api/finance/settings", changes));
export const getSummary = async (month) => data(await api.get("/api/finance/summary", { params: { month } }));

export const listTransactions = async (month, type) =>
  data(await api.get("/api/finance/transactions", { params: { month, type } }));
export const addTransaction = async (entry) => data(await api.post("/api/finance/transactions", entry));
export const updateTransaction = async (id, changes) => data(await api.patch(`/api/finance/transactions/${id}`, changes));
export const deleteTransaction = async (id) => data(await api.delete(`/api/finance/transactions/${id}`));

export const listBills = async () => data(await api.get("/api/finance/bills"));
export const addBill = async (bill) => data(await api.post("/api/finance/bills", bill));
export const updateBill = async (id, changes) => data(await api.patch(`/api/finance/bills/${id}`, changes));
export const deleteBill = async (id) => data(await api.delete(`/api/finance/bills/${id}`));
export const payBill = async (id, today) => data(await api.post(`/api/finance/bills/${id}/pay`, { today }));

export const listClients = async () => data(await api.get("/api/finance/clients"));
export const addClient = async (client) => data(await api.post("/api/finance/clients", client));
export const updateClient = async (id, changes) => data(await api.patch(`/api/finance/clients/${id}`, changes));
export const deleteClient = async (id) => data(await api.delete(`/api/finance/clients/${id}`));

export const getUnbilled = async () => data(await api.get("/api/finance/unbilled"));
export const listInvoices = async () => data(await api.get("/api/finance/invoices"));
export const createInvoice = async (clientId, dueDays) =>
  data(await api.post("/api/finance/invoices", { clientId, dueDays, today: localToday() }));
export const updateInvoice = async (id, changes) =>
  data(await api.patch(`/api/finance/invoices/${id}`, { ...changes, today: localToday() }));
export const deleteInvoice = async (id) => data(await api.delete(`/api/finance/invoices/${id}`));
