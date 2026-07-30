import {
  AlertTriangle,
  Archive,
  BadgeIndianRupee,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Download,
  FileText,
  IndianRupee,
  Package,
  Plus,
  Printer,
  QrCode,
  ReceiptText,
  RotateCcw,
  Search,
  Shield,
  ShoppingBag,
  UserPlus,
  Users,
  Wrench
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MetricCard } from "../components/MetricCard";
import { SectionHeader } from "../components/SectionHeader";
import { BarList } from "../components/SimpleCharts";
import { StatusBadge } from "../components/StatusBadge";
import { SelectField, TextAreaField, TextField } from "../components/FormControls";
import {
  auditLogs,
  bookings,
  categories,
  cleaningRecords,
  customers,
  expenses,
  inventoryItems,
  payments,
  refunds,
  repairRecords,
  settings
} from "../data/sampleData";
import type { Booking, Customer, DressStatus, InventoryItem, PaymentTransaction, StaffRole } from "../types";
import { findAvailabilityConflicts } from "../utils/availability";
import { bookingTotals, collectionSummary, formatCurrency } from "../utils/calculations";
import { can, roleLabel } from "../utils/permissions";

const today = "2026-07-23";

export function DashboardPage() {
  const collections = collectionSummary(payments);
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const monthRevenue = payments.filter((payment) => payment.verificationStatus === "Verified").reduce((sum, payment) => sum + payment.amount, 0);
  const statusCount = (status: DressStatus) => inventoryItems.filter((item) => item.currentStatus === status).length;
  const expectedReturns = bookings.filter((booking) => booking.expectedReturnDateTime.startsWith(today));
  const overdue = bookings.filter((booking) => booking.bookingStatus === "Overdue" || new Date(booking.expectedReturnDateTime) < new Date(`${today}T23:59:00`));

  const categoryRows = categories.map((category) => ({
    label: category.name,
    value: inventoryItems.filter((item) => item.category === category.name).length
  }));

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Operations"
        title="Dashboard"
        description="Inventory status, bookings, cash/UPI collections, deposits, maintenance alerts, and quick staff actions."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Inventory items" value={inventoryItems.length} helper="Physical records, not stock quantity" icon={Package} />
        <MetricCard title="Available dresses" value={statusCount("Available")} helper="Ready to reserve" icon={CheckCircle2} tone="forest" />
        <MetricCard title="Rented or reserved" value={statusCount("Rented") + statusCount("Reserved")} helper="Active commitments" icon={ShoppingBag} tone="purple" />
        <MetricCard title="Overdue rentals" value={overdue.length} helper="Needs follow-up" icon={AlertTriangle} tone="red" />
        <MetricCard title="Inspection pending" value={statusCount("Returned - Inspection Pending")} icon={ClipboardCheck} tone="gold" />
        <MetricCard title="Cleaning" value={statusCount("Cleaning")} icon={Wrench} tone="gold" />
        <MetricCard title="Repair" value={statusCount("Repair")} icon={Wrench} tone="red" />
        <MetricCard title="Today collected" value={formatCurrency(collections.total)} helper={`Cash ${formatCurrency(collections.cash)} / UPI ${formatCurrency(collections.upi)}`} icon={IndianRupee} tone="blue" />
        <MetricCard title="Pending balances" value={formatCurrency(bookings.reduce((sum, booking) => sum + bookingTotals(booking).balanceDue, 0))} icon={ReceiptText} tone="red" />
        <MetricCard title="Deposits held" value={formatCurrency(customers.reduce((sum, customer) => sum + customer.securityDepositHeld, 0))} icon={Shield} />
        <MetricCard title="Monthly revenue" value={formatCurrency(monthRevenue)} icon={BadgeIndianRupee} tone="forest" />
        <MetricCard title="Estimated profit" value={formatCurrency(monthRevenue - totalExpenses)} helper={`Expenses ${formatCurrency(totalExpenses)}`} icon={FileText} tone="gold" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
        <section className="rounded-lg border border-forest/10 bg-white p-5 shadow-soft">
          <h2 className="text-xl font-bold text-forest">Revenue trend</h2>
          <div className="mt-5">
            <BarList
              valueKind="currency"
              rows={[
                { label: "Week 1", value: 3200 },
                { label: "Week 2", value: 5400 },
                { label: "Week 3", value: 7200 },
                { label: "Week 4", value: monthRevenue }
              ]}
            />
          </div>
        </section>
        <section className="rounded-lg border border-forest/10 bg-white p-5 shadow-soft">
          <h2 className="text-xl font-bold text-forest">Category-wise rentals</h2>
          <div className="mt-5">
            <BarList rows={categoryRows} />
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Panel title="Quick actions">
          <div className="grid gap-3">
            {[
              ["/inventory", "Add Dress", Plus],
              ["/customers", "Add Customer", UserPlus],
              ["/bookings", "New Booking", CalendarClock],
              ["/payments", "Record Payment", IndianRupee],
              ["/pickup", "Issue Dress", ShoppingBag],
              ["/returns", "Process Return", RotateCcw],
              ["/expenses", "Add Expense", FileText],
              ["/reports", "View Overdue Rentals", AlertTriangle]
            ].map(([to, label, Icon]) => (
              <Link key={String(label)} to={String(to)} className="flex items-center gap-3 rounded-md border border-forest/10 px-3 py-2 font-semibold text-forest hover:bg-forest/5">
                <Icon className="h-4 w-4" /> {String(label)}
              </Link>
            ))}
          </div>
        </Panel>
        <Panel title="Upcoming returns">
          <ListRows rows={expectedReturns.map((booking) => [booking.bookingNumber, booking.customerName, booking.expectedReturnDateTime])} />
        </Panel>
        <Panel title="Recent activities">
          <ListRows rows={auditLogs.map((log) => [log.action, log.recordId, log.timestamp])} />
        </Panel>
      </div>
    </div>
  );
}

export function InventoryPage() {
  const [items, setItems] = useState(inventoryItems);
  const [search, setSearch] = useState("");
  const [name, setName] = useState("New Stage Costume");
  const [category, setCategory] = useState(categories[0].name);
  const [size, setSize] = useState("M");
  const [price, setPrice] = useState("500");
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  const filtered = items.filter((item) =>
    [item.name, item.dressId, item.category, item.currentStatus, item.storageLocation]
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  function addItem(event: FormEvent) {
    event.preventDefault();
    if (Number(price) <= 0) return;
    const code = categories.find((entry) => entry.name === category)?.code || "GEN";
    const next: InventoryItem = {
      ...items[0],
      id: `inv-local-${Date.now()}`,
      dressId: `TRC-${code}-${String(items.length + 1).padStart(3, "0")}`,
      name,
      category,
      size,
      rentalPrice: Number(price),
      images: imageUrls.length ? imageUrls : items[0].images,
      featuredImage: imageUrls[0] || items[0].featuredImage,
      currentStatus: "Available",
      publicVisible: true,
      featured: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setItems([next, ...items]);
    setImageUrls([]);
  }

  function selectImages(files: FileList | null) {
    if (!files) return;
    imageUrls.forEach((url) => URL.revokeObjectURL(url));
    setImageUrls(Array.from(files).map((file) => URL.createObjectURL(file)));
  }

  function duplicate(item: InventoryItem) {
    const next = {
      ...item,
      id: `inv-copy-${Date.now()}`,
      dressId: `${item.dressId}-COPY`,
      currentStatus: "Available" as DressStatus,
      createdAt: new Date().toISOString()
    };
    setItems([next, ...items]);
  }

  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="Dress inventory" title="Physical inventory records" description="Every physical item has a unique ID, QR label, status, condition, images, cleaning instructions, and rental history protection." />
      <div className="grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
        <form onSubmit={addItem} className="rounded-lg border border-forest/10 bg-white p-5 shadow-soft">
          <h2 className="text-xl font-bold text-forest">Add dress</h2>
          <div className="mt-4 grid gap-4">
            <TextField label="Dress name" value={name} onChange={setName} required />
            <SelectField label="Category" value={category} onChange={setCategory} options={categories.map((entry) => entry.name)} />
            <TextField label="Size" value={size} onChange={setSize} required />
            <TextField label="Rental price" value={price} onChange={setPrice} type="number" required />
            <label className="grid gap-1.5 text-sm font-semibold text-charcoal">
              Dress photographs
              <input
                className="rounded-md border border-forest/15 bg-white px-3 py-2 text-charcoal file:mr-3 file:rounded-md file:border-0 file:bg-forest file:px-3 file:py-2 file:font-bold file:text-cream"
                type="file"
                accept="image/*"
                multiple
                onChange={(event) => selectImages(event.target.files)}
              />
            </label>
            {imageUrls.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-charcoal/45">
                  First image becomes featured
                </p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {imageUrls.map((url, index) => (
                    <img
                      key={url}
                      src={url}
                      alt={`Selected dress upload ${index + 1}`}
                      className={`aspect-square rounded-md object-cover ${index === 0 ? "ring-2 ring-gold" : ""}`}
                    />
                  ))}
                </div>
              </div>
            )}
            <button className="inline-flex items-center justify-center gap-2 rounded-md bg-forest px-4 py-2 font-bold text-cream hover:bg-leaf">
              <Plus className="h-4 w-4" /> Add sample item
            </button>
          </div>
        </form>
        <Panel title="Inventory search">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-charcoal/40" />
            <input className="w-full rounded-md border border-forest/15 py-2 pl-9 pr-3 outline-none focus:border-forest focus:ring-4 focus:ring-forest/10" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, ID, status, location" />
          </label>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="text-charcoal/55">
                <tr>
                  <th className="py-2">Dress</th>
                  <th>ID</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Price</th>
                  <th>QR/Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-forest/10">
                {filtered.map((item) => (
                  <tr key={item.id}>
                    <td className="py-3 font-semibold text-charcoal">{item.name}</td>
                    <td>{item.dressId}</td>
                    <td>{item.category}</td>
                    <td><StatusBadge status={item.currentStatus} /></td>
                    <td>{formatCurrency(item.rentalPrice)}</td>
                    <td>
                      <div className="flex gap-2">
                        <button className="rounded-md border border-forest/10 p-2 text-forest" title="Print QR label"><QrCode className="h-4 w-4" /></button>
                        <button className="rounded-md border border-forest/10 p-2 text-forest" title="Duplicate record" onClick={() => duplicate(item)}><Copy className="h-4 w-4" /></button>
                        <button className="rounded-md border border-forest/10 p-2 text-forest" title="Archive instead of delete"><Archive className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
}

export function CustomersPage() {
  const [rows, setRows] = useState(customers);
  const [name, setName] = useState("New Customer");
  const [mobile, setMobile] = useState("+91 ");
  const [town, setTown] = useState("Aizawl");

  function addCustomer(event: FormEvent) {
    event.preventDefault();
    if (!/^\+?\d[\d\s-]{8,}$/.test(mobile)) return;
    const next: Customer = {
      ...customers[0],
      id: `cust-local-${Date.now()}`,
      customerId: `TRC-CUS-${String(rows.length + 1).padStart(3, "0")}`,
      fullName: name,
      mobile,
      town,
      outstandingBalance: 0,
      securityDepositHeld: 0,
      status: "Active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setRows([next, ...rows]);
  }

  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="Customers" title="Customer management" description="Profiles include contact details, identification, active rentals, balances, deposit held, restrictions, and sensitive-ID visibility controls." />
      <div className="grid gap-6 xl:grid-cols-[0.7fr_1.3fr]">
        <form onSubmit={addCustomer} className="rounded-lg border border-forest/10 bg-white p-5 shadow-soft">
          <h2 className="text-xl font-bold text-forest">Add customer</h2>
          <div className="mt-4 grid gap-4">
            <TextField label="Full name" value={name} onChange={setName} required />
            <TextField label="Mobile number" value={mobile} onChange={setMobile} required />
            <TextField label="Town/locality" value={town} onChange={setTown} required />
            <button className="rounded-md bg-forest px-4 py-2 font-bold text-cream hover:bg-leaf">Create customer</button>
          </div>
        </form>
        <ResponsiveTable
          headers={["Customer", "Mobile", "Town", "Balance", "Deposit", "Status"]}
          rows={rows.map((customer) => [
            `${customer.customerId} - ${customer.fullName}`,
            customer.mobile,
            customer.town,
            formatCurrency(customer.outstandingBalance),
            formatCurrency(customer.securityDepositHeld),
            <StatusBadge key={customer.id} status={customer.status} />
          ])}
        />
      </div>
    </div>
  );
}

export function BookingsPage() {
  const [selectedItemId, setSelectedItemId] = useState(inventoryItems[1].id);
  const [pickup, setPickup] = useState("2026-07-23T18:00");
  const [returnAt, setReturnAt] = useState("2026-07-25T18:00");
  const item = inventoryItems.find((entry) => entry.id === selectedItemId)!;
  const conflicts = findAvailabilityConflicts(selectedItemId, pickup, returnAt, bookings, settings.preparationBufferHours);

  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="Bookings" title="Reservations and double-booking prevention" description="Bookings may contain multiple dresses and stay Pending Approval until authorised staff confirms them with a transaction-safe availability check." />
      <div className="grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
        <Panel title="New booking conflict check">
          <div className="grid gap-4">
            <SelectField label="Physical item" value={selectedItemId} onChange={setSelectedItemId} options={inventoryItems.map((entry) => entry.id)} />
            <TextField label="Pickup" value={pickup} onChange={setPickup} type="datetime-local" />
            <TextField label="Expected return" value={returnAt} onChange={setReturnAt} type="datetime-local" />
            <div className={`rounded-md p-4 ${conflicts.length ? "bg-red-50 text-red-900" : "bg-emerald-50 text-emerald-900"}`}>
              <h3 className="font-bold">{conflicts.length ? "Conflict warning" : "Available to approve"}</h3>
              <p className="mt-1 text-sm">
                {conflicts.length
                  ? `${item.dressId} overlaps ${conflicts.map((booking) => booking.bookingNumber).join(", ")}. Suggest a similar available dress before confirming.`
                  : `${item.dressId} has no blocking overlap for this rental period.`}
              </p>
            </div>
          </div>
        </Panel>
        <ResponsiveTable
          headers={["Booking", "Customer", "Items", "Pickup", "Return", "Payment", "Status"]}
          rows={bookings.map((booking) => [
            booking.bookingNumber,
            booking.customerName,
            booking.items.map((entry) => entry.dressId).join(", "),
            booking.pickupDateTime,
            booking.expectedReturnDateTime,
            <StatusBadge key={`${booking.id}-pay`} status={booking.paymentStatus} />,
            <StatusBadge key={booking.id} status={booking.bookingStatus} />
          ])}
        />
      </div>
    </div>
  );
}

export function PickupPage() {
  const booking = bookings[0];
  const paymentComplete = bookingTotals(booking).balanceDue === 0;

  return (
    <WorkflowPage
      eyebrow="Pickup"
      title="Guided dress issue"
      description="Mobile-ready pickup steps verify booking, payment, QR-scanned dress IDs, accessories, issue condition photos, deposit, acknowledgement, agreement, and receipt."
      steps={[
        ["Search booking", `${booking.bookingNumber} - ${booking.customerName}`],
        ["Verify customer", `${booking.customerPhone}; ID details visible to authorised staff only`],
        ["Confirm payment", paymentComplete ? "Payment complete" : "Manager override required if issuing before full payment"],
        ["Scan dress QR", booking.items.map((item) => item.dressId).join(", ")],
        ["Record condition", "Issue notes and photos required before Mark as Issued"],
        ["Generate documents", "Rental agreement, dress issue slip, and receipt ready for print/PDF/WhatsApp"]
      ]}
      actionLabel="Mark booking as Issued"
    />
  );
}

export function ReturnsPage() {
  const booking = bookings[1];
  const totals = bookingTotals(booking);

  return (
    <WorkflowPage
      eyebrow="Returns"
      title="Return and inspection"
      description="Inspection does not immediately make items Available. Staff compare conditions, record stains/damage/missing accessories, calculate charges, and route items to Available, Cleaning, Repair, Damaged, Lost, or Retired."
      steps={[
        ["Search or scan", booking.bookingNumber],
        ["Mark returned items", booking.items.map((item) => `${item.dressId}: ${item.returned ? "Returned" : "Pending"}`).join(", ")],
        ["Condition comparison", booking.items.map((item) => `${item.issueCondition} -> ${item.returnCondition}`).join("; ")],
        ["Charges", `Late ${formatCurrency(booking.lateFees)}, cleaning ${formatCurrency(booking.cleaningCharges)}, damage ${formatCurrency(booking.damageCharges)}`],
        ["Deposit settlement", `Refundable ${formatCurrency(totals.refundableDeposit)}; final settlement ${formatCurrency(totals.finalSettlement)}`],
        ["Next status", "Junior Doctor Coat moves to Cleaning until inspection passes"]
      ]}
      actionLabel="Complete inspection"
    />
  );
}

export function PaymentsPage() {
  const [method, setMethod] = useState("UPI");
  const [amount, setAmount] = useState("700");
  const [upi, setUpi] = useState("UPI6207230900");
  const duplicate = payments.some((payment) => payment.upiReference === upi);

  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="Payments" title="Separate transaction records" description="Cash, UPI, bank transfer, mixed payments, refunds, deposit adjustments, verification status, receipt numbers, and duplicate UPI prevention are tracked per transaction." />
      <div className="grid gap-6 xl:grid-cols-[0.7fr_1.3fr]">
        <Panel title="Record payment">
          <div className="grid gap-4">
            <SelectField label="Payment method" value={method} onChange={setMethod} options={["Cash", "UPI", "Bank Transfer", "Mixed Payment", "Refund", "Deposit Adjustment"]} />
            <TextField label="Amount" value={amount} onChange={setAmount} type="number" />
            {method === "UPI" && (
              <>
                <div className="grid place-items-center rounded-lg border border-dashed border-forest/25 bg-cream p-8 text-center">
                  <QrCode className="h-16 w-16 text-forest" />
                  <p className="mt-3 font-bold text-forest">{settings.upiId}</p>
                  <p className="text-sm text-charcoal/60">Upload screenshot and verify manually.</p>
                </div>
                <TextField label="UPI reference number" value={upi} onChange={setUpi} />
                {duplicate && <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-800">Duplicate UPI reference number detected.</p>}
              </>
            )}
            <button disabled={duplicate || Number(amount) <= 0} className="rounded-md bg-forest px-4 py-2 font-bold text-cream disabled:cursor-not-allowed disabled:bg-stone-300">
              Save pending verification
            </button>
          </div>
        </Panel>
        <ResponsiveTable
          headers={["Receipt", "Booking", "Customer", "Type", "Method", "Amount", "Verification"]}
          rows={payments.map((payment) => [
            payment.receiptNumber,
            payment.bookingNumber,
            payment.customerName,
            payment.transactionType,
            payment.paymentMethod,
            formatCurrency(payment.amount),
            <StatusBadge key={payment.id} status={payment.verificationStatus} />
          ])}
        />
      </div>
    </div>
  );
}

export function DepositsPage() {
  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="Security deposits" title="Held, deducted, refundable, and refunded" description="Deposits are separate from rental income. Large deductions require manager approval above the configured limit." />
      <ResponsiveTable
        headers={["Booking", "Customer", "Deposit", "Deductions", "Refundable", "Status"]}
        rows={bookings.map((booking) => {
          const totals = bookingTotals(booking);
          const deductions = booking.cleaningCharges + booking.damageCharges + booking.missingItemCharges + booking.lateFees;
          return [
            booking.bookingNumber,
            booking.customerName,
            formatCurrency(totals.deposit),
            formatCurrency(deductions),
            formatCurrency(totals.refundableDeposit),
            <StatusBadge key={booking.id} status={booking.depositStatus} />
          ];
        })}
      />
      <Panel title="Refund queue">
        <ListRows rows={refunds.map((refund) => [refund.bookingNumber, refund.customerName, `${formatCurrency(refund.amount)} ${refund.status}`])} />
      </Panel>
    </div>
  );
}

export function MaintenancePage() {
  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="Maintenance" title="Cleaning and repair workflow" description="Maintenance records connect dress IDs, responsible bookings, providers, costs, dates, photos, notes, and status decisions." />
      <div className="grid gap-6 xl:grid-cols-2">
        <ResponsiveTable
          title="Cleaning records"
          headers={["Dress", "Booking", "Provider", "Cost", "Due", "Status"]}
          rows={cleaningRecords.map((record) => [record.dressId, record.bookingNumber || "-", record.provider, formatCurrency(record.cost), record.expectedCompletionDate, <StatusBadge key={record.id} status={record.status} />])}
        />
        <ResponsiveTable
          title="Repair records"
          headers={["Dress", "Damage", "Provider", "Estimate", "Due", "Status"]}
          rows={repairRecords.map((record) => [record.dressId, record.damageType, record.provider, formatCurrency(record.estimatedCost), record.expectedCompletionDate, <StatusBadge key={record.id} status={record.status} />])}
        />
      </div>
    </div>
  );
}

export function ExpensesPage() {
  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="Expenses" title="Shop expense tracking" description="Dress purchases, cleaning, repair, packaging, transport, rent, staff payments, marketing, software, and miscellaneous costs." />
      <ResponsiveTable
        headers={["Expense", "Date", "Category", "Payee", "Method", "Amount", "Approved by"]}
        rows={expenses.map((expense) => [expense.expenseId, expense.date, expense.category, expense.supplierOrPayee, expense.paymentMethod, formatCurrency(expense.amount), expense.approvedBy || "Pending"])}
      />
    </div>
  );
}

export function ReportsPage() {
  const [method, setMethod] = useState("All");
  const rows = payments.filter((payment) => method === "All" || payment.paymentMethod === method);
  const csv = ["Receipt,Booking,Customer,Method,Amount,Status", ...rows.map((payment) => `${payment.receiptNumber},${payment.bookingNumber},${payment.customerName},${payment.paymentMethod},${payment.amount},${payment.verificationStatus}`)].join("\n");

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Reports"
        title="Filterable and printable reports"
        description="Daily collection, UPI/cash reports, bookings, active rentals, overdue, expected returns, pending balances, deposits, refunds, discounts, expenses, revenue, profit, dress-wise and staff-wise reports."
        action={
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-md border border-forest/20 px-4 py-2 font-bold text-forest"><Printer className="h-4 w-4" /> Print</button>
            <a href={`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`} download="trc-payment-report.csv" className="inline-flex items-center gap-2 rounded-md bg-forest px-4 py-2 font-bold text-cream"><Download className="h-4 w-4" /> CSV</a>
          </div>
        }
      />
      <Panel title="Report filters">
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField label="From" value="2026-07-01" onChange={() => undefined} type="date" />
          <TextField label="To" value="2026-07-31" onChange={() => undefined} type="date" />
          <SelectField label="Payment method" value={method} onChange={setMethod} options={["All", "Cash", "UPI", "Bank Transfer"]} />
        </div>
      </Panel>
      <ResponsiveTable
        title={`${settings.shopName} - Payment report`}
        headers={["Receipt", "Booking", "Customer", "Date", "Method", "Amount", "Status"]}
        rows={rows.map((payment) => [payment.receiptNumber, payment.bookingNumber, payment.customerName, payment.transactionDateTime, payment.paymentMethod, formatCurrency(payment.amount), payment.verificationStatus])}
      />
    </div>
  );
}

export function StaffRolesPage() {
  const roles: StaffRole[] = ["owner", "manager", "counter", "inventory", "accountant", "customer"];
  const checks = ["inventory:write", "customers:write", "bookings:write", "payments:write", "payments:verify", "refunds:approve", "reports:view", "expenses:write", "staff:manage", "settings:manage", "audit:view", "sensitive-id:view"] as const;

  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="Roles" title="Staff permissions" description="Privileged roles should be assigned through Firebase custom claims or secure server-side role management. Clients cannot elevate their own access." />
      <div className="overflow-x-auto rounded-lg border border-forest/10 bg-white shadow-soft">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-cream text-charcoal/60">
            <tr>
              <th className="p-3">Role</th>
              {checks.map((check) => <th key={check} className="p-3">{check}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-forest/10">
            {roles.map((role) => (
              <tr key={role}>
                <td className="p-3 font-bold text-forest">{roleLabel(role)}</td>
                {checks.map((check) => <td key={check} className="p-3">{can(role, check) ? "Yes" : "No"}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function SettingsPage() {
  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="Settings" title="Configurable shop rules" description="Shop identity, UPI, receipt prefixes, booking prefixes, inventory prefixes, default duration, buffer, fees, approval limits, opening hours, terms, templates, and backup preferences." />
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Shop details">
          <ListRows rows={[
            ["Shop name", settings.shopName, settings.email],
            ["Address", settings.address, settings.openingHours],
            ["UPI", settings.upiId, settings.whatsappNumber],
            ["Defaults", `${settings.defaultRentalDuration} days`, `${settings.preparationBufferHours}h prep buffer`],
            ["Refund approval limit", formatCurrency(settings.refundApprovalLimit), "Manager approval required above this amount"]
          ]} />
        </Panel>
        <Panel title="Notification templates">
          <ListRows rows={Object.entries(settings.notificationTemplates).map(([event, body]) => [event, body, "In-app / WhatsApp / SMS / Email ready"])} />
        </Panel>
      </div>
    </div>
  );
}

export function AuditLogsPage() {
  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="Audit logs" title="Protected activity trail" description="Important changes are recorded with user, role, action, module, record, previous/new values, timestamp, and session details. Ordinary staff cannot edit audit logs." />
      <ResponsiveTable
        headers={["Time", "User", "Role", "Action", "Module", "Record", "Previous", "New"]}
        rows={auditLogs.map((log) => [log.timestamp, log.user, roleLabel(log.role), log.action, log.module, log.recordId, log.previousValue || "-", log.newValue || "-"])}
      />
    </div>
  );
}

function WorkflowPage({
  eyebrow,
  title,
  description,
  steps,
  actionLabel
}: {
  eyebrow: string;
  title: string;
  description: string;
  steps: [string, string][];
  actionLabel: string;
}) {
  return (
    <div className="space-y-6">
      <SectionHeader eyebrow={eyebrow} title={title} description={description} />
      <div className="grid gap-4 lg:grid-cols-2">
        {steps.map(([label, detail], index) => (
          <article key={label} className="rounded-lg border border-forest/10 bg-white p-5 shadow-soft">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-forest text-sm font-bold text-cream">{index + 1}</span>
              <h2 className="text-lg font-bold text-forest">{label}</h2>
            </div>
            <p className="mt-3 text-charcoal/70">{detail}</p>
          </article>
        ))}
      </div>
      <div className="rounded-lg border border-forest/10 bg-white p-5 shadow-soft">
        <TextAreaField label="Condition notes / manager override reason" value="" onChange={() => undefined} placeholder="Record condition notes, photo references, payment override reason, or inspection summary." />
        <button className="mt-4 rounded-md bg-forest px-5 py-3 font-bold text-cream hover:bg-leaf">{actionLabel}</button>
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-forest/10 bg-white p-5 shadow-soft print-card">
      <h2 className="text-xl font-bold text-forest">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function ListRows({ rows }: { rows: (string | number)[][] }) {
  return (
    <div className="grid gap-3">
      {rows.length === 0 ? (
        <p className="rounded-md bg-cream p-3 text-sm font-semibold text-charcoal/60">No records match this view.</p>
      ) : (
        rows.map((row, index) => (
          <div key={`${row[0]}-${index}`} className="rounded-md border border-forest/10 p-3">
            <p className="font-semibold text-charcoal">{row[0]}</p>
            <p className="mt-1 text-sm text-charcoal/65">{row.slice(1).join(" - ")}</p>
          </div>
        ))
      )}
    </div>
  );
}

function ResponsiveTable({
  title,
  headers,
  rows
}: {
  title?: string;
  headers: string[];
  rows: (React.ReactNode[])[];
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-forest/10 bg-white shadow-soft print-card">
      {title && <h2 className="border-b border-forest/10 p-4 text-xl font-bold text-forest">{title}</h2>}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-cream text-charcoal/60">
            <tr>
              {headers.map((header) => (
                <th key={header} className="px-4 py-3 font-bold">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-forest/10">
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="align-top">
                {row.map((cell, cellIndex) => (
                  <td key={`${rowIndex}-${cellIndex}`} className="px-4 py-3 text-charcoal/75">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
