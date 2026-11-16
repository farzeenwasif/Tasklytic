import mongoose from "mongoose";
import Tasks from "../models/tasksSchema.js";
import {
  BILL_FREQUENCIES,
  Bill,
  CURRENCIES,
  Client,
  EXPENSE_CATEGORIES,
  FinanceSettings,
  INCOME_CATEGORIES,
  Invoice,
  TimeEntry,
  Transaction,
} from "../models/financeSchemas.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { logActivity } from "../utils/logActivity.js";
import { afterCompleted, createBillTask, isDay, stopTimer } from "../utils/taskLifecycle.js";

// ---------- helpers ----------

const ok = (res, data, message = "OK", status = 200) => res.status(status).json(new ApiResponse(status, data, message));
const own = (req, extra = {}) => ({ userId: req.user._id, ...extra });
const money = (n) => Math.round((Number(n) || 0) * 100) / 100;
const text = (v, max) => String(v ?? "").trim().slice(0, max);

const idParam = (req) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(400, "Invalid id");
  return req.params.id;
};

const findOwn = async (Model, req, what) => {
  const doc = await Model.findOne(own(req, { _id: idParam(req) }));
  if (!doc) throw new ApiError(404, `${what} not found`);
  return doc;
};

const positiveAmount = (value) => {
  const n = money(value);
  if (!(n > 0)) throw new ApiError(400, "Enter an amount above 0");
  if (n > 1e10) throw new ApiError(400, "That amount is too large");
  return n;
};

// "YYYY-MM" -> [first day, first day of next month) in UTC
const monthRange = (value) => {
  const m = /^(\d{4})-(\d{2})$/.exec(value || "");
  const now = new Date();
  const year = m ? +m[1] : now.getUTCFullYear();
  const month = m ? +m[2] - 1 : now.getUTCMonth();
  return [new Date(Date.UTC(year, month, 1)), new Date(Date.UTC(year, month + 1, 1))];
};
const monthKey = (d) => d.toISOString().slice(0, 7);

const getSettings = async (userId) =>
  (await FinanceSettings.findOne({ userId })) || (await FinanceSettings.create({ userId }));

// ---------- settings & budgets ----------

export const getFinanceSettings = asyncHandler(async (req, res) => {
  const settings = await getSettings(req.user._id);
  return ok(res, {
    settings,
    options: { currencies: CURRENCIES, expenseCategories: EXPENSE_CATEGORIES, incomeCategories: INCOME_CATEGORIES, billFrequencies: BILL_FREQUENCIES },
  });
});

export const updateFinanceSettings = asyncHandler(async (req, res) => {
  const settings = await getSettings(req.user._id);
  const b = req.body || {};
  if (b.currency !== undefined) {
    if (!CURRENCIES.includes(b.currency)) throw new ApiError(400, "Unknown currency");
    settings.currency = b.currency;
  }
  if (b.budgets !== undefined) {
    const seen = new Set();
    settings.budgets = (Array.isArray(b.budgets) ? b.budgets : [])
      .map((x) => ({ category: text(x?.category, 40), limit: money(x?.limit) }))
      .filter((x) => x.category && x.limit > 0 && !seen.has(x.category) && seen.add(x.category))
      .slice(0, 30);
  }
  if (b.businessName !== undefined) settings.businessName = text(b.businessName, 80);
  if (b.invoicePrefix !== undefined) settings.invoicePrefix = text(b.invoicePrefix, 10).replace(/[^A-Za-z0-9-]/g, "") || "INV";
  if (b.invoiceNote !== undefined) settings.invoiceNote = text(b.invoiceNote, 300);
  await settings.save();
  return ok(res, settings, "Settings saved");
});

// ---------- transactions ----------

const transactionFields = (b, partial = false) => {
  const data = {};
  if (!partial || b.type !== undefined) {
    if (!["expense", "income"].includes(b.type)) throw new ApiError(400, "Choose expense or income");
    data.type = b.type;
  }
  if (!partial || b.amount !== undefined) data.amount = positiveAmount(b.amount);
  if (!partial || b.category !== undefined) data.category = text(b.category, 40) || "Other";
  if (b.note !== undefined) data.note = text(b.note, 200);
  if (!partial || b.date !== undefined) {
    data.date = isDay(b.date) ? new Date(b.date) : new Date(new Date().toISOString().slice(0, 10));
  }
  return data;
};

export const listTransactions = asyncHandler(async (req, res) => {
  const [from, to] = monthRange(req.query.month);
  const filter = own(req, { date: { $gte: from, $lt: to } });
  if (["expense", "income"].includes(req.query.type)) filter.type = req.query.type;
  const items = await Transaction.find(filter).sort({ date: -1, createdAt: -1 }).limit(500);
  return ok(res, items);
});

export const createTransaction = asyncHandler(async (req, res) => {
  const item = await Transaction.create({ ...transactionFields(req.body || {}), userId: req.user._id });
  await logActivity(req.user._id, "money_added", `Added ${item.type} "${item.note || item.category}"`, {
    amount: item.amount,
  });
  return ok(res, item, "Saved", 201);
});

export const updateTransaction = asyncHandler(async (req, res) => {
  const item = await findOwn(Transaction, req, "Entry");
  Object.assign(item, transactionFields(req.body || {}, true));
  await item.save();
  return ok(res, item, "Saved");
});

export const deleteTransaction = asyncHandler(async (req, res) => {
  const item = await findOwn(Transaction, req, "Entry");
  await item.deleteOne();
  // Keep the links consistent: the bill task no longer has a payment, the invoice is no longer paid
  await Tasks.updateMany(own(req, { paymentId: item._id }), { $set: { paymentId: null } });
  if (item.invoiceId) {
    await Invoice.updateOne(own(req, { _id: item.invoiceId, status: "paid" }), { $set: { status: "sent", paidAt: null } });
  }
  return ok(res, { _id: item._id }, "Deleted");
});

// ---------- bills ----------

const billFields = (b, partial = false) => {
  const data = {};
  if (!partial || b.name !== undefined) {
    data.name = text(b.name, 80);
    if (!data.name) throw new ApiError(400, "Give the bill a name");
  }
  if (!partial || b.amount !== undefined) data.amount = positiveAmount(b.amount);
  if (b.category !== undefined) data.category = text(b.category, 40) || "Bills & Utilities";
  if (b.frequency !== undefined) {
    if (!BILL_FREQUENCIES.includes(b.frequency)) throw new ApiError(400, "Choose how often it repeats");
    data.frequency = b.frequency;
  }
  if (!partial || b.nextDueDate !== undefined) {
    if (!isDay(b.nextDueDate)) throw new ApiError(400, "Pick the next due date");
    data.nextDueDate = new Date(b.nextDueDate);
  }
  return data;
};

// Bills with their current open task (if any)
const withTasks = async (bills) => {
  const tasks = await Tasks.find({ _id: { $in: bills.map((b) => b.taskId).filter(Boolean) } }).lean();
  const byId = new Map(tasks.map((t) => [String(t._id), t]));
  return bills.map((b) => ({ ...b.toObject(), task: b.taskId ? byId.get(String(b.taskId)) || null : null }));
};

export const listBills = asyncHandler(async (req, res) => {
  const bills = await Bill.find(own(req, { active: true })).sort({ nextDueDate: 1 });
  return ok(res, await withTasks(bills));
});

export const createBill = asyncHandler(async (req, res) => {
  const bill = new Bill({ ...billFields(req.body || {}), userId: req.user._id });
  const task = await createBillTask(bill);
  await bill.save();
  return ok(res, { ...bill.toObject(), task }, "Bill added", 201);
});

export const updateBill = asyncHandler(async (req, res) => {
  const bill = await findOwn(Bill, req, "Bill");
  Object.assign(bill, billFields(req.body || {}, true));
  // Keep the open "Pay ..." task in step with the bill
  let task = bill.taskId ? await Tasks.findOne(own(req, { _id: bill.taskId })) : null;
  if (task && task.status !== "Done") {
    task.title = `Pay ${bill.name}`;
    task.dueDate = bill.nextDueDate;
    await task.save();
  } else if (!task || task.status === "Done") {
    task = await createBillTask(bill);
  }
  await bill.save();
  return ok(res, { ...bill.toObject(), task }, "Bill saved");
});

export const deleteBill = asyncHandler(async (req, res) => {
  const bill = await findOwn(Bill, req, "Bill");
  // Remove the open reminder task; past payments stay in the transactions
  if (bill.taskId) await Tasks.deleteOne(own(req, { _id: bill.taskId, status: { $ne: "Done" } }));
  await bill.deleteOne();
  return ok(res, { _id: bill._id, taskId: bill.taskId }, "Bill removed");
});

// Paying from the Finance page ticks the bill's task off (same as ticking it in the task list)
export const payBill = asyncHandler(async (req, res) => {
  const bill = await findOwn(Bill, req, "Bill");
  let task = bill.taskId ? await Tasks.findOne(own(req, { _id: bill.taskId })) : null;
  if (!task || task.status === "Done") {
    task = await createBillTask(bill);
    await bill.save();
  }
  await stopTimer(task);
  task.status = "Done";
  task.completedAt = new Date();
  await task.save();
  const next = await afterCompleted(task, req.body?.today);
  const fresh = await Bill.findById(bill._id);
  return ok(res, { bill: { ...fresh.toObject(), task: next }, task, next }, "Bill paid");
});

// ---------- clients ----------

const clientFields = (b, partial = false) => {
  const data = {};
  if (!partial || b.name !== undefined) {
    data.name = text(b.name, 80);
    if (!data.name) throw new ApiError(400, "Give the client a name");
  }
  if (b.email !== undefined) data.email = text(b.email, 120).toLowerCase();
  if (b.hourlyRate !== undefined) {
    data.hourlyRate = money(b.hourlyRate);
    if (data.hourlyRate < 0) throw new ApiError(400, "The rate cannot be negative");
  }
  if (b.color !== undefined && /^#[0-9a-fA-F]{6}$/.test(b.color)) data.color = b.color;
  return data;
};

export const listClients = asyncHandler(async (req, res) => {
  const clients = await Client.find(own(req, { archived: false })).sort({ name: 1 });
  return ok(res, clients);
});

export const createClient = asyncHandler(async (req, res) => {
  const client = await Client.create({ ...clientFields(req.body || {}), userId: req.user._id });
  return ok(res, client, "Client added", 201);
});

export const updateClient = asyncHandler(async (req, res) => {
  const client = await findOwn(Client, req, "Client");
  Object.assign(client, clientFields(req.body || {}, true));
  await client.save();
  return ok(res, client, "Client saved");
});

// Clients with history are archived (their invoices must still show their name); others are deleted
export const deleteClient = asyncHandler(async (req, res) => {
  const client = await findOwn(Client, req, "Client");
  await Tasks.updateMany(own(req, { clientId: client._id, status: { $ne: "Done" } }), { $set: { clientId: null } });
  const hasHistory =
    (await Invoice.exists(own(req, { clientId: client._id }))) || (await TimeEntry.exists(own(req, { clientId: client._id })));
  if (hasHistory) {
    client.archived = true;
    await client.save();
  } else {
    await client.deleteOne();
  }
  return ok(res, { _id: client._id }, "Client removed");
});

// ---------- billable time & invoices ----------

// Unbilled time per client: [{ clientId, hours, amount }]
const unbilledByClient = async (userId) => {
  const rows = await TimeEntry.aggregate([
    { $match: { userId, clientId: { $ne: null }, invoiceId: null } },
    { $group: { _id: "$clientId", hours: { $sum: "$hours" } } },
  ]);
  const clients = await Client.find({ userId, _id: { $in: rows.map((r) => r._id) } }).lean();
  const rate = new Map(clients.map((c) => [String(c._id), c.hourlyRate]));
  return rows
    .filter((r) => r.hours > 0.004)
    .map((r) => ({
      clientId: r._id,
      hours: Math.round(r.hours * 100) / 100,
      amount: money(r.hours * (rate.get(String(r._id)) || 0)),
    }));
};

export const getUnbilled = asyncHandler(async (req, res) => ok(res, await unbilledByClient(req.user._id)));

export const listInvoices = asyncHandler(async (req, res) => {
  const invoices = await Invoice.find(own(req)).sort({ issueDate: -1, createdAt: -1 }).limit(200);
  return ok(res, invoices);
});

const nextInvoiceNumber = async (userId, prefix) => {
  const year = new Date().getUTCFullYear();
  const count = await Invoice.countDocuments({ userId, number: new RegExp(`^${prefix}-${year}-`) });
  return (offset) => `${prefix}-${year}-${String(count + 1 + offset).padStart(3, "0")}`;
};

// New invoice from the client's unbilled time, one line per task
export const createInvoice = asyncHandler(async (req, res) => {
  const b = req.body || {};
  if (!mongoose.isValidObjectId(b.clientId)) throw new ApiError(400, "Choose a client");
  const client = await Client.findOne(own(req, { _id: b.clientId }));
  if (!client) throw new ApiError(404, "Client not found");

  const entries = await TimeEntry.find(own(req, { clientId: client._id, invoiceId: null }));
  const byTask = new Map();
  for (const e of entries) {
    const key = String(e.taskId || e.taskTitle);
    const row = byTask.get(key) || { description: e.taskTitle || "Work", hours: 0 };
    row.hours += e.hours;
    byTask.set(key, row);
  }
  const items = [...byTask.values()]
    .map((r) => ({ ...r, hours: Math.round(r.hours * 100) / 100 }))
    .filter((r) => r.hours > 0)
    .map((r) => ({ ...r, rate: client.hourlyRate, amount: money(r.hours * client.hourlyRate) }));
  if (!items.length) throw new ApiError(400, `No unbilled time for ${client.name} yet. Track time on their tasks with the focus timer.`);

  const settings = await getSettings(req.user._id);
  const dueDays = Math.min(Math.max(parseInt(b.dueDays, 10) || 14, 0), 120);
  // The browser sends its own date so the invoice shows the user's "today", not the server's
  const issueDate = new Date(isDay(b.today) ? b.today : new Date().toISOString().slice(0, 10));
  const numberFor = await nextInvoiceNumber(req.user._id, settings.invoicePrefix || "INV");

  let invoice;
  for (let attempt = 0; attempt < 5 && !invoice; attempt++) {
    try {
      invoice = await Invoice.create({
        userId: req.user._id,
        clientId: client._id,
        number: numberFor(attempt),
        issueDate,
        dueDate: new Date(issueDate.getTime() + dueDays * 86400000),
        currency: settings.currency,
        items,
        total: money(items.reduce((s, i) => s + i.amount, 0)),
        notes: settings.invoiceNote,
      });
    } catch (err) {
      if (err?.code !== 11000) throw err; // number taken: try the next one
    }
  }
  if (!invoice) throw new ApiError(500, "Could not number the invoice. Try again.");

  await TimeEntry.updateMany({ _id: { $in: entries.map((e) => e._id) } }, { $set: { invoiceId: invoice._id } });
  await logActivity(req.user._id, "invoice_created", `Created invoice ${invoice.number} for ${client.name}`, {
    invoiceId: invoice._id,
    total: invoice.total,
  });
  return ok(res, invoice, "Invoice created", 201);
});

// Edit lines / notes / dates, or move it through draft -> sent -> paid
export const updateInvoice = asyncHandler(async (req, res) => {
  const invoice = await findOwn(Invoice, req, "Invoice");
  const b = req.body || {};

  if (b.items !== undefined) {
    if (invoice.status === "paid") throw new ApiError(400, "A paid invoice cannot be changed");
    invoice.items = (Array.isArray(b.items) ? b.items : [])
      .map((i) => {
        const hours = Math.max(0, money(i?.hours));
        const rate = Math.max(0, money(i?.rate));
        const amount = hours > 0 ? money(hours * rate) : Math.max(0, money(i?.amount));
        return { description: text(i?.description, 200), hours, rate, amount };
      })
      .filter((i) => i.description && i.amount > 0)
      .slice(0, 50);
    if (!invoice.items.length) throw new ApiError(400, "An invoice needs at least one line");
    invoice.total = money(invoice.items.reduce((s, i) => s + i.amount, 0));
  }
  if (b.notes !== undefined) invoice.notes = text(b.notes, 500);
  if (b.dueDate !== undefined && isDay(b.dueDate)) invoice.dueDate = new Date(b.dueDate);

  if (b.status !== undefined && b.status !== invoice.status) {
    if (!["draft", "sent", "paid"].includes(b.status)) throw new ApiError(400, "Unknown status");
    const client = await Client.findById(invoice.clientId).lean();
    if (b.status === "paid") {
      invoice.paidAt = new Date();
      await Transaction.create({
        userId: req.user._id,
        type: "income",
        amount: invoice.total,
        category: "Freelance",
        note: `Invoice ${invoice.number}${client ? ` · ${client.name}` : ""}`,
        date: new Date(isDay(b.today) ? b.today : new Date().toISOString().slice(0, 10)),
        invoiceId: invoice._id,
        clientId: invoice.clientId,
      });
      await logActivity(req.user._id, "invoice_paid", `Invoice ${invoice.number} was paid`, { invoiceId: invoice._id });
    } else if (invoice.status === "paid") {
      invoice.paidAt = null;
      await Transaction.deleteMany(own(req, { invoiceId: invoice._id }));
    }
    invoice.status = b.status;
  }
  await invoice.save();
  return ok(res, invoice, "Invoice saved");
});

// Deleting an unpaid invoice puts its time back into "unbilled"
export const deleteInvoice = asyncHandler(async (req, res) => {
  const invoice = await findOwn(Invoice, req, "Invoice");
  if (invoice.status === "paid") throw new ApiError(400, "Mark it as unpaid first; a paid invoice is part of your income");
  await TimeEntry.updateMany(own(req, { invoiceId: invoice._id }), { $set: { invoiceId: null } });
  await invoice.deleteOne();
  return ok(res, { _id: invoice._id }, "Invoice deleted");
});

// ---------- overview ----------

const MONTHLY_FACTOR = { weekly: 52 / 12, monthly: 1, yearly: 1 / 12 };

export const getSummary = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const [from, to] = monthRange(req.query.month);
  const settings = await getSettings(userId);

  const monthTx = await Transaction.find({ userId, date: { $gte: from, $lt: to } }).lean();
  const sum = (list) => money(list.reduce((s, t) => s + t.amount, 0));
  const expenses = monthTx.filter((t) => t.type === "expense");
  const incomes = monthTx.filter((t) => t.type === "income");
  const group = (list) => {
    const m = new Map();
    for (const t of list) m.set(t.category, money((m.get(t.category) || 0) + t.amount));
    return [...m.entries()].map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount);
  };
  const expenseByCategory = group(expenses);
  const spentIn = new Map(expenseByCategory.map((x) => [x.category, x.amount]));

  // Last 6 months, oldest first
  const trendFrom = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() - 5, 1));
  const trendRows = await Transaction.aggregate([
    { $match: { userId, date: { $gte: trendFrom, $lt: to } } },
    { $group: { _id: { m: { $dateToString: { format: "%Y-%m", date: "$date" } }, type: "$type" }, total: { $sum: "$amount" } } },
  ]);
  const trend = Array.from({ length: 6 }, (_, i) => {
    const key = monthKey(new Date(Date.UTC(trendFrom.getUTCFullYear(), trendFrom.getUTCMonth() + i, 1)));
    const pick = (type) => money(trendRows.find((r) => r._id.m === key && r._id.type === type)?.total);
    return { month: key, income: pick("income"), expense: pick("expense") };
  });

  const bills = await Bill.find({ userId, active: true }).sort({ nextDueDate: 1 }).lean();
  const billsMonthly = money(bills.reduce((s, b) => s + b.amount * (MONTHLY_FACTOR[b.frequency] || 1), 0));

  // Freelance: billable time this month, unbilled time, invoices waiting for payment
  const clients = await Client.find({ userId }).lean();
  const clientById = new Map(clients.map((c) => [String(c._id), c]));
  const monthTime = await TimeEntry.aggregate([
    { $match: { userId, clientId: { $ne: null }, endedAt: { $gte: from, $lt: to } } },
    { $group: { _id: "$clientId", hours: { $sum: "$hours" } } },
  ]);
  const byClient = monthTime
    .map((r) => {
      const c = clientById.get(String(r._id));
      const hours = Math.round(r.hours * 100) / 100;
      return { clientId: r._id, name: c?.name || "Client", color: c?.color, hours, earned: money(hours * (c?.hourlyRate || 0)) };
    })
    .filter((r) => r.hours > 0)
    .sort((a, b) => b.earned - a.earned);
  const unbilled = await unbilledByClient(userId);
  const outstanding = await Invoice.find({ userId, status: "sent" }).lean();

  return ok(res, {
    month: monthKey(from),
    currency: settings.currency,
    income: sum(incomes),
    expense: sum(expenses),
    net: money(sum(incomes) - sum(expenses)),
    expenseByCategory,
    incomeByCategory: group(incomes),
    budgets: settings.budgets.map((b) => ({ category: b.category, limit: b.limit, spent: spentIn.get(b.category) || 0 })),
    trend,
    bills: { upcoming: bills.slice(0, 5), count: bills.length, monthlyTotal: billsMonthly },
    freelance: {
      byClient,
      hours: Math.round(byClient.reduce((s, c) => s + c.hours, 0) * 100) / 100,
      earned: money(byClient.reduce((s, c) => s + c.earned, 0)),
      unbilledAmount: money(unbilled.reduce((s, u) => s + u.amount, 0)),
      unbilledHours: Math.round(unbilled.reduce((s, u) => s + u.hours, 0) * 100) / 100,
      outstandingAmount: money(outstanding.reduce((s, i) => s + i.total, 0)),
      outstandingCount: outstanding.length,
    },
  });
});
