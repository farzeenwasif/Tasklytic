import express from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { requirePremium } from "../middlewares/premium.middleware.js";
import * as f from "../controllers/finance.controller.js";

// Money management is a Premium feature
const router = express.Router();
router.use(verifyJWT, requirePremium);

router.get("/settings", f.getFinanceSettings);
router.patch("/settings", f.updateFinanceSettings);
router.get("/summary", f.getSummary);

router.route("/transactions").get(f.listTransactions).post(f.createTransaction);
router.route("/transactions/:id").patch(f.updateTransaction).delete(f.deleteTransaction);

router.route("/bills").get(f.listBills).post(f.createBill);
router.post("/bills/:id/pay", f.payBill);
router.route("/bills/:id").patch(f.updateBill).delete(f.deleteBill);

router.route("/clients").get(f.listClients).post(f.createClient);
router.route("/clients/:id").patch(f.updateClient).delete(f.deleteClient);

router.get("/unbilled", f.getUnbilled);
router.route("/invoices").get(f.listInvoices).post(f.createInvoice);
router.route("/invoices/:id").patch(f.updateInvoice).delete(f.deleteInvoice);

export default router;
