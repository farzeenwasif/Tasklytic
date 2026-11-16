import mongoose from "mongoose";

const { ObjectId } = mongoose.Schema.Types;
const owner = { type: ObjectId, ref: "User", required: true, index: true };
const money = { type: Number, required: true, min: 0 };

export const EXPENSE_CATEGORIES = [
  "Food",
  "Groceries",
  "Transport",
  "Rent",
  "Bills & Utilities",
  "Subscriptions",
  "Shopping",
  "Health",
  "Education",
  "Entertainment",
  "Travel",
  "Family",
  "Other",
];
export const INCOME_CATEGORIES = ["Salary", "Freelance", "Business", "Investments", "Gifts", "Other"];
export const BILL_FREQUENCIES = ["weekly", "monthly", "yearly"];
export const CURRENCIES = ["USD", "PKR", "EUR", "GBP", "AED", "SAR", "INR", "CAD", "AUD"];

// One expense or income
const transactionSchema = new mongoose.Schema(
  {
    userId: owner,
    type: { type: String, enum: ["expense", "income"], required: true },
    amount: money,
    category: { type: String, required: true, trim: true, maxlength: 40 },
    note: { type: String, default: "", trim: true, maxlength: 200 },
    date: { type: Date, required: true },
    // Where it came from, when it was created automatically
    billId: { type: ObjectId, ref: "Bill", default: null },
    invoiceId: { type: ObjectId, ref: "Invoice", default: null },
    clientId: { type: ObjectId, ref: "Client", default: null },
  },
  { timestamps: true }
);
transactionSchema.index({ userId: 1, date: -1 });

// A recurring bill or subscription. Its current "Pay ..." task lives in the task list;
// ticking that task off records the payment and schedules the next one.
const billSchema = new mongoose.Schema(
  {
    userId: owner,
    name: { type: String, required: true, trim: true, maxlength: 80 },
    amount: money,
    category: { type: String, default: "Bills & Utilities", trim: true, maxlength: 40 },
    frequency: { type: String, enum: BILL_FREQUENCIES, default: "monthly" },
    nextDueDate: { type: Date, required: true },
    taskId: { type: ObjectId, ref: "Tasks", default: null },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Freelance client; time tracked on their tasks is billable at hourlyRate
const clientSchema = new mongoose.Schema(
  {
    userId: owner,
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, default: "", trim: true, lowercase: true, maxlength: 120 },
    hourlyRate: { type: Number, default: 0, min: 0 },
    color: { type: String, default: "#34d399", match: /^#[0-9a-fA-F]{6}$/ },
    archived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// One stretch of work on a task: a focus-timer session, or a manual correction (can be negative)
const timeEntrySchema = new mongoose.Schema(
  {
    userId: owner,
    taskId: { type: ObjectId, ref: "Tasks", default: null },
    taskTitle: { type: String, default: "" }, // kept for invoices if the task is deleted
    clientId: { type: ObjectId, ref: "Client", default: null, index: true },
    startedAt: { type: Date, required: true },
    endedAt: { type: Date, required: true },
    hours: { type: Number, required: true },
    source: { type: String, enum: ["timer", "manual"], default: "timer" },
    invoiceId: { type: ObjectId, ref: "Invoice", default: null },
  },
  { timestamps: true }
);
timeEntrySchema.index({ userId: 1, endedAt: -1 });

const invoiceItemSchema = new mongoose.Schema(
  {
    description: { type: String, required: true, trim: true, maxlength: 200 },
    hours: { type: Number, default: 0, min: 0 },
    rate: { type: Number, default: 0, min: 0 },
    amount: money,
  },
  { _id: false }
);

const invoiceSchema = new mongoose.Schema(
  {
    userId: owner,
    clientId: { type: ObjectId, ref: "Client", required: true },
    number: { type: String, required: true },
    issueDate: { type: Date, required: true },
    dueDate: { type: Date, required: true },
    currency: { type: String, default: "USD" },
    items: { type: [invoiceItemSchema], default: [] },
    total: { type: Number, default: 0, min: 0 },
    notes: { type: String, default: "", maxlength: 500 },
    status: { type: String, enum: ["draft", "sent", "paid"], default: "draft" },
    paidAt: { type: Date, default: null },
  },
  { timestamps: true }
);
invoiceSchema.index({ userId: 1, number: 1 }, { unique: true });

// Per-user money settings
const financeSettingsSchema = new mongoose.Schema(
  {
    userId: { type: ObjectId, ref: "User", required: true, unique: true },
    currency: { type: String, enum: CURRENCIES, default: "USD" },
    // Monthly limit per expense category
    budgets: [
      {
        _id: false,
        category: { type: String, required: true, maxlength: 40 },
        limit: { type: Number, required: true, min: 0 },
      },
    ],
    // Shown on invoices
    businessName: { type: String, default: "", trim: true, maxlength: 80 },
    invoicePrefix: { type: String, default: "INV", trim: true, maxlength: 10 },
    invoiceNote: { type: String, default: "", trim: true, maxlength: 300 },
  },
  { timestamps: true }
);

export const Transaction = mongoose.model("Transaction", transactionSchema);
export const Bill = mongoose.model("Bill", billSchema);
export const Client = mongoose.model("Client", clientSchema);
export const TimeEntry = mongoose.model("TimeEntry", timeEntrySchema);
export const Invoice = mongoose.model("Invoice", invoiceSchema);
export const FinanceSettings = mongoose.model("FinanceSettings", financeSettingsSchema);
