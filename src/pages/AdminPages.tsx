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
  Pencil,
  Plus,
  Printer,
  QrCode,
  ReceiptText,
  RotateCcw,
  Search,
  Shield,
  ShoppingBag,
  Trash2,
  UserPlus,
  Users,
  Wrench
} from "lucide-react";
import QRCode from "qrcode";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MetricCard } from "../components/MetricCard";
import { SectionHeader } from "../components/SectionHeader";
import { BarList } from "../components/SimpleCharts";
import { StatusBadge } from "../components/StatusBadge";
import { SelectField, TextAreaField, TextField } from "../components/FormControls";
import { firebaseConfigured } from "../services/firebase";
import {
  addAuditLogRecord,
  addCleaningRecord,
  addExpenseRecord,
  addPaymentTransaction,
  addRefundRecord,
  addRepairRecord,
  listInventoryItems,
  listCustomers,
  saveInventoryItem,
  saveCustomer,
  saveShopSettings,
  updateBookingDepositSettlement,
  updateBookingPaymentSummary,
  updateBookingReturnInspection,
  updateCleaningRecordStatus,
  updateExpenseApproval,
  updateInventoryStatus,
  updatePaymentVerificationStatus,
  updateRefundStatus,
  updateRepairRecordStatus,
  uploadInventoryMedia
} from "../services/repositories";
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
import type {
  AuditLog,
  Booking,
  BookingStatus,
  CleaningRecord,
  Customer,
  DepositStatus,
  DressStatus,
  Expense,
  InventoryItem,
  PaymentMethod,
  PaymentStatus,
  PaymentTransaction,
  PaymentTransactionType,
  Refund,
  RepairRecord,
  ShopSettings,
  StaffRole
} from "../types";
import { findAvailabilityConflicts } from "../utils/availability";
import { bookingTotals, collectionSummary, formatCurrency } from "../utils/calculations";
import { fallbackDressImage, normalizeMediaUrl } from "../utils/media";
import { can, roleLabel } from "../utils/permissions";

const today = "2026-07-23";

const dressStatuses: DressStatus[] = [
  "Available",
  "Pending Reservation",
  "Reserved",
  "Ready for Pickup",
  "Rented",
  "Overdue",
  "Returned - Inspection Pending",
  "Cleaning",
  "Repair",
  "Damaged",
  "Lost",
  "Retired"
];

const paymentMethods: PaymentMethod[] = ["Cash", "UPI", "Bank Transfer", "Mixed Payment", "Refund", "Deposit Adjustment"];
const staffRoles: StaffRole[] = ["owner", "manager", "counter", "inventory", "accountant", "customer"];
const cleaningStatuses: CleaningRecord["status"][] = ["Waiting", "In Progress", "Completed", "Failed Inspection"];
const repairStatuses: RepairRecord["status"][] = ["Awaiting Assessment", "Approved", "In Repair", "Completed", "Not Repairable", "Retired"];
const expenseCategories = ["Dress Purchase", "Cleaning", "Repair", "Packaging", "Transport", "Rent", "Staff Payment", "Marketing", "Software", "Miscellaneous"];

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function useSyncedInventoryItems() {
  const [rows, setRows] = useState(inventoryItems);

  useEffect(() => {
    let active = true;
    listInventoryItems(inventoryItems)
      .then((items) => {
        if (active && items.length) setRows(items);
      })
      .catch((error: unknown) => {
        console.warn("Inventory sync failed", error);
      });
    return () => {
      active = false;
    };
  }, []);

  return rows;
}

function useSyncedCustomers() {
  const [rows, setRows] = useState(customers);

  useEffect(() => {
    let active = true;
    listCustomers(customers)
      .then((customerRows) => {
        if (active && customerRows.length) setRows(customerRows);
      })
      .catch((error: unknown) => {
        console.warn("Customer sync failed", error);
      });
    return () => {
      active = false;
    };
  }, []);

  return [rows, setRows] as const;
}

export function DashboardPage() {
  const syncedItems = useSyncedInventoryItems();
  const [syncedCustomers] = useSyncedCustomers();
  const collections = collectionSummary(payments);
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const monthRevenue = payments.filter((payment) => payment.verificationStatus === "Verified").reduce((sum, payment) => sum + payment.amount, 0);
  const statusCount = (status: DressStatus) => syncedItems.filter((item) => item.currentStatus === status).length;
  const expectedReturns = bookings.filter((booking) => booking.expectedReturnDateTime.startsWith(today));
  const overdue = bookings.filter((booking) => booking.bookingStatus === "Overdue" || new Date(booking.expectedReturnDateTime) < new Date(`${today}T23:59:00`));

  const categoryRows = categories.map((category) => ({
    label: category.name,
    value: syncedItems.filter((item) => item.category === category.name).length
  }));

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Operations"
        title="Dashboard"
        description="Inventory status, bookings, cash/UPI collections, deposits, maintenance alerts, and quick staff actions."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Inventory items" value={syncedItems.length} helper="Physical records, not stock quantity" icon={Package} />
        <MetricCard title="Available dresses" value={statusCount("Available")} helper="Ready to reserve" icon={CheckCircle2} tone="forest" />
        <MetricCard title="Rented or reserved" value={statusCount("Rented") + statusCount("Reserved")} helper="Active commitments" icon={ShoppingBag} tone="purple" />
        <MetricCard title="Overdue rentals" value={overdue.length} helper="Needs follow-up" icon={AlertTriangle} tone="red" />
        <MetricCard title="Inspection pending" value={statusCount("Returned - Inspection Pending")} icon={ClipboardCheck} tone="gold" />
        <MetricCard title="Cleaning" value={statusCount("Cleaning")} icon={Wrench} tone="gold" />
        <MetricCard title="Repair" value={statusCount("Repair")} icon={Wrench} tone="red" />
        <MetricCard title="Today collected" value={formatCurrency(collections.total)} helper={`Cash ${formatCurrency(collections.cash)} / UPI ${formatCurrency(collections.upi)}`} icon={IndianRupee} tone="blue" />
        <MetricCard title="Pending balances" value={formatCurrency(bookings.reduce((sum, booking) => sum + bookingTotals(booking).balanceDue, 0))} icon={ReceiptText} tone="red" />
        <MetricCard title="Deposits held" value={formatCurrency(syncedCustomers.reduce((sum, customer) => sum + customer.securityDepositHeld, 0))} icon={Shield} />
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
  const [search, setSearch] = useState(() => new URLSearchParams(window.location.search).get("dressId") || "");
  const [name, setName] = useState("New Stage Costume");
  const [category, setCategory] = useState(categories[0].name);
  const [size, setSize] = useState("M");
  const [location, setLocation] = useState("Rack A-01");
  const [ageGroup, setAgeGroup] = useState("Kids");
  const [gender, setGender] = useState("Female");
  const [currentStatus, setCurrentStatus] = useState<DressStatus>("Available");
  const [shoulder, setShoulder] = useState("");
  const [bust, setBust] = useState("");
  const [waist, setWaist] = useState("");
  const [hip, setHip] = useState("");
  const [length, setLength] = useState("");
  const [remarks, setRemarks] = useState("");
  const [price, setPrice] = useState("500");
  const [securityDeposit, setSecurityDeposit] = useState("500");
  const [itemCount, setItemCount] = useState("1");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [imageCropMode, setImageCropMode] = useState("Crop 4:5");
  const [imageResizeSize, setImageResizeSize] = useState("900");
  const [processingImages, setProcessingImages] = useState(false);
  const [shortVideoFile, setShortVideoFile] = useState<File | null>(null);
  const [shortVideoPreview, setShortVideoPreview] = useState("");
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [existingShortVideo, setExistingShortVideo] = useState("");
  const [imageUrl1, setImageUrl1] = useState("");
  const [imageUrl2, setImageUrl2] = useState("");
  const [imageUrl3, setImageUrl3] = useState("");
  const [shortVideoUrlInput, setShortVideoUrlInput] = useState("");
  const [inventoryMessage, setInventoryMessage] = useState("");
  const [inventoryError, setInventoryError] = useState("");
  const [savingInventory, setSavingInventory] = useState(false);
  const [pendingCsvItems, setPendingCsvItems] = useState<InventoryItem[]>([]);
  const [savingCsvItems, setSavingCsvItems] = useState(false);
  const [csvMessage, setCsvMessage] = useState("");
  const [csvError, setCsvError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [qrItem, setQrItem] = useState<InventoryItem | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState("");

  const filtered = items.filter((item) =>
    [item.name, item.dressId, item.category, item.currentStatus, item.storageLocation]
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  useEffect(() => {
    let active = true;
    listInventoryItems(inventoryItems)
      .then((rows) => {
        if (active && rows.length) setItems(rows);
      })
      .catch((error: unknown) => {
        console.warn("Inventory sync failed", error);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!qrItem) {
      setQrDataUrl("");
      return;
    }

    QRCode.toDataURL(getInventoryItemLink(qrItem), {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 320
    })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(""));
  }, [qrItem]);

  async function addItem(event: FormEvent) {
    event.preventDefault();
    setInventoryMessage("");
    setInventoryError("");
    const count = Math.max(1, Math.min(Number(itemCount) || 1, 100));
    if (Number(price) <= 0) return;
    const code = categories.find((entry) => entry.name === category)?.code || "GEN";
    const now = Date.now();
    const mediaOwnerId = editingId || `inv-local-${now}`;
    const pastedImageUrls = [imageUrl1, imageUrl2, imageUrl3].map((url) => normalizeMediaUrl(url, "image")).filter(Boolean);
    const pastedShortVideoUrl = normalizeMediaUrl(shortVideoUrlInput, "video");

    setSavingInventory(true);
    try {
      let mediaWarning = "";
      let uploadedImages: string[] = [];
      let uploadedVideos: string[] = [];

      if ((imageFiles.length || shortVideoFile) && !firebaseConfigured) {
        mediaWarning = "Firebase is not configured, so media was not uploaded. Item details were saved without new media.";
      }

      if (imageFiles.length && firebaseConfigured) {
        try {
          uploadedImages = await uploadInventoryMedia(mediaOwnerId, imageFiles, "dressImages");
        } catch (error) {
          mediaWarning = error instanceof Error ? `Image upload failed: ${error.message}` : "Image upload failed.";
        }
      }

      if (shortVideoFile && firebaseConfigured) {
        try {
          uploadedVideos = await uploadInventoryMedia(mediaOwnerId, [shortVideoFile], "dressVideos");
        } catch (error) {
          const videoError = error instanceof Error ? error.message : "Video upload failed.";
          mediaWarning = [mediaWarning, `Video upload failed: ${videoError}`].filter(Boolean).join(" ");
        }
      }

      const nextImages = pastedImageUrls.length ? pastedImageUrls : uploadedImages.length ? uploadedImages : existingImages;
      const nextFeaturedImage = nextImages[0] || items[0]?.featuredImage || fallbackDressImage;
      const nextShortVideo = pastedShortVideoUrl || uploadedVideos[0] || existingShortVideo || undefined;
      const mediaHelp = mediaWarning ? " Enable Firebase Storage in the Firebase Console, then deploy storage rules." : "";

      if (editingId) {
        const updatedItems = items.map((item) =>
          item.id === editingId
            ? ({
                ...item,
                name,
                category,
                size,
                storageLocation: location,
                ageGroup,
                gender: gender as InventoryItem["gender"],
                currentStatus,
                shoulder,
                bust,
                waist,
                hip,
                length,
                remarks,
                rentalPrice: Number(price),
                securityDeposit: Number(securityDeposit),
                images: nextImages.length ? nextImages : item.images,
                featuredImage: nextFeaturedImage || item.featuredImage,
                shortVideo: nextShortVideo || item.shortVideo,
                updatedAt: new Date().toISOString()
              } as InventoryItem)
            : item
        );
        const updatedItem = updatedItems.find((item) => item.id === editingId);
        if (updatedItem && firebaseConfigured) await saveInventoryItem(updatedItem);
        setItems(updatedItems);
        setInventoryMessage(mediaWarning ? `Inventory item updated without new media. ${mediaWarning}${mediaHelp}` : "Inventory item updated. Media files are stored in Firebase Storage; Firestore stores only URLs.");
        resetInventoryForm();
        return;
      }

      const nextItems = Array.from({ length: count }, (_, index): InventoryItem => ({
        ...items[0],
        id: `inv-local-${now}-${index + 1}`,
        dressId: `TC-${code}-${String(items.length + index + 1).padStart(3, "0")}`,
        name: count > 1 ? `${name} ${index + 1}` : name,
        category,
        size,
        storageLocation: location,
        ageGroup,
        gender: gender as InventoryItem["gender"],
        currentStatus,
        shoulder,
        bust,
        waist,
        hip,
        length,
        remarks,
        rentalPrice: Number(price),
        securityDeposit: Number(securityDeposit),
        images: nextImages.length ? nextImages : items[0]?.images || [fallbackDressImage],
        featuredImage: nextFeaturedImage,
        shortVideo: nextShortVideo,
        publicVisible: true,
        featured: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));
      if (firebaseConfigured) {
        await Promise.all(nextItems.map((item) => saveInventoryItem(item)));
      }
      setItems([...nextItems, ...items]);
      setInventoryMessage(mediaWarning ? `Saved ${nextItems.length} item${nextItems.length === 1 ? "" : "s"} without new media. ${mediaWarning}${mediaHelp}` : `Saved ${nextItems.length} item${nextItems.length === 1 ? "" : "s"}. Media files are in Firebase Storage; Firestore documents stay small.`);
      resetInventoryForm();
    } catch (error) {
      setInventoryError(error instanceof Error ? error.message : "Could not save this inventory item.");
    } finally {
      setSavingInventory(false);
    }
  }

  function resetInventoryForm() {
    setEditingId(null);
    imagePreviews.forEach((url) => URL.revokeObjectURL(url));
    if (shortVideoPreview.startsWith("blob:")) URL.revokeObjectURL(shortVideoPreview);
    setImageFiles([]);
    setImagePreviews([]);
    setShortVideoFile(null);
    setShortVideoPreview("");
    setExistingImages([]);
    setExistingShortVideo("");
    setImageUrl1("");
    setImageUrl2("");
    setImageUrl3("");
    setShortVideoUrlInput("");
    setShoulder("");
    setBust("");
    setWaist("");
    setHip("");
    setLength("");
    setRemarks("");
    setSecurityDeposit("500");
    setCurrentStatus("Available");
    setItemCount("1");
  }

  async function selectImages(files: FileList | null) {
    if (!files) return;
    imagePreviews.forEach((url) => URL.revokeObjectURL(url));
    setInventoryError("");
    setInventoryMessage("");
    const selectedFiles = Array.from(files).slice(0, 6);
    setProcessingImages(true);
    try {
      const compressedFiles = await Promise.all(
        selectedFiles.map((file) =>
          compressImageFile(file, {
            maxSide: Number(imageResizeSize) || 900,
            mode: imageCropMode
          })
        )
      );
      const largeFile = compressedFiles.find((file) => file.size > 1.5 * 1024 * 1024);
      if (largeFile) {
        setInventoryError("One image is still larger than 1.5 MB after compression. Please choose a smaller image.");
        setImageFiles([]);
        setImagePreviews([]);
        return;
      }
      setImageFiles(compressedFiles);
      setImagePreviews(compressedFiles.map((file) => URL.createObjectURL(file)));
      const totalSize = compressedFiles.reduce((sum, file) => sum + file.size, 0) / (1024 * 1024);
      setInventoryMessage(`Processed ${compressedFiles.length} image${compressedFiles.length === 1 ? "" : "s"} for upload (${totalSize.toFixed(1)} MB total).`);
    } catch (error) {
      setInventoryError(error instanceof Error ? error.message : "Could not compress selected images.");
      setImageFiles([]);
      setImagePreviews([]);
    } finally {
      setProcessingImages(false);
    }
  }

  function selectShortVideo(file: File | null) {
    if (shortVideoPreview.startsWith("blob:")) URL.revokeObjectURL(shortVideoPreview);
    setInventoryError("");
    if (file && file.size > 25 * 1024 * 1024) {
      setShortVideoFile(null);
      setShortVideoPreview(existingShortVideo);
      setInventoryError("Short video must be 25 MB or smaller. Please trim or compress the video before uploading.");
      return;
    }
    setShortVideoFile(file);
    setShortVideoPreview(file ? URL.createObjectURL(file) : existingShortVideo);
    if (file) setInventoryMessage("Short video selected. Keep it brief so storage and bandwidth stay low.");
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

  function editItem(item: InventoryItem) {
    setEditingId(item.id);
    setName(item.name);
    setCategory(item.category);
    setSize(item.size);
    setLocation(item.storageLocation);
    setAgeGroup(item.ageGroup === "Adults" ? "Adults" : "Kids");
    setGender(item.gender === "Male" ? "Male" : "Female");
    setCurrentStatus(item.currentStatus);
    setShoulder(item.shoulder || "");
    setBust(item.bust || "");
    setWaist(item.waist || "");
    setHip(item.hip || "");
    setLength(item.length || "");
    setRemarks(item.remarks || "");
    setPrice(String(item.rentalPrice));
    setSecurityDeposit(String(item.securityDeposit));
    setItemCount("1");
    imagePreviews.forEach((url) => URL.revokeObjectURL(url));
    if (shortVideoPreview.startsWith("blob:")) URL.revokeObjectURL(shortVideoPreview);
    setImageFiles([]);
    setImagePreviews([]);
    setShortVideoFile(null);
    setShortVideoPreview(item.shortVideo || "");
    setExistingImages(item.images);
    setExistingShortVideo(item.shortVideo || "");
    setImageUrl1(item.images[0] || "");
    setImageUrl2(item.images[1] || "");
    setImageUrl3(item.images[2] || "");
    setShortVideoUrlInput(item.shortVideo || "");
    setInventoryMessage("");
    setInventoryError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function deleteItem(item: InventoryItem) {
    const confirmed = window.confirm(`Delete ${item.dressId} - ${item.name}? This removes it from the current inventory list.`);
    if (!confirmed) return;
    setItems((currentItems) => currentItems.filter((entry) => entry.id !== item.id));
    if (editingId === item.id) resetInventoryForm();
  }

  function printQrLabel() {
    if (!qrItem || !qrDataUrl) return;
    const label = window.open("", "_blank", "width=420,height=620");
    if (!label) return;

    label.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>${qrItem.dressId} QR label</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; text-align: center; color: #1f2723; }
            .label { border: 1px solid #d7d0c2; border-radius: 8px; padding: 18px; display: inline-block; }
            img { width: 260px; height: 260px; }
            h1 { font-size: 20px; margin: 12px 0 4px; }
            p { margin: 4px 0; font-size: 13px; }
            @media print { button { display: none; } }
          </style>
        </head>
        <body>
          <div class="label">
            <img src="${qrDataUrl}" alt="${qrItem.dressId} QR code" />
            <h1>${qrItem.dressId}</h1>
            <p>${qrItem.name}</p>
            <p>${getInventoryItemLink(qrItem)}</p>
          </div>
          <p><button onclick="window.print()">Print</button></p>
        </body>
      </html>
    `);
    label.document.close();
  }

  function downloadSampleCsv() {
    const sample = [
      [
        "name",
        "category",
        "size",
        "location",
        "ageGroup",
        "gender",
        "status",
        "shoulder",
        "bust",
        "waist",
        "hip",
        "length",
        "rentalPrice",
        "securityDeposit",
        "itemCount",
        "remarks",
        "shortVideo"
      ],
      [
        "Mizo Traditional Dress",
        "Cultural Attire",
        "M",
        "Rack A-02",
        "Adults",
        "Female",
        "Available",
        "15 in",
        "34 in",
        "30 in",
        "36 in",
        "42 in",
        "850",
        "1200",
        "1",
        "Includes shawl and necklace",
        ""
      ],
      [
        "Kids Superhero Costume",
        "Superhero Costumes",
        "S",
        "Rack B-01",
        "Kids",
        "Male",
        "Available",
        "12 in",
        "26 in",
        "22 in",
        "28 in",
        "30 in",
        "650",
        "900",
        "2",
        "Cape included",
        ""
      ]
    ];
    const csv = sample.map((row) => row.map(csvCell).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "twigs-inventory-sample.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function importCsv(file: File | null) {
    setCsvMessage("");
    setCsvError("");
    if (!file) return;

    try {
      const rows = parseCsv(await file.text());
      if (rows.length < 2) {
        setCsvError("CSV must include a header row and at least one item row.");
        return;
      }

      const headers = rows[0].map(normalizeHeader);
      const imported = rows
        .slice(1)
        .flatMap((row, index) => rowToInventoryItems(rowToObject(headers, row), items.length + index + 1))
        .filter((item): item is InventoryItem => Boolean(item));

      if (imported.length === 0) {
        setCsvError("No valid inventory rows found. Check that each row has name and a positive rentalPrice.");
        return;
      }

      setPendingCsvItems(imported);
      setCsvMessage(`Ready to save ${imported.length} imported item${imported.length === 1 ? "" : "s"}. Review, then click Save imported CSV items.`);
    } catch (error) {
      setCsvError(error instanceof Error ? error.message : "Could not import this CSV file.");
    }
  }

  async function saveImportedCsvItems() {
    setCsvMessage("");
    setCsvError("");
    if (pendingCsvItems.length === 0) {
      setCsvError("Import a CSV file before saving.");
      return;
    }
    if (!firebaseConfigured) {
      setCsvError("Firebase is not configured, so imported CSV items cannot be saved permanently.");
      return;
    }

    setSavingCsvItems(true);
    try {
      await Promise.all(pendingCsvItems.map((item) => saveInventoryItem(item)));
      setItems([...pendingCsvItems, ...items]);
      setCsvMessage(`Saved ${pendingCsvItems.length} imported item${pendingCsvItems.length === 1 ? "" : "s"} to Firestore.`);
      setPendingCsvItems([]);
    } catch (error) {
      setCsvError(error instanceof Error ? error.message : "Could not save imported CSV items.");
    } finally {
      setSavingCsvItems(false);
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="Dress inventory" title="Physical inventory records" description="Every physical item has a unique ID, QR label, status, condition, images, cleaning instructions, and rental history protection." />
      <div className="grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
        <form onSubmit={addItem} className="rounded-lg border border-forest/10 bg-white p-5 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-forest">{editingId ? "Edit dress" : "Add dress"}</h2>
            {editingId && (
              <button type="button" onClick={resetInventoryForm} className="text-sm font-bold text-forest hover:underline">
                Cancel edit
              </button>
            )}
          </div>
          <div className="mt-4 grid gap-4">
            <TextField label="Dress name" value={name} onChange={setName} required />
            <SelectField label="Category" value={category} onChange={setCategory} options={categories.map((entry) => entry.name)} />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Size" value={size} onChange={setSize} required />
              <TextField label="Location" value={location} onChange={setLocation} required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField label="Age Group" value={ageGroup} onChange={setAgeGroup} options={["Kids", "Adults"]} />
              <SelectField label="Gender" value={gender} onChange={setGender} options={["Male", "Female"]} />
            </div>
            <SelectField label="Current Status" value={currentStatus} onChange={(value) => setCurrentStatus(value as DressStatus)} options={dressStatuses} />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Shoulder" value={shoulder} onChange={setShoulder} placeholder="e.g. 14 in" />
              <TextField label="Bust" value={bust} onChange={setBust} placeholder="e.g. 32 in" />
              <TextField label="Waist" value={waist} onChange={setWaist} placeholder="e.g. 28 in" />
              <TextField label="Hip" value={hip} onChange={setHip} placeholder="e.g. 34 in" />
              <TextField label="Length" value={length} onChange={setLength} placeholder="e.g. 38 in" />
              <TextField label="Rental price" value={price} onChange={setPrice} type="number" required />
              <TextField label="Security Deposit" value={securityDeposit} onChange={setSecurityDeposit} type="number" required />
            </div>
            <TextField label="No. of Item(s)" value={itemCount} onChange={setItemCount} type="number" required />
            {editingId && (
              <p className="rounded-md bg-amber-50 p-3 text-sm font-semibold text-amber-900">
                Editing updates one selected item. No. of Item(s) is used only when adding new records.
              </p>
            )}
            <TextAreaField label="Remarks" value={remarks} onChange={setRemarks} placeholder="Condition notes, fitting notes, accessories, or special handling." />
            <div className="grid gap-4 rounded-md border border-forest/10 bg-white p-3">
              <p className="text-sm font-bold text-forest">Media URLs</p>
              <p className="text-xs font-semibold text-charcoal/55">
                Paste direct public image/video links. Google Drive share links are converted automatically when possible.
              </p>
              <TextField label="Image URL 1" value={imageUrl1} onChange={setImageUrl1} placeholder="https://..." />
              <TextField label="Image URL 2" value={imageUrl2} onChange={setImageUrl2} placeholder="https://..." />
              <TextField label="Image URL 3" value={imageUrl3} onChange={setImageUrl3} placeholder="https://..." />
              <TextField label="Short video URL" value={shortVideoUrlInput} onChange={setShortVideoUrlInput} placeholder="https://..." />
            </div>
            <div className="grid gap-4 rounded-md border border-forest/10 bg-cream p-3 sm:grid-cols-2">
              <SelectField
                label="Image crop"
                value={imageCropMode}
                onChange={setImageCropMode}
                options={["Crop 4:5", "Square crop", "Fit full image"]}
              />
              <SelectField
                label="Image size"
                value={imageResizeSize}
                onChange={setImageResizeSize}
                options={["700", "900", "1200", "1400"]}
              />
            </div>
            <label className="grid gap-1.5 text-sm font-semibold text-charcoal">
              Dress photographs
              <span className="text-xs font-semibold text-charcoal/55">Up to 6 images. Images are resized and cropped before upload.</span>
              <input
                className="rounded-md border border-forest/15 bg-white px-3 py-2 text-charcoal file:mr-3 file:rounded-md file:border-0 file:bg-forest file:px-3 file:py-2 file:font-bold file:text-cream"
                type="file"
                accept="image/*"
                multiple
                disabled={processingImages}
                onChange={(event) => selectImages(event.target.files)}
              />
            </label>
            {processingImages && <p className="rounded-md bg-amber-50 p-3 text-sm font-semibold text-amber-900">Resizing and cropping images...</p>}
            {imagePreviews.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-charcoal/45">
                  First uploaded image becomes featured
                </p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {imagePreviews.map((url, index) => (
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
            <label className="grid gap-1.5 text-sm font-semibold text-charcoal">
              Short video
              <span className="text-xs font-semibold text-charcoal/55">25 MB maximum. Trim or compress videos before upload.</span>
              <input
                className="rounded-md border border-forest/15 bg-white px-3 py-2 text-charcoal file:mr-3 file:rounded-md file:border-0 file:bg-forest file:px-3 file:py-2 file:font-bold file:text-cream"
                type="file"
                accept="video/*"
                onChange={(event) => selectShortVideo(event.target.files?.[0] || null)}
              />
            </label>
            {(shortVideoPreview || shortVideoUrlInput.trim()) && (
              <div className="rounded-md border border-forest/10 bg-cream p-3">
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-charcoal/45">
                  Short video preview
                </p>
                <video className="aspect-video w-full rounded-md bg-black object-contain" src={shortVideoPreview || shortVideoUrlInput.trim()} controls />
              </div>
            )}
            {inventoryMessage && <p className="rounded-md bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">{inventoryMessage}</p>}
            {inventoryError && <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-800">{inventoryError}</p>}
            <button disabled={savingInventory || processingImages} className="inline-flex items-center justify-center gap-2 rounded-md bg-forest px-4 py-2 font-bold text-cream hover:bg-leaf disabled:cursor-not-allowed disabled:bg-stone-300">
              <Plus className="h-4 w-4" /> {savingInventory ? "Saving..." : processingImages ? "Processing images..." : editingId ? "Update item" : "Add sample item"}
            </button>
            <div className="rounded-lg border border-dashed border-forest/20 bg-cream p-4">
              <h3 className="font-bold text-forest">Bulk add items</h3>
              <p className="mt-1 text-sm text-charcoal/65">
                Download the sample format, fill item rows in Excel, then import the CSV here.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={downloadSampleCsv}
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-forest/20 px-4 py-2 font-bold text-forest hover:bg-forest/5"
                >
                  <Download className="h-4 w-4" /> Download sample CSV
                </button>
                <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md bg-forest px-4 py-2 font-bold text-cream hover:bg-leaf">
                  <FileText className="h-4 w-4" />
                  Import CSV
                  <input
                    className="sr-only"
                    type="file"
                    accept=".csv,text/csv"
                    onChange={(event) => {
                      void importCsv(event.target.files?.[0] || null);
                      event.target.value = "";
                    }}
                  />
                </label>
              </div>
              {pendingCsvItems.length > 0 && (
                <div className="mt-3 rounded-md border border-forest/10 bg-white p-3">
                  <p className="text-sm font-semibold text-charcoal/70">
                    {pendingCsvItems.length} imported item{pendingCsvItems.length === 1 ? "" : "s"} waiting to be saved.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={saveImportedCsvItems}
                      disabled={savingCsvItems}
                      className="inline-flex items-center gap-2 rounded-md bg-forest px-4 py-2 text-sm font-bold text-cream disabled:cursor-not-allowed disabled:bg-stone-300"
                    >
                      <Plus className="h-4 w-4" /> {savingCsvItems ? "Saving..." : "Save imported CSV items"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPendingCsvItems([]);
                        setCsvMessage("");
                        setCsvError("");
                      }}
                      disabled={savingCsvItems}
                      className="rounded-md border border-forest/20 px-4 py-2 text-sm font-bold text-forest disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Clear import
                    </button>
                  </div>
                </div>
              )}
              {csvMessage && <p className="mt-3 rounded-md bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">{csvMessage}</p>}
              {csvError && <p className="mt-3 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-800">{csvError}</p>}
            </div>
          </div>
        </form>
        <Panel title="Inventory search">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-charcoal/40" />
            <input className="w-full rounded-md border border-forest/15 py-2 pl-9 pr-3 outline-none focus:border-forest focus:ring-4 focus:ring-forest/10" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, ID, status, location" />
          </label>
          <div className="mt-5 grid gap-3 md:hidden">
            {filtered.length === 0 ? (
              <p className="rounded-md bg-cream p-3 text-sm font-semibold text-charcoal/60">No records match this search.</p>
            ) : (
              filtered.map((item) => (
                <article key={item.id} className="rounded-md border border-forest/10 bg-white p-3">
                  <div className="flex flex-col gap-2">
                    <p className="break-words font-bold text-charcoal">{item.name}</p>
                    <p className="text-sm font-semibold text-charcoal/60">{item.dressId}</p>
                    <StatusBadge status={item.currentStatus} />
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-3 text-sm text-charcoal/70">
                    <div>
                      <dt className="text-xs font-bold uppercase tracking-[0.12em] text-charcoal/45">Category</dt>
                      <dd className="mt-1 break-words font-semibold">{item.category}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-bold uppercase tracking-[0.12em] text-charcoal/45">Price</dt>
                      <dd className="mt-1 font-semibold">{formatCurrency(item.rentalPrice)}</dd>
                    </div>
                  </dl>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button className="rounded-md border border-forest/10 p-2 text-forest" title="Generate QR label" onClick={() => setQrItem(item)}><QrCode className="h-4 w-4" /></button>
                    <button className="rounded-md border border-forest/10 p-2 text-forest" title="Edit record" onClick={() => editItem(item)}><Pencil className="h-4 w-4" /></button>
                    <button className="rounded-md border border-forest/10 p-2 text-forest" title="Duplicate record" onClick={() => duplicate(item)}><Copy className="h-4 w-4" /></button>
                    <button className="rounded-md border border-forest/10 p-2 text-forest" title="Archive instead of delete"><Archive className="h-4 w-4" /></button>
                    <button className="rounded-md border border-red-200 p-2 text-red-700" title="Delete record" onClick={() => deleteItem(item)}><Trash2 className="h-4 w-4" /></button>
                  </div>
                </article>
              ))
            )}
          </div>
          <div className="mt-5 hidden overflow-x-auto md:block">
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
                        <button className="rounded-md border border-forest/10 p-2 text-forest" title="Generate QR label" onClick={() => setQrItem(item)}><QrCode className="h-4 w-4" /></button>
                        <button className="rounded-md border border-forest/10 p-2 text-forest" title="Edit record" onClick={() => editItem(item)}><Pencil className="h-4 w-4" /></button>
                        <button className="rounded-md border border-forest/10 p-2 text-forest" title="Duplicate record" onClick={() => duplicate(item)}><Copy className="h-4 w-4" /></button>
                        <button className="rounded-md border border-forest/10 p-2 text-forest" title="Archive instead of delete"><Archive className="h-4 w-4" /></button>
                        <button className="rounded-md border border-red-200 p-2 text-red-700" title="Delete record" onClick={() => deleteItem(item)}><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
      {qrItem && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-charcoal/50 p-4">
          <section className="w-full max-w-md rounded-lg bg-white p-5 shadow-soft">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-gold">QR label</p>
                <h2 className="mt-1 text-2xl font-bold text-forest">{qrItem.dressId}</h2>
                <p className="mt-1 text-sm text-charcoal/65">{qrItem.name}</p>
              </div>
              <button className="rounded-md border border-forest/10 px-3 py-1 text-sm font-bold text-forest" onClick={() => setQrItem(null)}>
                Close
              </button>
            </div>
            <div className="mt-5 grid place-items-center rounded-lg border border-forest/10 bg-cream p-5">
              {qrDataUrl ? (
                <img className="h-72 w-72 rounded-md bg-white p-2" src={qrDataUrl} alt={`${qrItem.dressId} QR code`} />
              ) : (
                <p className="py-24 text-sm font-semibold text-charcoal/60">Generating QR...</p>
              )}
            </div>
            <p className="mt-4 break-all rounded-md bg-cream p-3 text-xs font-semibold text-charcoal/70">
              {getInventoryItemLink(qrItem)}
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={printQrLabel}
                disabled={!qrDataUrl}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-forest px-4 py-2 font-bold text-cream disabled:bg-stone-300"
              >
                <Printer className="h-4 w-4" /> Print label
              </button>
              <a
                href={qrDataUrl || undefined}
                download={`${qrItem.dressId}-qr.png`}
                className={`inline-flex items-center justify-center gap-2 rounded-md border border-forest/20 px-4 py-2 font-bold text-forest ${qrDataUrl ? "hover:bg-forest/5" : "pointer-events-none opacity-50"}`}
              >
                <Download className="h-4 w-4" /> Download PNG
              </a>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function getInventoryItemLink(item: InventoryItem) {
  return `${window.location.origin}/inventory?dressId=${encodeURIComponent(item.dressId)}`;
}

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell.trim());
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function normalizeHeader(header: string) {
  return header.replace(/[^a-z0-9]/gi, "").toLowerCase();
}

function rowToObject(headers: string[], row: string[]) {
  return headers.reduce<Record<string, string>>((record, header, index) => {
    record[header] = row[index]?.trim() || "";
    return record;
  }, {});
}

function rowValue(row: Record<string, string>, ...keys: string[]) {
  for (const key of keys) {
    const value = row[normalizeHeader(key)];
    if (value) return value;
  }
  return "";
}

async function compressImageFile(
  file: File,
  {
    maxSide = 900,
    mode = "Crop 4:5",
    quality = 0.72
  }: {
    maxSide?: number;
    mode?: string;
    quality?: number;
  } = {}
): Promise<File> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const element = new Image();
    element.onload = () => {
      URL.revokeObjectURL(url);
      resolve(element);
    };
    element.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Could not read ${file.name}.`));
    };
    element.src = url;
  });

  let sourceX = 0;
  let sourceY = 0;
  let sourceWidth = image.width;
  let sourceHeight = image.height;
  let outputWidth = 0;
  let outputHeight = 0;

  if (mode === "Crop 4:5" || mode === "Square crop") {
    const targetAspect = mode === "Square crop" ? 1 : 4 / 5;
    const sourceAspect = image.width / image.height;
    if (sourceAspect > targetAspect) {
      sourceWidth = image.height * targetAspect;
      sourceX = (image.width - sourceWidth) / 2;
    } else {
      sourceHeight = image.width / targetAspect;
      sourceY = (image.height - sourceHeight) / 2;
    }
    outputHeight = mode === "Square crop" ? maxSide : maxSide;
    outputWidth = Math.round(outputHeight * targetAspect);
  } else {
    const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
    outputWidth = Math.max(1, Math.round(image.width * scale));
    outputHeight = Math.max(1, Math.round(image.height * scale));
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, outputWidth);
  canvas.height = Math.max(1, outputHeight);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Image compression is not supported in this browser.");
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((nextBlob) => {
      if (nextBlob) resolve(nextBlob);
      else reject(new Error(`Could not compress ${file.name}.`));
    }, "image/jpeg", quality);
  });
  const name = file.name.replace(/\.[^.]+$/, "") || "dress-image";
  return new File([blob], `${name}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
}

function rowToInventoryItems(row: Record<string, string>, position: number): InventoryItem[] {
  const name = rowValue(row, "name", "dressName", "dress");
  const rentalPrice = Number(rowValue(row, "rentalPrice", "price", "rent"));
  if (!name || !Number.isFinite(rentalPrice) || rentalPrice <= 0) return [];

  const category = rowValue(row, "category") || categories[0].name;
  const code = categories.find((entry) => entry.name.toLowerCase() === category.toLowerCase())?.code || "GEN";
  const ageGroup = normalizeAgeGroup(rowValue(row, "ageGroup", "age"));
  const gender = normalizeGender(rowValue(row, "gender"));
  const count = Math.max(1, Math.min(Number(rowValue(row, "itemCount", "noOfItems", "quantity", "qty")) || 1, 100));

  return Array.from({ length: count }, (_, index): InventoryItem => ({
    ...inventoryItems[0],
    id: `inv-csv-${Date.now()}-${position}-${index + 1}`,
    dressId: rowValue(row, "dressId", "id") || `TC-${code}-${String(position + index).padStart(3, "0")}`,
    name: count > 1 ? `${name} ${index + 1}` : name,
    category,
    size: rowValue(row, "size") || "M",
    storageLocation: rowValue(row, "location", "storageLocation") || "Unassigned",
    ageGroup,
    gender,
    shoulder: rowValue(row, "shoulder"),
    bust: rowValue(row, "bust"),
    waist: rowValue(row, "waist"),
    hip: rowValue(row, "hip"),
    length: rowValue(row, "length"),
    rentalPrice,
    remarks: rowValue(row, "remarks", "notes"),
    shortVideo: rowValue(row, "shortVideo", "video", "videoUrl") || undefined,
    colour: rowValue(row, "colour", "color") || inventoryItems[0].colour,
    material: rowValue(row, "material") || inventoryItems[0].material,
    securityDeposit: Number(rowValue(row, "securityDeposit", "deposit")) || inventoryItems[0].securityDeposit,
    currentStatus: normalizeDressStatus(rowValue(row, "status", "currentStatus")),
    publicVisible: true,
    featured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }));
}

function normalizeAgeGroup(value: string) {
  return value.toLowerCase() === "adults" || value.toLowerCase() === "adult" ? "Adults" : "Kids";
}

function normalizeGender(value: string): InventoryItem["gender"] {
  return value.toLowerCase() === "male" ? "Male" : "Female";
}

function normalizeDressStatus(value: string): DressStatus {
  return dressStatuses.find((status) => status.toLowerCase() === value.toLowerCase()) || "Available";
}

export function CustomersPage() {
  const [rows, setRows] = useSyncedCustomers();
  const [name, setName] = useState("New Customer");
  const [mobile, setMobile] = useState("+91 ");
  const [town, setTown] = useState("Aizawl");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function addCustomer(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    setError("");
    if (!/^\+?\d[\d\s-]{8,}$/.test(mobile)) {
      setError("Enter a valid mobile number.");
      return;
    }
    const next: Customer = {
      ...customers[0],
      id: `cust-local-${Date.now()}`,
      customerId: `TC-CUS-${String(rows.length + 1).padStart(3, "0")}`,
      fullName: name,
      mobile,
      town,
      outstandingBalance: 0,
      securityDepositHeld: 0,
      status: "Active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setSaving(true);
    try {
      if (firebaseConfigured) await saveCustomer(next);
      setRows([next, ...rows]);
      setMessage(firebaseConfigured ? "Customer saved to Firebase and is available in Bookings." : "Customer added in this session.");
      setName("New Customer");
      setMobile("+91 ");
      setTown("Aizawl");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save customer.");
    } finally {
      setSaving(false);
    }
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
            {message && <p className="rounded-md bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">{message}</p>}
            {error && <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</p>}
            <button disabled={saving} className="rounded-md bg-forest px-4 py-2 font-bold text-cream hover:bg-leaf disabled:cursor-not-allowed disabled:bg-stone-300">
              {saving ? "Saving..." : "Create customer"}
            </button>
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
  const [bookingRows, setBookingRows] = useState(bookings);
  const syncedItems = useSyncedInventoryItems();
  const [customerRows] = useSyncedCustomers();
  const [selectedCustomerId, setSelectedCustomerId] = useState(customers[0].id);
  const [selectedItemId, setSelectedItemId] = useState(inventoryItems[1].id);
  const [bookingSource, setBookingSource] = useState("Walk-in");
  const [eventDate, setEventDate] = useState("2026-08-05");
  const [eventType, setEventType] = useState("School programme");
  const [pickup, setPickup] = useState("2026-08-04T10:00");
  const [returnAt, setReturnAt] = useState("2026-08-06T17:00");
  const [notes, setNotes] = useState("");
  const [bookingMessage, setBookingMessage] = useState("");
  const [bookingError, setBookingError] = useState("");
  const item = syncedItems.find((entry) => entry.id === selectedItemId) || syncedItems[0];
  const customer = customerRows.find((entry) => entry.id === selectedCustomerId) || customerRows[0];
  const conflicts = findAvailabilityConflicts(selectedItemId, pickup, returnAt, bookingRows, settings.preparationBufferHours);
  const rentalDays = calculateRentalDays(pickup, returnAt);
  const validDates = new Date(returnAt).getTime() > new Date(pickup).getTime();

  useEffect(() => {
    if (customerRows.length && !customerRows.some((entry) => entry.id === selectedCustomerId)) {
      setSelectedCustomerId(customerRows[0].id);
    }
  }, [customerRows, selectedCustomerId]);

  useEffect(() => {
    if (syncedItems.length && !syncedItems.some((entry) => entry.id === selectedItemId)) {
      setSelectedItemId(syncedItems[0].id);
    }
  }, [selectedItemId, syncedItems]);

  function createBooking(event: FormEvent) {
    event.preventDefault();
    setBookingMessage("");
    setBookingError("");

    if (!validDates) {
      setBookingError("Expected return must be later than pickup.");
      return;
    }

    if (!customer || !item) {
      setBookingError("Select a customer and physical item before creating a booking.");
      return;
    }

    const createdAt = new Date().toISOString();
    const nextBooking: Booking = {
      id: `booking-local-${Date.now()}`,
      bookingNumber: `TC-BKG-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${String(bookingRows.length + 1).padStart(3, "0")}`,
      customerId: customer.id,
      customerName: customer.fullName,
      customerPhone: customer.mobile,
      bookingSource: bookingSource as Booking["bookingSource"],
      bookingDate: new Date().toISOString().slice(0, 10),
      eventDate,
      pickupDateTime: pickup,
      expectedReturnDateTime: returnAt,
      items: [
        {
          inventoryItemId: item.id,
          dressId: item.dressId,
          name: item.name,
          quantity: 1,
          rentalCharge: item.rentalPrice,
          securityDeposit: item.securityDeposit
        }
      ],
      rentalDays,
      discount: 0,
      additionalCharges: 0,
      lateFees: 0,
      cleaningCharges: 0,
      damageCharges: 0,
      missingItemCharges: 0,
      totalReceived: 0,
      refundableAmount: item.securityDeposit,
      paymentStatus: "Unpaid",
      bookingStatus: "Pending Approval",
      depositStatus: "Not Received",
      eventType,
      customerNotes: notes,
      termsAccepted: true,
      staffMember: "Current staff",
      createdAt,
      updatedAt: createdAt
    };

    setBookingRows([nextBooking, ...bookingRows]);
    setBookingMessage(`${nextBooking.bookingNumber} created as Pending Approval.`);
    setNotes("");
  }

  function approveBooking(booking: Booking) {
    setBookingMessage("");
    setBookingError("");
    const itemId = booking.items[0]?.inventoryItemId;
    if (!itemId) return;

    const approveConflicts = findAvailabilityConflicts(
      itemId,
      booking.pickupDateTime,
      booking.expectedReturnDateTime,
      bookingRows,
      settings.preparationBufferHours,
      booking.id
    );

    if (approveConflicts.length > 0) {
      setBookingError(`${booking.bookingNumber} cannot be approved because it overlaps ${approveConflicts.map((entry) => entry.bookingNumber).join(", ")}.`);
      return;
    }

    setBookingRows((rows) =>
      rows.map((entry) =>
        entry.id === booking.id
          ? { ...entry, bookingStatus: "Confirmed", updatedAt: new Date().toISOString() }
          : entry
      )
    );
    setBookingMessage(`${booking.bookingNumber} approved and confirmed.`);
  }

  function cancelBooking(booking: Booking) {
    const confirmed = window.confirm(`Cancel ${booking.bookingNumber}?`);
    if (!confirmed) return;
    setBookingRows((rows) =>
      rows.map((entry) =>
        entry.id === booking.id
          ? { ...entry, bookingStatus: "Cancelled", updatedAt: new Date().toISOString() }
          : entry
      )
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="Bookings" title="Reservations and double-booking prevention" description="Bookings may contain multiple dresses and stay Pending Approval until authorised staff confirms them with a transaction-safe availability check." />
      <div className="grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
        <form onSubmit={createBooking}>
          <Panel title="New booking">
            <div className="grid gap-4">
            <SelectField label="Customer" value={selectedCustomerId} onChange={setSelectedCustomerId} options={customerRows.map((entry) => entry.id)} />
            <p className="rounded-md bg-cream p-3 text-sm font-semibold text-charcoal/70">
              {customer.customerId} - {customer.fullName} - {customer.mobile}
            </p>
            <SelectField label="Physical item" value={selectedItemId} onChange={setSelectedItemId} options={syncedItems.map((entry) => entry.id)} />
            <p className="rounded-md bg-cream p-3 text-sm font-semibold text-charcoal/70">
              {item.dressId} - {item.name} - Rent {formatCurrency(item.rentalPrice)} - Deposit {formatCurrency(item.securityDeposit)}
            </p>
            <SelectField label="Booking source" value={bookingSource} onChange={setBookingSource} options={["Walk-in", "Phone", "WhatsApp", "Website", "Social Media", "Other"]} />
            <TextField label="Event date" value={eventDate} onChange={setEventDate} type="date" />
            <TextField label="Event type" value={eventType} onChange={setEventType} />
            <TextField label="Pickup" value={pickup} onChange={setPickup} type="datetime-local" />
            <TextField label="Expected return" value={returnAt} onChange={setReturnAt} type="datetime-local" />
            <TextAreaField label="Notes" value={notes} onChange={setNotes} placeholder="Customer notes, fitting details, programme, or accessories needed." />
            <div className={`rounded-md p-4 ${conflicts.length ? "bg-red-50 text-red-900" : "bg-emerald-50 text-emerald-900"}`}>
              <h3 className="font-bold">{conflicts.length ? "Conflict warning" : "No blocking conflict"}</h3>
              <p className="mt-1 text-sm">
                {conflicts.length
                  ? `${item.dressId} overlaps ${conflicts.map((booking) => booking.bookingNumber).join(", ")}. Suggest a similar available dress before confirming.`
                  : `${item.dressId} can be saved as Pending Approval for this rental period.`}
              </p>
            </div>
            <div className="rounded-md bg-cream p-3 text-sm font-semibold text-charcoal/70">
              Rental days: {rentalDays} - Rental {formatCurrency(item.rentalPrice)} - Deposit {formatCurrency(item.securityDeposit)}
            </div>
            {bookingMessage && <p className="rounded-md bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">{bookingMessage}</p>}
            {bookingError && <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-800">{bookingError}</p>}
            <button className="rounded-md bg-forest px-4 py-2 font-bold text-cream hover:bg-leaf">
              Create pending booking
            </button>
            </div>
          </Panel>
        </form>
        <ResponsiveTable
          headers={["Booking", "Customer", "Items", "Pickup", "Return", "Payment", "Status", "Actions"]}
          rows={bookingRows.map((booking) => [
            booking.bookingNumber,
            booking.customerName,
            booking.items.map((entry) => entry.dressId).join(", "),
            booking.pickupDateTime,
            booking.expectedReturnDateTime,
            <StatusBadge key={`${booking.id}-pay`} status={booking.paymentStatus} />,
            <StatusBadge key={booking.id} status={booking.bookingStatus} />,
            <div key={`${booking.id}-actions`} className="flex flex-wrap gap-2">
              <button
                className="rounded-md border border-forest/20 px-3 py-1 text-xs font-bold text-forest disabled:cursor-not-allowed disabled:opacity-40"
                disabled={booking.bookingStatus !== "Pending Approval"}
                onClick={() => approveBooking(booking)}
              >
                Approve
              </button>
              <button
                className="rounded-md border border-red-200 px-3 py-1 text-xs font-bold text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={["Completed", "Cancelled"].includes(booking.bookingStatus)}
                onClick={() => cancelBooking(booking)}
              >
                Cancel
              </button>
            </div>
          ])}
        />
      </div>
    </div>
  );
}

function calculateRentalDays(pickup: string, returnAt: string) {
  const start = new Date(pickup).getTime();
  const end = new Date(returnAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 1;
  return Math.max(1, Math.ceil((end - start) / (24 * 60 * 60 * 1000)));
}

export function PickupPage() {
  const [bookingRows, setBookingRows] = useState(bookings);
  const [itemStatuses, setItemStatuses] = useState<Record<string, DressStatus>>({});
  const [query, setQuery] = useState("");
  const [selectedBookingId, setSelectedBookingId] = useState(bookings[0]?.id || "");
  const [scannedDressId, setScannedDressId] = useState(bookings[0]?.items[0]?.dressId || "");
  const [conditionNotes, setConditionNotes] = useState("");
  const [accessoryNotes, setAccessoryNotes] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [pickupMessage, setPickupMessage] = useState("");
  const [pickupError, setPickupError] = useState("");

  const searchableBookings = bookingRows.filter((booking) =>
    [booking.bookingNumber, booking.customerName, booking.customerPhone, booking.items.map((item) => item.dressId).join(" ")]
      .join(" ")
      .toLowerCase()
      .includes(query.toLowerCase())
  );
  const booking = bookingRows.find((entry) => entry.id === selectedBookingId) || bookingRows[0];
  const totals = booking ? bookingTotals(booking) : undefined;
  const paymentComplete = totals ? totals.balanceDue === 0 : false;
  const selectedItem = booking?.items[0];
  const inventoryItem = inventoryItems.find((item) => item.id === selectedItem?.inventoryItemId);
  const currentItemStatus = selectedItem ? itemStatuses[selectedItem.inventoryItemId] || inventoryItem?.currentStatus || "Available" : "Available";
  const scanMatches = selectedItem ? scannedDressId.trim().toLowerCase() === selectedItem.dressId.toLowerCase() : false;
  const canIssueStatus = !["Rented", "Cleaning", "Repair", "Damaged", "Lost", "Retired"].includes(currentItemStatus);
  const issueBlocked = booking?.bookingStatus === "Issued" || !scanMatches || !canIssueStatus || !conditionNotes.trim() || (!paymentComplete && !overrideReason.trim());

  function selectBooking(id: string) {
    const next = bookingRows.find((entry) => entry.id === id);
    setSelectedBookingId(id);
    setScannedDressId(next?.items[0]?.dressId || "");
    setConditionNotes("");
    setAccessoryNotes("");
    setOverrideReason("");
    setPickupMessage("");
    setPickupError("");
  }

  function markIssued() {
    setPickupMessage("");
    setPickupError("");
    if (!booking || !selectedItem) return;

    if (issueBlocked) {
      setPickupError("Complete scan verification, condition notes, item availability, and payment/override requirements before issuing.");
      return;
    }

    setBookingRows((rows) =>
      rows.map((entry) =>
        entry.id === booking.id
          ? {
              ...entry,
              bookingStatus: "Issued",
              paymentStatus: paymentComplete ? entry.paymentStatus : "Outstanding",
              internalNotes: [
                entry.internalNotes,
                `Pickup condition: ${conditionNotes}`,
                accessoryNotes ? `Accessories: ${accessoryNotes}` : "",
                overrideReason ? `Manager override: ${overrideReason}` : ""
              ]
                .filter(Boolean)
                .join(" | "),
              updatedAt: new Date().toISOString()
            }
          : entry
      )
    );
    setItemStatuses((statuses) => ({ ...statuses, [selectedItem.inventoryItemId]: "Rented" }));
    setPickupMessage(`${booking.bookingNumber} issued. ${selectedItem.dressId} is now marked Rented.`);
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Pickup"
        title="Guided dress issue"
        description="Search a booking, verify payment and dress QR, record condition/accessories, then mark the booking as Issued and the item as Rented."
      />
      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Panel title="Find booking">
          <div className="grid gap-4">
            <TextField label="Search booking, customer, phone, or dress ID" value={query} onChange={setQuery} placeholder="TC-BKG, Lalrinpuii, phone, dress ID" />
            <SelectField
              label="Booking"
              value={booking?.id || ""}
              onChange={selectBooking}
              options={searchableBookings.length ? searchableBookings.map((entry) => entry.id) : bookingRows.map((entry) => entry.id)}
            />
            {booking && (
              <div className="rounded-md bg-cream p-3 text-sm font-semibold text-charcoal/75">
                <p>{booking.bookingNumber} - {booking.customerName}</p>
                <p>{booking.customerPhone}</p>
                <p>{booking.items.map((item) => `${item.dressId} ${item.name}`).join(", ")}</p>
              </div>
            )}
          </div>
        </Panel>

        {booking && selectedItem && totals && (
          <Panel title="Issue checklist">
            <div className="grid gap-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-md bg-cream p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-charcoal/45">Booking</p>
                  <div className="mt-2"><StatusBadge status={booking.bookingStatus} /></div>
                </div>
                <div className="rounded-md bg-cream p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-charcoal/45">Payment</p>
                  <div className="mt-2"><StatusBadge status={paymentComplete ? "Paid" : booking.paymentStatus} /></div>
                  <p className="mt-2 text-sm font-semibold text-charcoal/70">Balance {formatCurrency(totals.balanceDue)}</p>
                </div>
                <div className="rounded-md bg-cream p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-charcoal/45">Item</p>
                  <div className="mt-2"><StatusBadge status={currentItemStatus} /></div>
                </div>
              </div>

              <TextField label="Scan or enter dress ID" value={scannedDressId} onChange={setScannedDressId} />
              <p className={`rounded-md p-3 text-sm font-semibold ${scanMatches ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-800"}`}>
                {scanMatches ? `Scan verified for ${selectedItem.dressId}.` : `Expected ${selectedItem.dressId}.`}
              </p>

              <TextAreaField label="Issue condition notes" value={conditionNotes} onChange={setConditionNotes} placeholder="Clean, no stains, accessories checked, photos taken..." />
              <TextAreaField label="Accessory notes" value={accessoryNotes} onChange={setAccessoryNotes} placeholder="Cape, tiara, sash, jewelry, props..." />

              {!paymentComplete && (
                <TextAreaField label="Manager override reason" value={overrideReason} onChange={setOverrideReason} placeholder="Required if issuing with outstanding balance." />
              )}

              {!canIssueStatus && (
                <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-800">
                  This item cannot be issued while status is {currentItemStatus}.
                </p>
              )}
              {pickupMessage && <p className="rounded-md bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">{pickupMessage}</p>}
              {pickupError && <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-800">{pickupError}</p>}

              <button
                type="button"
                onClick={markIssued}
                disabled={issueBlocked}
                className="rounded-md bg-forest px-5 py-3 font-bold text-cream hover:bg-leaf disabled:cursor-not-allowed disabled:bg-stone-300"
              >
                Mark as Issued
              </button>
            </div>
          </Panel>
        )}
      </div>

      <ResponsiveTable
        title="Pickup queue"
        headers={["Booking", "Customer", "Dress", "Pickup", "Balance", "Booking Status", "Item Status"]}
        rows={bookingRows.map((entry) => {
          const firstItem = entry.items[0];
          const status = firstItem ? itemStatuses[firstItem.inventoryItemId] || inventoryItems.find((item) => item.id === firstItem.inventoryItemId)?.currentStatus || "Available" : "Available";
          return [
            entry.bookingNumber,
            entry.customerName,
            entry.items.map((item) => item.dressId).join(", "),
            entry.pickupDateTime,
            formatCurrency(bookingTotals(entry).balanceDue),
            <StatusBadge key={`${entry.id}-booking`} status={entry.bookingStatus} />,
            <StatusBadge key={`${entry.id}-item`} status={status} />
          ];
        })}
      />
    </div>
  );
}

export function ReturnsPage() {
  const [bookingRows, setBookingRows] = useState(bookings);
  const [itemStatuses, setItemStatuses] = useState<Record<string, DressStatus>>({});
  const [selectedBookingId, setSelectedBookingId] = useState(bookings[1]?.id || bookings[0]?.id || "");
  const selectedBooking = bookingRows.find((booking) => booking.id === selectedBookingId) || bookingRows[0];
  const selectedItem = selectedBooking?.items[0];
  const inventoryItem = inventoryItems.find((item) => item.id === selectedItem?.inventoryItemId);
  const [scannedDressId, setScannedDressId] = useState(bookings[1]?.items[0]?.dressId || bookings[0]?.items[0]?.dressId || "");
  const [returnCondition, setReturnCondition] = useState(selectedItem?.returnCondition || "");
  const [lateFees, setLateFees] = useState(String(selectedBooking?.lateFees ?? 0));
  const [cleaningCharges, setCleaningCharges] = useState(String(selectedBooking?.cleaningCharges ?? 0));
  const [damageCharges, setDamageCharges] = useState(String(selectedBooking?.damageCharges ?? 0));
  const [missingItemCharges, setMissingItemCharges] = useState(String(selectedBooking?.missingItemCharges ?? 0));
  const [nextStatus, setNextStatus] = useState<DressStatus>("Returned - Inspection Pending");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const scanMatches = selectedItem ? scannedDressId.trim().toLowerCase() === selectedItem.dressId.toLowerCase() : false;
  const numericLateFees = Math.max(Number(lateFees) || 0, 0);
  const numericCleaningCharges = Math.max(Number(cleaningCharges) || 0, 0);
  const numericDamageCharges = Math.max(Number(damageCharges) || 0, 0);
  const numericMissingItemCharges = Math.max(Number(missingItemCharges) || 0, 0);
  const adjustedBooking = selectedBooking
    ? {
        ...selectedBooking,
        lateFees: numericLateFees,
        cleaningCharges: numericCleaningCharges,
        damageCharges: numericDamageCharges,
        missingItemCharges: numericMissingItemCharges
      }
    : undefined;
  const totals = adjustedBooking ? bookingTotals(adjustedBooking) : undefined;
  const canComplete = Boolean(selectedBooking && selectedItem && scanMatches && returnCondition.trim());

  function selectBooking(id: string) {
    const nextBooking = bookingRows.find((booking) => booking.id === id);
    const nextItem = nextBooking?.items[0];
    setSelectedBookingId(id);
    setScannedDressId(nextItem?.dressId || "");
    setReturnCondition(nextItem?.returnCondition || "");
    setLateFees(String(nextBooking?.lateFees ?? 0));
    setCleaningCharges(String(nextBooking?.cleaningCharges ?? 0));
    setDamageCharges(String(nextBooking?.damageCharges ?? 0));
    setMissingItemCharges(String(nextBooking?.missingItemCharges ?? 0));
    setNextStatus((inventoryItems.find((item) => item.id === nextItem?.inventoryItemId)?.currentStatus as DressStatus) || "Returned - Inspection Pending");
    setMessage("");
    setError("");
  }

  async function completeInspection() {
    setMessage("");
    setError("");
    if (!selectedBooking || !selectedItem || !totals || !canComplete) {
      setError("Scan the correct dress ID and enter return condition notes before completing inspection.");
      return;
    }

    const now = new Date().toISOString();
    const nextBooking: Booking = {
      ...selectedBooking,
      bookingStatus: nextStatus === "Available" ? "Completed" : "Inspection Pending",
      actualReturnDateTime: now,
      lateFees: numericLateFees,
      cleaningCharges: numericCleaningCharges,
      damageCharges: numericDamageCharges,
      missingItemCharges: numericMissingItemCharges,
      refundableAmount: totals.refundableDeposit,
      internalNotes: [selectedBooking.internalNotes, `Return condition: ${returnCondition}`, `Next item status: ${nextStatus}`].filter(Boolean).join(" | "),
      items: selectedBooking.items.map((item) =>
        item.inventoryItemId === selectedItem.inventoryItemId ? { ...item, returned: true, returnCondition } : item
      ),
      updatedAt: now
    };

    setSaving(true);
    try {
      if (firebaseConfigured && !selectedBooking.id.startsWith("booking-")) {
        await updateBookingReturnInspection(selectedBooking.id, {
          bookingStatus: nextBooking.bookingStatus,
          actualReturnDateTime: now,
          lateFees: numericLateFees,
          cleaningCharges: numericCleaningCharges,
          damageCharges: numericDamageCharges,
          missingItemCharges: numericMissingItemCharges,
          refundableAmount: totals.refundableDeposit,
          internalNotes: nextBooking.internalNotes
        });
      }
      if (firebaseConfigured && inventoryItem && !inventoryItem.id.startsWith("inv-")) {
        await updateInventoryStatus(inventoryItem, nextStatus);
      }
      setBookingRows((rows) => rows.map((booking) => (booking.id === selectedBooking.id ? nextBooking : booking)));
      setItemStatuses((statuses) => ({ ...statuses, [selectedItem.inventoryItemId]: nextStatus }));
      setMessage(`${selectedBooking.bookingNumber} return completed. ${selectedItem.dressId} is now ${nextStatus}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not complete this return.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Returns"
        title="Return and inspection"
        description="Scan the returned dress, compare issue and return condition, record charges, and route the item to its next status."
      />
      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Panel title="Return intake">
          <div className="grid gap-4">
            <SelectField label="Booking" value={selectedBooking?.id || ""} onChange={selectBooking} options={bookingRows.map((booking) => booking.id)} />
            {selectedBooking && selectedItem && (
              <div className="rounded-md bg-cream p-3 text-sm font-semibold text-charcoal/75">
                <p>{selectedBooking.bookingNumber} - {selectedBooking.customerName}</p>
                <p>{selectedItem.dressId} {selectedItem.name}</p>
                <p>Issue condition: {selectedItem.issueCondition || "Not recorded"}</p>
              </div>
            )}
            <TextField label="Scan or enter dress ID" value={scannedDressId} onChange={setScannedDressId} />
            <p className={`rounded-md p-3 text-sm font-semibold ${scanMatches ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-800"}`}>
              {scanMatches ? "Dress ID verified." : `Expected ${selectedItem?.dressId || "a booking item"}.`}
            </p>
            <TextAreaField label="Return condition notes" value={returnCondition} onChange={setReturnCondition} placeholder="Condition, stains, tears, missing accessories, photos taken..." />
            <SelectField label="Next item status" value={nextStatus} onChange={(value) => setNextStatus(value as DressStatus)} options={dressStatuses} />
          </div>
        </Panel>

        <Panel title="Charges and settlement">
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Late fees" value={lateFees} onChange={setLateFees} type="number" />
              <TextField label="Cleaning charges" value={cleaningCharges} onChange={setCleaningCharges} type="number" />
              <TextField label="Damage charges" value={damageCharges} onChange={setDamageCharges} type="number" />
              <TextField label="Missing item charges" value={missingItemCharges} onChange={setMissingItemCharges} type="number" />
            </div>
            {totals && (
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-md bg-cream p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-charcoal/45">Deposit</p>
                  <p className="mt-2 text-xl font-black text-forest">{formatCurrency(totals.deposit)}</p>
                </div>
                <div className="rounded-md bg-cream p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-charcoal/45">Refundable</p>
                  <p className="mt-2 text-xl font-black text-forest">{formatCurrency(totals.refundableDeposit)}</p>
                </div>
                <div className="rounded-md bg-cream p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-charcoal/45">Settlement</p>
                  <p className="mt-2 text-xl font-black text-forest">{formatCurrency(totals.finalSettlement)}</p>
                </div>
              </div>
            )}
            {message && <p className="rounded-md bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">{message}</p>}
            {error && <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</p>}
            <button type="button" onClick={completeInspection} disabled={saving || !canComplete} className="rounded-md bg-forest px-5 py-3 font-bold text-cream hover:bg-leaf disabled:cursor-not-allowed disabled:bg-stone-300">
              {saving ? "Completing..." : "Complete inspection"}
            </button>
          </div>
        </Panel>
      </div>
      <ResponsiveTable
        title="Return queue"
        headers={["Booking", "Customer", "Dress", "Return due", "Returned", "Booking Status", "Item Status"]}
        rows={bookingRows.map((booking) => {
          const firstItem = booking.items[0];
          const itemStatus = firstItem ? itemStatuses[firstItem.inventoryItemId] || inventoryItems.find((item) => item.id === firstItem.inventoryItemId)?.currentStatus || "Available" : "Available";
          return [
            booking.bookingNumber,
            booking.customerName,
            booking.items.map((item) => item.dressId).join(", "),
            booking.expectedReturnDateTime,
            booking.items.every((item) => item.returned) ? "Yes" : "No",
            <StatusBadge key={`${booking.id}-booking`} status={booking.bookingStatus} />,
            <StatusBadge key={`${booking.id}-item`} status={itemStatus} />
          ];
        })}
      />
    </div>
  );
}

export function PaymentsPage() {
  const [bookingRows, setBookingRows] = useState(bookings);
  const [paymentRows, setPaymentRows] = useState(payments);
  const [selectedBookingId, setSelectedBookingId] = useState(bookings[0]?.id || "");
  const [transactionType, setTransactionType] = useState<PaymentTransactionType>("Balance Payment");
  const [method, setMethod] = useState<PaymentMethod>("UPI");
  const [amount, setAmount] = useState(String(bookingTotals(bookings[0]).balanceDue));
  const [upi, setUpi] = useState("");
  const [bankReference, setBankReference] = useState("");
  const [paymentPurpose, setPaymentPurpose] = useState("Balance payment");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const [lastSavedPayment, setLastSavedPayment] = useState<PaymentTransaction | undefined>();

  const selectedBooking = bookingRows.find((booking) => booking.id === selectedBookingId) || bookingRows[0];
  const totals = selectedBooking ? bookingTotals(selectedBooking) : undefined;
  const amountValue = Number(amount);
  const cleanedUpi = upi.trim();
  const cleanedBankReference = bankReference.trim();
  const duplicate = method === "UPI" && cleanedUpi.length > 0 && paymentRows.some((payment) => payment.upiReference?.toLowerCase() === cleanedUpi.toLowerCase());
  const upiMissing = method === "UPI" && cleanedUpi.length === 0;
  const bankReferenceMissing = method === "Bank Transfer" && cleanedBankReference.length === 0;
  const paymentBlocked = saving || !selectedBooking || !Number.isFinite(amountValue) || amountValue <= 0 || duplicate || upiMissing || bankReferenceMissing;

  const paymentMethods: PaymentMethod[] = ["Cash", "UPI", "Bank Transfer", "Mixed Payment", "Refund", "Deposit Adjustment"];
  const transactionTypes: PaymentTransactionType[] = [
    "Rental Payment",
    "Advance Payment",
    "Balance Payment",
    "Security Deposit",
    "Late Fee",
    "Cleaning Charge",
    "Damage Charge",
    "Missing Item Charge",
    "Replacement Charge",
    "Refund",
    "Deposit Deduction",
    "Other"
  ];

  function selectBooking(id: string) {
    const nextBooking = bookingRows.find((booking) => booking.id === id);
    setSelectedBookingId(id);
    setSaveMessage("");
    setSaveError("");
    setLastSavedPayment(undefined);
    if (nextBooking) {
      const nextTotals = bookingTotals(nextBooking);
      setAmount(String(nextTotals.balanceDue || nextTotals.deposit || ""));
      setPaymentPurpose(nextTotals.balanceDue > 0 ? "Balance payment" : "Security deposit / settlement");
    }
  }

  function buildNumber(prefix: string) {
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    return `TC-${prefix}-${stamp}-${String(paymentRows.length + 1).padStart(3, "0")}`;
  }

  function shouldIncreaseReceived(type: PaymentTransactionType) {
    return !["Refund", "Deposit Deduction"].includes(type);
  }

  function getPaymentStatus(booking: Booking, nextTotalReceived: number): PaymentStatus {
    const balanceDue = Math.max(bookingTotals({ ...booking, totalReceived: nextTotalReceived }).balanceDue, 0);
    if (balanceDue === 0) return "Paid";
    if (nextTotalReceived > 0) return "Partially Paid";
    return "Unpaid";
  }

  async function savePayment() {
    setSaveMessage("");
    setSaveError("");
    if (!selectedBooking) return;
    if (paymentBlocked) {
      setSaveError("Select a booking, enter a valid amount, and complete the required reference fields.");
      return;
    }

    const now = new Date().toISOString();
    const paymentPayload: Omit<PaymentTransaction, "id" | "createdAt" | "updatedAt"> = {
      transactionId: buildNumber("TXN"),
      receiptNumber: buildNumber("RCPT"),
      bookingNumber: selectedBooking.bookingNumber,
      customerId: selectedBooking.customerId,
      customerName: selectedBooking.customerName,
      transactionDateTime: now,
      transactionType,
      amount: amountValue,
      paymentMethod: method,
      paymentPurpose: paymentPurpose.trim() || transactionType,
      upiReference: method === "UPI" ? cleanedUpi : undefined,
      bankReference: method === "Bank Transfer" ? cleanedBankReference : undefined,
      verificationStatus: "Pending Verification",
      notes: notes.trim() || undefined,
      recordedBy: "Counter Staff"
    };
    const receivedDelta = shouldIncreaseReceived(transactionType) ? amountValue : 0;
    const nextTotalReceived = selectedBooking.totalReceived + receivedDelta;
    const nextPaymentStatus = shouldIncreaseReceived(transactionType) ? getPaymentStatus(selectedBooking, nextTotalReceived) : selectedBooking.paymentStatus;

    setSaving(true);
    try {
      let savedId = `local-${Date.now()}`;
      if (firebaseConfigured) {
        savedId = await addPaymentTransaction(paymentPayload);
        if (receivedDelta > 0) {
          await updateBookingPaymentSummary(selectedBooking.id, nextTotalReceived, nextPaymentStatus);
        }
      }

      const savedPayment: PaymentTransaction = {
        ...paymentPayload,
        id: savedId,
        createdAt: now,
        updatedAt: now
      };
      setPaymentRows((rows) => [savedPayment, ...rows]);
      if (receivedDelta > 0) {
        setBookingRows((rows) =>
          rows.map((booking) =>
            booking.id === selectedBooking.id
              ? { ...booking, totalReceived: nextTotalReceived, paymentStatus: nextPaymentStatus, updatedAt: now }
              : booking
          )
        );
      }
      setLastSavedPayment(savedPayment);
      setSaveMessage(firebaseConfigured ? "Payment saved to Firestore as pending verification." : "Payment saved in this demo session.");
      setAmount("");
      setUpi("");
      setBankReference("");
      setNotes("");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Could not save this payment.");
    } finally {
      setSaving(false);
    }
  }

  async function updateVerification(paymentId: string, status: PaymentTransaction["verificationStatus"]) {
    const now = new Date().toISOString();
    setSaveError("");
    try {
      if (firebaseConfigured && !paymentId.startsWith("pay-") && !paymentId.startsWith("local-")) {
        await updatePaymentVerificationStatus(paymentId, status);
      }
      setPaymentRows((rows) =>
        rows.map((payment) =>
          payment.id === paymentId
            ? { ...payment, verificationStatus: status, updatedAt: now }
            : payment
        )
      );
      setSaveMessage(`Payment marked ${status}.`);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Could not update payment verification.");
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Payments"
        title="Record, verify, and receipt payments"
        description="Select a booking, record cash/UPI/bank payments, prevent duplicate UPI references, update balance, and keep each transaction pending until verified."
      />
      <div className="grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
        <Panel title="Record payment">
          <div className="grid gap-4">
            <SelectField label="Booking" value={selectedBooking?.id || ""} onChange={selectBooking} options={bookingRows.map((entry) => entry.id)} />
            {selectedBooking && totals && (
              <div className="rounded-md bg-cream p-3 text-sm font-semibold text-charcoal/75">
                <p>{selectedBooking.bookingNumber} - {selectedBooking.customerName}</p>
                <p>Received {formatCurrency(selectedBooking.totalReceived)} / Balance {formatCurrency(totals.balanceDue)}</p>
                <div className="mt-2"><StatusBadge status={selectedBooking.paymentStatus} /></div>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField label="Transaction type" value={transactionType} onChange={(value) => setTransactionType(value as PaymentTransactionType)} options={transactionTypes} />
              <SelectField label="Payment method" value={method} onChange={(value) => setMethod(value as PaymentMethod)} options={paymentMethods} />
            </div>
            <TextField label="Amount" value={amount} onChange={setAmount} type="number" />
            <TextField label="Payment purpose" value={paymentPurpose} onChange={setPaymentPurpose} placeholder="Advance, balance, security deposit, refund..." />
            {method === "UPI" && (
              <>
                <div className="grid place-items-center rounded-lg border border-dashed border-forest/25 bg-cream p-8 text-center">
                  <QrCode className="h-16 w-16 text-forest" />
                  <p className="mt-3 font-bold text-forest">{settings.upiId}</p>
                  <p className="text-sm text-charcoal/60">Collect screenshot and verify before marking paid.</p>
                </div>
                <TextField label="UPI reference number" value={upi} onChange={setUpi} />
                {upiMissing && <p className="rounded-md bg-amber-50 p-3 text-sm font-semibold text-amber-900">UPI reference is required.</p>}
                {duplicate && <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-800">Duplicate UPI reference number detected.</p>}
              </>
            )}
            {method === "Bank Transfer" && (
              <>
                <TextField label="Bank reference number" value={bankReference} onChange={setBankReference} />
                {bankReferenceMissing && <p className="rounded-md bg-amber-50 p-3 text-sm font-semibold text-amber-900">Bank reference is required.</p>}
              </>
            )}
            <TextAreaField label="Notes" value={notes} onChange={setNotes} placeholder="Screenshot checked, cash counted, customer confirmation..." />
            {saveMessage && <p className="rounded-md bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">{saveMessage}</p>}
            {saveError && <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-800">{saveError}</p>}
            <button
              type="button"
              onClick={savePayment}
              disabled={paymentBlocked}
              className="rounded-md bg-forest px-4 py-2 font-bold text-cream disabled:cursor-not-allowed disabled:bg-stone-300"
            >
              {saving ? "Saving..." : "Save pending verification"}
            </button>
          </div>
        </Panel>

        <Panel title="Latest receipt">
          {lastSavedPayment ? (
            <div className="grid gap-3 text-sm text-charcoal/75">
              <p className="text-lg font-bold text-forest">{lastSavedPayment.receiptNumber}</p>
              <p>{lastSavedPayment.customerName} - {lastSavedPayment.bookingNumber}</p>
              <p>{lastSavedPayment.paymentMethod} {lastSavedPayment.upiReference || lastSavedPayment.bankReference || ""}</p>
              <p className="text-2xl font-black text-forest">{formatCurrency(lastSavedPayment.amount)}</p>
              <StatusBadge status={lastSavedPayment.verificationStatus} />
              <button type="button" onClick={() => window.print()} className="inline-flex w-fit items-center gap-2 rounded-md border border-forest/20 px-4 py-2 font-bold text-forest">
                <Printer className="h-4 w-4" /> Print receipt
              </button>
            </div>
          ) : (
            <div className="rounded-md bg-cream p-4 text-sm font-semibold text-charcoal/65">
              Save a payment to generate the receipt summary here.
            </div>
          )}
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <ResponsiveTable
          title="Payment register"
          headers={["Receipt", "Booking", "Customer", "Type", "Method", "Amount", "Verification"]}
          rows={paymentRows.map((payment) => [
            payment.receiptNumber,
            payment.bookingNumber,
            payment.customerName,
            payment.transactionType,
            payment.paymentMethod,
            formatCurrency(payment.amount),
            <div key={payment.id} className="flex flex-wrap items-center gap-2">
              <StatusBadge status={payment.verificationStatus} />
              {payment.verificationStatus === "Pending Verification" && (
                <>
                  <button type="button" onClick={() => updateVerification(payment.id, "Verified")} className="rounded-md border border-emerald-200 px-2 py-1 text-xs font-bold text-emerald-800">Verify</button>
                  <button type="button" onClick={() => updateVerification(payment.id, "Rejected")} className="rounded-md border border-red-200 px-2 py-1 text-xs font-bold text-red-700">Reject</button>
                </>
              )}
            </div>
          ])}
        />
        <ResponsiveTable
          title="Booking balances"
          headers={["Booking", "Customer", "Received", "Balance", "Status"]}
          rows={bookingRows.map((booking) => {
            const bookingBalance = bookingTotals(booking).balanceDue;
            return [
              booking.bookingNumber,
              booking.customerName,
              formatCurrency(booking.totalReceived),
              formatCurrency(bookingBalance),
              <StatusBadge key={booking.id} status={booking.paymentStatus} />
            ];
          })}
        />
      </div>
    </div>
  );
}

export function DepositsPage() {
  const [bookingRows, setBookingRows] = useState(bookings);
  const [refundRows, setRefundRows] = useState(refunds);
  const [selectedBookingId, setSelectedBookingId] = useState(bookings[1]?.id || bookings[0]?.id || "");
  const [lateFees, setLateFees] = useState(String(bookings[1]?.lateFees ?? 0));
  const [cleaningCharges, setCleaningCharges] = useState(String(bookings[1]?.cleaningCharges ?? 0));
  const [damageCharges, setDamageCharges] = useState(String(bookings[1]?.damageCharges ?? 0));
  const [missingItemCharges, setMissingItemCharges] = useState(String(bookings[1]?.missingItemCharges ?? 0));
  const [refundMethod, setRefundMethod] = useState<PaymentMethod>("UPI");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedBooking = bookingRows.find((booking) => booking.id === selectedBookingId) || bookingRows[0];
  const depositTotal = selectedBooking ? bookingTotals(selectedBooking).deposit : 0;
  const numericLateFees = Math.max(Number(lateFees) || 0, 0);
  const numericCleaningCharges = Math.max(Number(cleaningCharges) || 0, 0);
  const numericDamageCharges = Math.max(Number(damageCharges) || 0, 0);
  const numericMissingItemCharges = Math.max(Number(missingItemCharges) || 0, 0);
  const deductions = numericLateFees + numericCleaningCharges + numericDamageCharges + numericMissingItemCharges;
  const refundableAmount = Math.max(depositTotal - deductions, 0);
  const deductionNeedsApproval = deductions > settings.refundApprovalLimit;
  const hasExistingRefund = selectedBooking ? refundRows.some((refund) => refund.bookingNumber === selectedBooking.bookingNumber && refund.status !== "Rejected") : false;

  function selectBooking(id: string) {
    const nextBooking = bookingRows.find((booking) => booking.id === id);
    setSelectedBookingId(id);
    setMessage("");
    setError("");
    if (nextBooking) {
      setLateFees(String(nextBooking.lateFees));
      setCleaningCharges(String(nextBooking.cleaningCharges));
      setDamageCharges(String(nextBooking.damageCharges));
      setMissingItemCharges(String(nextBooking.missingItemCharges));
    }
  }

  function getDepositStatus(nextDeductions: number, nextRefundable: number): DepositStatus {
    if (depositTotal <= 0) return "Not Received";
    if (nextDeductions >= depositTotal) return "Fully Deducted";
    if (nextDeductions > 0) return "Partially Deducted";
    if (nextRefundable > 0) return "Held";
    return "Not Received";
  }

  async function saveSettlement() {
    setMessage("");
    setError("");
    if (!selectedBooking) return;

    const depositStatus = getDepositStatus(deductions, refundableAmount);
    setSaving(true);
    try {
      if (firebaseConfigured && !selectedBooking.id.startsWith("booking-")) {
        await updateBookingDepositSettlement(selectedBooking.id, {
          lateFees: numericLateFees,
          cleaningCharges: numericCleaningCharges,
          damageCharges: numericDamageCharges,
          missingItemCharges: numericMissingItemCharges,
          refundableAmount,
          depositStatus
        });
      }

      setBookingRows((rows) =>
        rows.map((booking) =>
          booking.id === selectedBooking.id
            ? {
                ...booking,
                lateFees: numericLateFees,
                cleaningCharges: numericCleaningCharges,
                damageCharges: numericDamageCharges,
                missingItemCharges: numericMissingItemCharges,
                refundableAmount,
                depositStatus,
                updatedAt: new Date().toISOString()
              }
            : booking
        )
      );
      setMessage("Deposit settlement saved.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save deposit settlement.");
    } finally {
      setSaving(false);
    }
  }

  async function queueRefund() {
    setMessage("");
    setError("");
    if (!selectedBooking || refundableAmount <= 0 || hasExistingRefund) return;

    const nextRefund: Omit<Refund, "id"> = {
      bookingNumber: selectedBooking.bookingNumber,
      customerName: selectedBooking.customerName,
      amount: refundableAmount,
      method: refundMethod,
      status: refundableAmount > settings.refundApprovalLimit ? "Pending" : "Approved",
      approvedBy: refundableAmount > settings.refundApprovalLimit ? undefined : "Manager"
    };

    setSaving(true);
    try {
      let refundId = `local-refund-${Date.now()}`;
      if (firebaseConfigured) {
        refundId = await addRefundRecord(nextRefund);
      }
      setRefundRows((rows) => [{ ...nextRefund, id: refundId }, ...rows]);
      setMessage("Refund added to the queue.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not queue refund.");
    } finally {
      setSaving(false);
    }
  }

  async function changeRefundStatus(refund: Refund, status: Refund["status"]) {
    setMessage("");
    setError("");
    try {
      if (firebaseConfigured && !refund.id.startsWith("refund-") && !refund.id.startsWith("local-")) {
        await updateRefundStatus(refund.id, status, status === "Approved" || status === "Paid" ? "Manager" : refund.approvedBy);
      }

      setRefundRows((rows) =>
        rows.map((entry) =>
          entry.id === refund.id
            ? {
                ...entry,
                status,
                approvedBy: status === "Approved" || status === "Paid" ? "Manager" : entry.approvedBy,
                refundDate: status === "Paid" ? new Date().toISOString() : entry.refundDate
              }
            : entry
        )
      );

      if (status === "Paid") {
        setBookingRows((rows) =>
          rows.map((booking) =>
            booking.bookingNumber === refund.bookingNumber
              ? { ...booking, depositStatus: "Refunded", refundableAmount: 0, updatedAt: new Date().toISOString() }
              : booking
          )
        );
      }
      setMessage(`Refund marked ${status}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update refund status.");
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Security deposits"
        title="Settle deductions and refunds"
        description="Calculate deposit deductions, save refundable amounts, queue refunds, and mark refund approval/payment status."
      />
      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Panel title="Deposit settlement">
          <div className="grid gap-4">
            <SelectField label="Booking" value={selectedBooking?.id || ""} onChange={selectBooking} options={bookingRows.map((entry) => entry.id)} />
            {selectedBooking && (
              <div className="rounded-md bg-cream p-3 text-sm font-semibold text-charcoal/75">
                <p>{selectedBooking.bookingNumber} - {selectedBooking.customerName}</p>
                <p>Deposit held {formatCurrency(depositTotal)}</p>
                <div className="mt-2"><StatusBadge status={selectedBooking.depositStatus} /></div>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Late fees" value={lateFees} onChange={setLateFees} type="number" />
              <TextField label="Cleaning charges" value={cleaningCharges} onChange={setCleaningCharges} type="number" />
              <TextField label="Damage charges" value={damageCharges} onChange={setDamageCharges} type="number" />
              <TextField label="Missing item charges" value={missingItemCharges} onChange={setMissingItemCharges} type="number" />
            </div>
            <SelectField label="Refund method" value={refundMethod} onChange={(value) => setRefundMethod(value as PaymentMethod)} options={["Cash", "UPI", "Bank Transfer"]} />
            {deductionNeedsApproval && (
              <p className="rounded-md bg-amber-50 p-3 text-sm font-semibold text-amber-900">
                Deductions above {formatCurrency(settings.refundApprovalLimit)} should be checked by a manager.
              </p>
            )}
            {message && <p className="rounded-md bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">{message}</p>}
            {error && <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</p>}
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={saveSettlement} disabled={saving} className="rounded-md bg-forest px-4 py-2 font-bold text-cream disabled:cursor-not-allowed disabled:bg-stone-300">
                {saving ? "Saving..." : "Save settlement"}
              </button>
              <button
                type="button"
                onClick={queueRefund}
                disabled={saving || refundableAmount <= 0 || hasExistingRefund}
                className="rounded-md border border-forest/20 px-4 py-2 font-bold text-forest disabled:cursor-not-allowed disabled:opacity-50"
              >
                Queue refund
              </button>
            </div>
          </div>
        </Panel>

        <Panel title="Settlement summary">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md bg-cream p-4">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-charcoal/45">Deposit</p>
              <p className="mt-2 text-2xl font-black text-forest">{formatCurrency(depositTotal)}</p>
            </div>
            <div className="rounded-md bg-cream p-4">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-charcoal/45">Deductions</p>
              <p className="mt-2 text-2xl font-black text-red-800">{formatCurrency(deductions)}</p>
            </div>
            <div className="rounded-md bg-cream p-4">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-charcoal/45">Refundable</p>
              <p className="mt-2 text-2xl font-black text-forest">{formatCurrency(refundableAmount)}</p>
            </div>
            <div className="rounded-md bg-cream p-4">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-charcoal/45">Next status</p>
              <div className="mt-2"><StatusBadge status={getDepositStatus(deductions, refundableAmount)} /></div>
            </div>
          </div>
          {hasExistingRefund && (
            <p className="mt-4 rounded-md bg-amber-50 p-3 text-sm font-semibold text-amber-900">
              A refund is already queued for this booking.
            </p>
          )}
        </Panel>
      </div>
      <ResponsiveTable
        title="Deposit register"
        headers={["Booking", "Customer", "Deposit", "Deductions", "Refundable", "Status"]}
        rows={bookingRows.map((booking) => {
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
      <ResponsiveTable
        title="Refund queue"
        headers={["Booking", "Customer", "Amount", "Method", "Status", "Actions"]}
        rows={refundRows.map((refund) => [
          refund.bookingNumber,
          refund.customerName,
          formatCurrency(refund.amount),
          refund.method,
          <StatusBadge key={`${refund.id}-status`} status={refund.status} />,
          <div key={`${refund.id}-actions`} className="flex flex-wrap gap-2">
            {refund.status === "Pending" && (
              <>
                <button type="button" onClick={() => changeRefundStatus(refund, "Approved")} className="rounded-md border border-emerald-200 px-2 py-1 text-xs font-bold text-emerald-800">Approve</button>
                <button type="button" onClick={() => changeRefundStatus(refund, "Rejected")} className="rounded-md border border-red-200 px-2 py-1 text-xs font-bold text-red-700">Reject</button>
              </>
            )}
            {refund.status === "Approved" && (
              <button type="button" onClick={() => changeRefundStatus(refund, "Paid")} className="rounded-md border border-forest/20 px-2 py-1 text-xs font-bold text-forest">Mark paid</button>
            )}
          </div>
        ])}
      />
    </div>
  );
}

export function MaintenancePage() {
  const syncedItems = useSyncedInventoryItems();
  const [cleaningRows, setCleaningRows] = useState(cleaningRecords);
  const [repairRows, setRepairRows] = useState(repairRecords);
  const [itemStatuses, setItemStatuses] = useState<Record<string, DressStatus>>({});
  const [mode, setMode] = useState<"Cleaning" | "Repair">("Cleaning");
  const [selectedItemId, setSelectedItemId] = useState(inventoryItems[0]?.id || "");
  const [bookingNumber, setBookingNumber] = useState(bookings[0]?.bookingNumber || "");
  const [provider, setProvider] = useState("In-house");
  const [cost, setCost] = useState("0");
  const [expectedDate, setExpectedDate] = useState(todayDate());
  const [cleaningType, setCleaningType] = useState("Regular cleaning");
  const [stainDetails, setStainDetails] = useState("");
  const [damageType, setDamageType] = useState("Minor repair");
  const [damageDescription, setDamageDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedItem = syncedItems.find((item) => item.id === selectedItemId) || syncedItems[0] || inventoryItems[0];
  const amount = Math.max(Number(cost) || 0, 0);

  async function saveMaintenanceRecord() {
    setMessage("");
    setError("");
    if (!selectedItem) return;

    setSaving(true);
    try {
      if (mode === "Cleaning") {
        const record: Omit<CleaningRecord, "id"> = {
          dressId: selectedItem.dressId,
          bookingNumber: bookingNumber.trim() || undefined,
          cleaningType,
          provider,
          dateSent: todayDate(),
          expectedCompletionDate: expectedDate,
          cost: amount,
          stainDetails: stainDetails.trim() || undefined,
          notes: notes.trim() || undefined,
          status: "In Progress"
        };
        let id = `local-cleaning-${Date.now()}`;
        if (firebaseConfigured) id = await addCleaningRecord(record);
        setCleaningRows((rows) => [{ ...record, id }, ...rows]);
        setItemStatuses((statuses) => ({ ...statuses, [selectedItem.id]: "Cleaning" }));
      } else {
        const record: Omit<RepairRecord, "id"> = {
          dressId: selectedItem.dressId,
          damageType,
          damageDescription,
          responsibleBooking: bookingNumber.trim() || undefined,
          provider,
          estimatedCost: amount,
          dateSent: todayDate(),
          expectedCompletionDate: expectedDate,
          notes: notes.trim() || undefined,
          status: "Approved"
        };
        let id = `local-repair-${Date.now()}`;
        if (firebaseConfigured) id = await addRepairRecord(record);
        setRepairRows((rows) => [{ ...record, id }, ...rows]);
        setItemStatuses((statuses) => ({ ...statuses, [selectedItem.id]: "Repair" }));
      }
      setMessage(`${mode} record added for ${selectedItem.dressId}.`);
      setCost("0");
      setStainDetails("");
      setDamageDescription("");
      setNotes("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : `Could not add ${mode.toLowerCase()} record.`);
    } finally {
      setSaving(false);
    }
  }

  async function changeCleaningStatus(record: CleaningRecord, status: CleaningRecord["status"]) {
    try {
      if (firebaseConfigured && !record.id.startsWith("clean-") && !record.id.startsWith("local-")) {
        await updateCleaningRecordStatus(record.id, status);
      }
      setCleaningRows((rows) => rows.map((entry) => entry.id === record.id ? { ...entry, status, actualCompletionDate: status === "Completed" ? todayDate() : entry.actualCompletionDate } : entry));
      const item = syncedItems.find((entry) => entry.dressId === record.dressId);
      if (item && status === "Completed") setItemStatuses((statuses) => ({ ...statuses, [item.id]: "Available" }));
      setMessage(`${record.dressId} cleaning marked ${status}.`);
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update cleaning status.");
    }
  }

  async function changeRepairStatus(record: RepairRecord, status: RepairRecord["status"]) {
    try {
      if (firebaseConfigured && !record.id.startsWith("repair-") && !record.id.startsWith("local-")) {
        await updateRepairRecordStatus(record.id, status, record.actualCost || record.estimatedCost);
      }
      setRepairRows((rows) => rows.map((entry) => entry.id === record.id ? { ...entry, status, actualCost: entry.actualCost || entry.estimatedCost, actualCompletionDate: status === "Completed" ? todayDate() : entry.actualCompletionDate } : entry));
      const item = syncedItems.find((entry) => entry.dressId === record.dressId);
      if (item && status === "Completed") setItemStatuses((statuses) => ({ ...statuses, [item.id]: "Available" }));
      setMessage(`${record.dressId} repair marked ${status}.`);
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update repair status.");
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="Maintenance" title="Cleaning and repair workflow" description="Create cleaning/repair records, route items into maintenance, and mark them available after work is complete." />
      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Panel title="Add maintenance record">
          <div className="grid gap-4">
            <SelectField label="Type" value={mode} onChange={(value) => setMode(value as "Cleaning" | "Repair")} options={["Cleaning", "Repair"]} />
            <SelectField label="Dress" value={selectedItem?.id || ""} onChange={setSelectedItemId} options={syncedItems.map((item) => item.id)} />
            {selectedItem && (
              <div className="rounded-md bg-cream p-3 text-sm font-semibold text-charcoal/75">
                <p>{selectedItem.dressId} - {selectedItem.name}</p>
                <div className="mt-2"><StatusBadge status={itemStatuses[selectedItem.id] || selectedItem.currentStatus} /></div>
              </div>
            )}
            <TextField label="Related booking" value={bookingNumber} onChange={setBookingNumber} placeholder="Booking number" />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Provider" value={provider} onChange={setProvider} />
              <TextField label="Expected completion" value={expectedDate} onChange={setExpectedDate} type="date" />
              <TextField label="Cost / estimate" value={cost} onChange={setCost} type="number" />
            </div>
            {mode === "Cleaning" ? (
              <>
                <TextField label="Cleaning type" value={cleaningType} onChange={setCleaningType} />
                <TextAreaField label="Stain details" value={stainDetails} onChange={setStainDetails} />
              </>
            ) : (
              <>
                <TextField label="Damage type" value={damageType} onChange={setDamageType} />
                <TextAreaField label="Damage description" value={damageDescription} onChange={setDamageDescription} />
              </>
            )}
            <TextAreaField label="Notes" value={notes} onChange={setNotes} />
            {message && <p className="rounded-md bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">{message}</p>}
            {error && <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</p>}
            <button type="button" onClick={saveMaintenanceRecord} disabled={saving || !selectedItem || (mode === "Repair" && !damageDescription.trim())} className="rounded-md bg-forest px-4 py-2 font-bold text-cream disabled:cursor-not-allowed disabled:bg-stone-300">
              {saving ? "Saving..." : "Save maintenance record"}
            </button>
          </div>
        </Panel>
        <ResponsiveTable
          title="Current item statuses"
          headers={["Dress", "Name", "Location", "Status"]}
          rows={syncedItems.map((item) => [item.dressId, item.name, item.storageLocation, <StatusBadge key={item.id} status={itemStatuses[item.id] || item.currentStatus} />])}
        />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <ResponsiveTable
          title="Cleaning records"
          headers={["Dress", "Booking", "Provider", "Cost", "Due", "Status", "Actions"]}
          rows={cleaningRows.map((record) => [
            record.dressId,
            record.bookingNumber || "-",
            record.provider,
            formatCurrency(record.cost),
            record.expectedCompletionDate,
            <StatusBadge key={`${record.id}-status`} status={record.status} />,
            <div key={`${record.id}-actions`} className="flex flex-wrap gap-2">
              {cleaningStatuses.map((status) => (
                <button key={status} type="button" onClick={() => changeCleaningStatus(record, status)} disabled={record.status === status} className="rounded-md border border-forest/20 px-2 py-1 text-xs font-bold text-forest disabled:opacity-40">{status}</button>
              ))}
            </div>
          ])}
        />
        <ResponsiveTable
          title="Repair records"
          headers={["Dress", "Damage", "Provider", "Estimate", "Due", "Status", "Actions"]}
          rows={repairRows.map((record) => [
            record.dressId,
            record.damageType,
            record.provider,
            formatCurrency(record.estimatedCost),
            record.expectedCompletionDate,
            <StatusBadge key={`${record.id}-status`} status={record.status} />,
            <div key={`${record.id}-actions`} className="flex flex-wrap gap-2">
              {repairStatuses.map((status) => (
                <button key={status} type="button" onClick={() => changeRepairStatus(record, status)} disabled={record.status === status} className="rounded-md border border-forest/20 px-2 py-1 text-xs font-bold text-forest disabled:opacity-40">{status}</button>
              ))}
            </div>
          ])}
        />
      </div>
    </div>
  );
}

export function ExpensesPage() {
  const [expenseRows, setExpenseRows] = useState(expenses);
  const [category, setCategory] = useState(expenseCategories[0]);
  const [description, setDescription] = useState("");
  const [payee, setPayee] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("Cash");
  const [relatedDress, setRelatedDress] = useState("");
  const [relatedBooking, setRelatedBooking] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const totalExpenses = expenseRows.reduce((sum, expense) => sum + expense.amount, 0);
  const pendingApproval = expenseRows.filter((expense) => !expense.approvedBy).length;

  function buildExpenseId() {
    return `TC-EXP-${todayDate().replace(/-/g, "")}-${String(expenseRows.length + 1).padStart(3, "0")}`;
  }

  async function saveExpense() {
    setMessage("");
    setError("");
    const expenseAmount = Number(amount);
    if (!description.trim() || !payee.trim() || !Number.isFinite(expenseAmount) || expenseAmount <= 0) {
      setError("Enter description, payee, and a valid amount.");
      return;
    }

    const record: Omit<Expense, "id"> = {
      expenseId: buildExpenseId(),
      date: todayDate(),
      category,
      description,
      supplierOrPayee: payee,
      amount: expenseAmount,
      paymentMethod: method,
      relatedDress: relatedDress.trim() || undefined,
      relatedBooking: relatedBooking.trim() || undefined,
      enteredBy: "Manager",
      notes: notes.trim() || undefined
    };

    setSaving(true);
    try {
      let id = `local-expense-${Date.now()}`;
      if (firebaseConfigured) id = await addExpenseRecord(record);
      setExpenseRows((rows) => [{ ...record, id }, ...rows]);
      setMessage("Expense recorded.");
      setDescription("");
      setPayee("");
      setAmount("");
      setRelatedDress("");
      setRelatedBooking("");
      setNotes("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not record expense.");
    } finally {
      setSaving(false);
    }
  }

  async function approveExpense(expense: Expense) {
    try {
      if (firebaseConfigured && !expense.id.startsWith("exp-") && !expense.id.startsWith("local-")) {
        await updateExpenseApproval(expense.id, "Owner");
      }
      setExpenseRows((rows) => rows.map((entry) => entry.id === expense.id ? { ...entry, approvedBy: "Owner" } : entry));
      setMessage(`${expense.expenseId} approved.`);
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not approve expense.");
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="Expenses" title="Record and approve shop expenses" description="Track dress purchases, cleaning, repair, packaging, transport, rent, staff payments, marketing, software, and miscellaneous costs." />
      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Panel title="Add expense">
          <div className="grid gap-4">
            <SelectField label="Category" value={category} onChange={setCategory} options={expenseCategories} />
            <TextField label="Description" value={description} onChange={setDescription} />
            <TextField label="Supplier / payee" value={payee} onChange={setPayee} />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Amount" value={amount} onChange={setAmount} type="number" />
              <SelectField label="Payment method" value={method} onChange={(value) => setMethod(value as PaymentMethod)} options={paymentMethods} />
              <TextField label="Related dress" value={relatedDress} onChange={setRelatedDress} />
              <TextField label="Related booking" value={relatedBooking} onChange={setRelatedBooking} />
            </div>
            <TextAreaField label="Notes" value={notes} onChange={setNotes} />
            {message && <p className="rounded-md bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">{message}</p>}
            {error && <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</p>}
            <button type="button" onClick={saveExpense} disabled={saving} className="rounded-md bg-forest px-4 py-2 font-bold text-cream disabled:cursor-not-allowed disabled:bg-stone-300">
              {saving ? "Saving..." : "Save expense"}
            </button>
          </div>
        </Panel>
        <div className="grid gap-4 sm:grid-cols-2">
          <MetricCard title="Total expenses" value={formatCurrency(totalExpenses)} icon={BadgeIndianRupee} tone="gold" />
          <MetricCard title="Pending approval" value={String(pendingApproval)} icon={Shield} tone="red" />
        </div>
      </div>
      <ResponsiveTable
        title="Expense register"
        headers={["Expense", "Date", "Category", "Payee", "Method", "Amount", "Approved by", "Actions"]}
        rows={expenseRows.map((expense) => [
          expense.expenseId,
          expense.date,
          expense.category,
          expense.supplierOrPayee,
          expense.paymentMethod,
          formatCurrency(expense.amount),
          expense.approvedBy || "Pending",
          expense.approvedBy ? "-" : <button key={expense.id} type="button" onClick={() => approveExpense(expense)} className="rounded-md border border-forest/20 px-2 py-1 text-xs font-bold text-forest">Approve</button>
        ])}
      />
    </div>
  );
}

export function ReportsPage() {
  const syncedItems = useSyncedInventoryItems();
  const [reportType, setReportType] = useState("Payments");
  const [method, setMethod] = useState("All");
  const [from, setFrom] = useState("2026-07-01");
  const [to, setTo] = useState("2026-07-31");

  function inRange(value: string) {
    const day = value.slice(0, 10);
    return day >= from && day <= to;
  }

  const paymentRows = payments.filter((payment) => inRange(payment.transactionDateTime) && (method === "All" || payment.paymentMethod === method));
  const bookingRows = bookings.filter((booking) => inRange(booking.bookingDate));
  const expenseRows = expenses.filter((expense) => inRange(expense.date));
  const inventoryRows = syncedItems;
  const depositRows = bookings.filter((booking) => inRange(booking.bookingDate));
  const verifiedCollections = collectionSummary(paymentRows);
  const pendingBalances = bookingRows.reduce((sum, booking) => sum + bookingTotals(booking).balanceDue, 0);
  const expenseTotal = expenseRows.reduce((sum, expense) => sum + expense.amount, 0);
  const depositHeld = depositRows.reduce((sum, booking) => sum + bookingTotals(booking).deposit, 0);

  const table =
    reportType === "Bookings"
      ? {
          headers: ["Booking", "Customer", "Date", "Pickup", "Return", "Balance", "Status"],
          rows: bookingRows.map((booking) => [
            booking.bookingNumber,
            booking.customerName,
            booking.bookingDate,
            booking.pickupDateTime,
            booking.expectedReturnDateTime,
            formatCurrency(bookingTotals(booking).balanceDue),
            booking.bookingStatus
          ])
        }
      : reportType === "Expenses"
        ? {
            headers: ["Expense", "Date", "Category", "Payee", "Method", "Amount", "Approved"],
            rows: expenseRows.map((expense) => [
              expense.expenseId,
              expense.date,
              expense.category,
              expense.supplierOrPayee,
              expense.paymentMethod,
              formatCurrency(expense.amount),
              expense.approvedBy || "Pending"
            ])
          }
        : reportType === "Inventory"
          ? {
              headers: ["Dress", "Name", "Category", "Rent", "Deposit", "Location", "Status"],
              rows: inventoryRows.map((item) => [
                item.dressId,
                item.name,
                item.category,
                formatCurrency(item.rentalPrice),
                formatCurrency(item.securityDeposit),
                item.storageLocation,
                item.currentStatus
              ])
            }
          : reportType === "Deposits"
            ? {
                headers: ["Booking", "Customer", "Deposit", "Refundable", "Deposit Status"],
                rows: depositRows.map((booking) => [
                  booking.bookingNumber,
                  booking.customerName,
                  formatCurrency(bookingTotals(booking).deposit),
                  formatCurrency(booking.refundableAmount),
                  booking.depositStatus
                ])
              }
            : {
                headers: ["Receipt", "Booking", "Customer", "Date", "Method", "Amount", "Status"],
                rows: paymentRows.map((payment) => [
                  payment.receiptNumber,
                  payment.bookingNumber,
                  payment.customerName,
                  payment.transactionDateTime,
                  payment.paymentMethod,
                  formatCurrency(payment.amount),
                  payment.verificationStatus
                ])
              };

  const csv = [
    table.headers.join(","),
    ...table.rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
  ].join("\n");

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Reports"
        title="Filterable and printable reports"
        description="Daily collection, UPI/cash reports, bookings, active rentals, overdue, expected returns, pending balances, deposits, refunds, discounts, expenses, revenue, profit, dress-wise and staff-wise reports."
        action={
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-md border border-forest/20 px-4 py-2 font-bold text-forest"><Printer className="h-4 w-4" /> Print</button>
            <a href={`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`} download={`tc-${reportType.toLowerCase()}-report.csv`} className="inline-flex items-center gap-2 rounded-md bg-forest px-4 py-2 font-bold text-cream"><Download className="h-4 w-4" /> CSV</a>
          </div>
        }
      />
      <Panel title="Report filters">
        <div className="grid gap-4 sm:grid-cols-4">
          <SelectField label="Report" value={reportType} onChange={setReportType} options={["Payments", "Bookings", "Expenses", "Inventory", "Deposits"]} />
          <TextField label="From" value={from} onChange={setFrom} type="date" />
          <TextField label="To" value={to} onChange={setTo} type="date" />
          <SelectField label="Payment method" value={method} onChange={setMethod} options={["All", "Cash", "UPI", "Bank Transfer"]} />
        </div>
      </Panel>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Verified collection" value={formatCurrency(verifiedCollections.total)} icon={ReceiptText} tone="forest" />
        <MetricCard title="Pending balances" value={formatCurrency(pendingBalances)} icon={AlertTriangle} tone="red" />
        <MetricCard title="Expenses" value={formatCurrency(expenseTotal)} icon={BadgeIndianRupee} tone="gold" />
        <MetricCard title="Deposits held" value={formatCurrency(depositHeld)} icon={Shield} tone="blue" />
      </div>
      <ResponsiveTable
        title={`${settings.shopName} - ${reportType} report`}
        headers={table.headers}
        rows={table.rows}
      />
    </div>
  );
}

export function StaffRolesPage() {
  const [email, setEmail] = useState("twigscollective@gmail.com");
  const [role, setRole] = useState<StaffRole>("owner");
  const [assignments, setAssignments] = useState<{ email: string; role: StaffRole; status: string }[]>([]);
  const [message, setMessage] = useState("");
  const checks = ["inventory:write", "customers:write", "bookings:write", "payments:write", "payments:verify", "refunds:approve", "reports:view", "expenses:write", "staff:manage", "settings:manage", "audit:view", "sensitive-id:view"] as const;
  const adminClaimSnippet = `await admin.auth().setCustomUserClaims(user.uid, { role: "${role}" });`;

  function stageAssignment() {
    if (!email.includes("@")) {
      setMessage("Enter a valid staff email.");
      return;
    }
    setAssignments((rows) => [{ email, role, status: "Ready for Firebase custom claim" }, ...rows]);
    setMessage(`${email} staged as ${roleLabel(role)}.`);
  }

  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="Roles" title="Staff permissions" description="Privileged roles should be assigned through Firebase custom claims or secure server-side role management. Clients cannot elevate their own access." />
      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Panel title="Stage staff role">
          <div className="grid gap-4">
            <TextField label="Staff email" value={email} onChange={setEmail} />
            <SelectField label="Role" value={role} onChange={(value) => setRole(value as StaffRole)} options={staffRoles} />
            <div className="rounded-md bg-cream p-3 text-sm font-semibold text-charcoal/70">
              <p>Firebase Admin custom claim:</p>
              <code className="mt-2 block rounded bg-white p-2 text-xs text-forest">{adminClaimSnippet}</code>
            </div>
            {message && <p className="rounded-md bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">{message}</p>}
            <button type="button" onClick={stageAssignment} className="inline-flex items-center justify-center gap-2 rounded-md bg-forest px-4 py-2 font-bold text-cream">
              <UserPlus className="h-4 w-4" /> Stage role
            </button>
          </div>
        </Panel>
        <ResponsiveTable
          title="Role assignment queue"
          headers={["Email", "Role", "Status"]}
          rows={assignments.map((assignment) => [assignment.email, roleLabel(assignment.role), assignment.status])}
        />
      </div>
      <div className="overflow-hidden rounded-lg border border-forest/10 bg-white shadow-soft">
        <div className="grid gap-3 p-3 md:hidden">
          {staffRoles.map((role) => (
            <article key={role} className="rounded-md border border-forest/10 p-3">
              <h2 className="font-bold text-forest">{roleLabel(role)}</h2>
              <div className="mt-3 grid gap-2">
                {checks.map((check) => (
                  <div key={check} className="flex items-center justify-between gap-3 rounded-md bg-cream px-3 py-2 text-sm">
                    <span className="min-w-0 break-words font-semibold text-charcoal/70">{check}</span>
                    <span className="shrink-0 font-bold text-forest">{can(role, check) ? "Yes" : "No"}</span>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
        <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-cream text-charcoal/60">
            <tr>
              <th className="p-3">Role</th>
              {checks.map((check) => <th key={check} className="p-3">{check}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-forest/10">
            {staffRoles.map((role) => (
              <tr key={role}>
                <td className="p-3 font-bold text-forest">{roleLabel(role)}</td>
                {checks.map((check) => <td key={check} className="p-3">{can(role, check) ? "Yes" : "No"}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}

export function SettingsPage() {
  const [form, setForm] = useState<ShopSettings>(settings);
  const [phones, setPhones] = useState(settings.phones.join(", "));
  const [terms, setTerms] = useState(settings.terms.join("\n"));
  const [templates, setTemplates] = useState(Object.entries(settings.notificationTemplates).map(([key, value]) => `${key}: ${value}`).join("\n"));
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function updateSetting<K extends keyof ShopSettings>(key: K, value: ShopSettings[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function parseTemplates() {
    return Object.fromEntries(
      templates
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [key, ...rest] = line.split(":");
          return [key.trim(), rest.join(":").trim()];
        })
    );
  }

  async function saveSettings() {
    setMessage("");
    setError("");
    const nextSettings: ShopSettings = {
      ...form,
      phones: phones.split(",").map((phone) => phone.trim()).filter(Boolean),
      terms: terms.split("\n").map((term) => term.trim()).filter(Boolean),
      notificationTemplates: parseTemplates()
    };
    setSaving(true);
    try {
      if (firebaseConfigured) await saveShopSettings(nextSettings);
      setForm(nextSettings);
      setMessage(firebaseConfigured ? "Settings saved to Firestore." : "Settings saved in this session.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="Settings" title="Configurable shop rules" description="Shop identity, UPI, receipt prefixes, booking prefixes, inventory prefixes, default duration, buffer, fees, approval limits, opening hours, terms, templates, and backup preferences." />
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Shop details">
          <div className="grid gap-4">
            <TextField label="Shop name" value={form.shopName} onChange={(value) => updateSetting("shopName", value)} />
            <TextAreaField label="Address" value={form.address} onChange={(value) => updateSetting("address", value)} />
            <TextField label="Phones" value={phones} onChange={setPhones} />
            <TextField label="WhatsApp number" value={form.whatsappNumber} onChange={(value) => updateSetting("whatsappNumber", value)} />
            <TextField label="Email" value={form.email} onChange={(value) => updateSetting("email", value)} />
            <TextField label="UPI ID" value={form.upiId} onChange={(value) => updateSetting("upiId", value)} />
            <TextField label="Opening hours" value={form.openingHours} onChange={(value) => updateSetting("openingHours", value)} />
          </div>
        </Panel>
        <Panel title="Rules and templates">
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Default rental duration" value={String(form.defaultRentalDuration)} onChange={(value) => updateSetting("defaultRentalDuration", Number(value) || 1)} type="number" />
              <TextField label="Preparation buffer hours" value={String(form.preparationBufferHours)} onChange={(value) => updateSetting("preparationBufferHours", Number(value) || 0)} type="number" />
              <TextField label="Late fee per day" value={String(form.lateFeePerDay)} onChange={(value) => updateSetting("lateFeePerDay", Number(value) || 0)} type="number" />
              <TextField label="Refund approval limit" value={String(form.refundApprovalLimit)} onChange={(value) => updateSetting("refundApprovalLimit", Number(value) || 0)} type="number" />
              <TextField label="Receipt prefix" value={form.receiptPrefix} onChange={(value) => updateSetting("receiptPrefix", value)} />
              <TextField label="Booking prefix" value={form.bookingPrefix} onChange={(value) => updateSetting("bookingPrefix", value)} />
              <TextField label="Inventory prefix" value={form.inventoryPrefix} onChange={(value) => updateSetting("inventoryPrefix", value)} />
              <TextField label="Currency" value={form.currency} onChange={(value) => updateSetting("currency", value)} />
            </div>
            <TextAreaField label="Terms" value={terms} onChange={setTerms} />
            <TextAreaField label="Notification templates" value={templates} onChange={setTemplates} />
            {message && <p className="rounded-md bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">{message}</p>}
            {error && <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</p>}
            <button type="button" onClick={saveSettings} disabled={saving} className="rounded-md bg-forest px-4 py-2 font-bold text-cream disabled:cursor-not-allowed disabled:bg-stone-300">
              {saving ? "Saving..." : "Save settings"}
            </button>
          </div>
        </Panel>
      </div>
    </div>
  );
}

export function AuditLogsPage() {
  const [logRows, setLogRows] = useState(auditLogs);
  const [query, setQuery] = useState("");
  const [moduleFilter, setModuleFilter] = useState("All");
  const [user, setUser] = useState("Manager");
  const [role, setRole] = useState<StaffRole>("manager");
  const [action, setAction] = useState("");
  const [moduleName, setModuleName] = useState("Inventory");
  const [recordId, setRecordId] = useState("");
  const [previousValue, setPreviousValue] = useState("");
  const [newValue, setNewValue] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const moduleOptions = ["All", ...Array.from(new Set(logRows.map((log) => log.module)))];
  const filteredLogs = logRows.filter((log) => {
    const text = [log.user, log.action, log.module, log.recordId, log.previousValue, log.newValue].join(" ").toLowerCase();
    return (moduleFilter === "All" || log.module === moduleFilter) && text.includes(query.toLowerCase());
  });

  async function addLog() {
    setMessage("");
    setError("");
    if (!action.trim() || !recordId.trim()) {
      setError("Enter action and record ID.");
      return;
    }
    const nextLog: Omit<AuditLog, "id"> = {
      user,
      role,
      action,
      module: moduleName,
      recordId,
      previousValue: previousValue.trim() || undefined,
      newValue: newValue.trim() || undefined,
      timestamp: new Date().toISOString(),
      session: "web"
    };
    try {
      let id = `local-audit-${Date.now()}`;
      if (firebaseConfigured) id = await addAuditLogRecord(nextLog);
      setLogRows((rows) => [{ ...nextLog, id }, ...rows]);
      setAction("");
      setRecordId("");
      setPreviousValue("");
      setNewValue("");
      setMessage("Audit log added.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not add audit log.");
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="Audit logs" title="Protected activity trail" description="Important changes are recorded with user, role, action, module, record, previous/new values, timestamp, and session details. Ordinary staff cannot edit audit logs." />
      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Panel title="Add audit entry">
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="User" value={user} onChange={setUser} />
              <SelectField label="Role" value={role} onChange={(value) => setRole(value as StaffRole)} options={staffRoles} />
              <TextField label="Action" value={action} onChange={setAction} />
              <TextField label="Module" value={moduleName} onChange={setModuleName} />
              <TextField label="Record ID" value={recordId} onChange={setRecordId} />
            </div>
            <TextAreaField label="Previous value" value={previousValue} onChange={setPreviousValue} />
            <TextAreaField label="New value" value={newValue} onChange={setNewValue} />
            {message && <p className="rounded-md bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">{message}</p>}
            {error && <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</p>}
            <button type="button" onClick={addLog} className="rounded-md bg-forest px-4 py-2 font-bold text-cream">Add audit log</button>
          </div>
        </Panel>
        <Panel title="Audit filters">
          <div className="grid gap-4">
            <TextField label="Search" value={query} onChange={setQuery} placeholder="User, action, record..." />
            <SelectField label="Module" value={moduleFilter} onChange={setModuleFilter} options={moduleOptions} />
            <p className="rounded-md bg-cream p-3 text-sm font-semibold text-charcoal/70">{filteredLogs.length} matching logs</p>
          </div>
        </Panel>
      </div>
      <ResponsiveTable
        title="Audit log"
        headers={["Time", "User", "Role", "Action", "Module", "Record", "Previous", "New"]}
        rows={filteredLogs.map((log) => [log.timestamp, log.user, roleLabel(log.role), log.action, log.module, log.recordId, log.previousValue || "-", log.newValue || "-"])}
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
      <div className="grid gap-3 p-3 md:hidden">
        {rows.length === 0 ? (
          <p className="rounded-md bg-cream p-3 text-sm font-semibold text-charcoal/60">No records match this view.</p>
        ) : (
          rows.map((row, rowIndex) => (
            <article key={rowIndex} className="rounded-md border border-forest/10 bg-white p-3">
              {row.map((cell, cellIndex) => (
                <div key={`${rowIndex}-${cellIndex}`} className="grid gap-1 border-b border-forest/10 py-2 last:border-b-0">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-charcoal/45">{headers[cellIndex]}</p>
                  <div className="min-w-0 break-words text-sm font-semibold text-charcoal/75">{cell}</div>
                </div>
              ))}
            </article>
          ))
        )}
      </div>
      <div className="hidden overflow-x-auto md:block">
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
