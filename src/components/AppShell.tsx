import {
  BarChart3,
  Bell,
  BookOpenCheck,
  CalendarDays,
  CircleDollarSign,
  ClipboardCheck,
  FileText,
  Home,
  LogOut,
  Menu,
  Package,
  ReceiptText,
  Settings,
  Shield,
  Sparkles,
  Users,
  Wrench,
  X
} from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Logo } from "./Logo";
import { NetworkIndicator } from "./NetworkIndicator";

const publicLinks = [
  { to: "/", label: "Home" },
  { to: "/browse", label: "Browse" },
  { to: "/categories", label: "Categories" },
  { to: "/rules", label: "Rules" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" }
];

const adminLinks = [
  { to: "/dashboard", label: "Dashboard", icon: Home },
  { to: "/inventory", label: "Inventory", icon: Package },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/bookings", label: "Bookings", icon: CalendarDays },
  { to: "/pickup", label: "Pickup", icon: BookOpenCheck },
  { to: "/returns", label: "Returns", icon: ClipboardCheck },
  { to: "/payments", label: "Payments", icon: CircleDollarSign },
  { to: "/deposits", label: "Deposits", icon: ReceiptText },
  { to: "/maintenance", label: "Cleaning/Repair", icon: Wrench },
  { to: "/expenses", label: "Expenses", icon: FileText },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/staff", label: "Staff/Roles", icon: Shield },
  { to: "/settings", label: "Settings", icon: Settings },
  { to: "/audit-logs", label: "Audit Logs", icon: Bell }
];

function navClass({ isActive }: { isActive: boolean }) {
  return `rounded-md px-3 py-2 text-sm font-semibold transition ${isActive ? "bg-forest text-cream" : "text-charcoal/75 hover:bg-forest/10 hover:text-forest"}`;
}

function adminNavClass({ isActive }: { isActive: boolean }) {
  return `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold transition ${isActive ? "bg-forest text-cream" : "text-charcoal/75 hover:bg-forest/10 hover:text-forest"}`;
}

export function PublicShell() {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-forest/10 bg-cream/90 backdrop-blur no-print">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex">
            {publicLinks.map((link) => (
              <NavLink key={link.to} to={link.to} className={navClass}>
                {link.label}
              </NavLink>
            ))}
            <NavLink to="/login" className="ml-2 rounded-md border border-forest/20 px-4 py-2 text-sm font-bold text-forest hover:bg-forest/5">
              Staff Login
            </NavLink>
          </nav>
          <button
            className="grid h-10 w-10 place-items-center rounded-md border border-forest/15 text-forest md:hidden"
            onClick={() => setOpen((value) => !value)}
            aria-label="Toggle navigation"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {open && (
          <nav className="mx-auto grid max-w-7xl gap-1 px-4 pb-4 md:hidden">
            {publicLinks.map((link) => (
              <NavLink key={link.to} to={link.to} className={navClass} onClick={() => setOpen(false)}>
                {link.label}
              </NavLink>
            ))}
            <NavLink to="/login" className={navClass} onClick={() => setOpen(false)}>
              Staff Login
            </NavLink>
          </nav>
        )}
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}

export function AdminShell() {
  const [open, setOpen] = useState(false);
  const { logout, user } = useAuth();

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[17rem_1fr]">
      <aside className="sticky top-0 z-40 border-b border-forest/10 bg-cream/95 px-4 py-4 backdrop-blur lg:h-screen lg:border-b-0 lg:border-r lg:px-5">
        <div className="flex items-center justify-between lg:block">
          <Logo />
          <button
            className="grid h-10 w-10 place-items-center rounded-md border border-forest/15 text-forest lg:hidden"
            onClick={() => setOpen((value) => !value)}
            aria-label="Toggle dashboard navigation"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        <nav className={`${open ? "grid" : "hidden"} mt-5 gap-1 lg:grid`}>
          {adminLinks.map((link) => (
            <NavLink key={link.to} to={link.to} className={adminNavClass} onClick={() => setOpen(false)}>
              <link.icon className="h-4 w-4" />
              {link.label}
            </NavLink>
          ))}
          <button
            className="flex items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-semibold text-charcoal/75 transition hover:bg-forest/10 hover:text-forest"
            onClick={logout}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </nav>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-forest/10 bg-cream/90 px-4 py-3 backdrop-blur sm:px-6 lg:px-8 no-print">
          <div className="flex items-center gap-3 text-sm font-semibold text-charcoal/70">
            <Sparkles className="h-4 w-4 text-gold" />
            {user?.email || "Staff session"}
          </div>
          <NetworkIndicator />
        </header>
        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
        <nav className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-5 border-t border-forest/10 bg-cream/95 p-2 shadow-soft lg:hidden no-print">
          {adminLinks.slice(0, 5).map((link) => (
            <NavLink key={link.to} to={link.to} className="grid place-items-center gap-1 rounded-md px-1 py-2 text-[11px] font-semibold text-charcoal/70 aria-[current=page]:bg-forest aria-[current=page]:text-cream">
              <link.icon className="h-4 w-4" />
              {link.label.split("/")[0]}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
