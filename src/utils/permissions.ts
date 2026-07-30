import type { StaffRole } from "../types";

export type Permission =
  | "inventory:write"
  | "customers:write"
  | "bookings:write"
  | "payments:write"
  | "payments:verify"
  | "refunds:approve"
  | "reports:view"
  | "expenses:write"
  | "staff:manage"
  | "settings:manage"
  | "audit:view"
  | "sensitive-id:view";

const permissions: Record<StaffRole, Permission[]> = {
  owner: [
    "inventory:write",
    "customers:write",
    "bookings:write",
    "payments:write",
    "payments:verify",
    "refunds:approve",
    "reports:view",
    "expenses:write",
    "staff:manage",
    "settings:manage",
    "audit:view",
    "sensitive-id:view"
  ],
  manager: [
    "inventory:write",
    "customers:write",
    "bookings:write",
    "payments:write",
    "payments:verify",
    "refunds:approve",
    "reports:view",
    "expenses:write",
    "audit:view",
    "sensitive-id:view"
  ],
  counter: ["customers:write", "bookings:write", "payments:write"],
  inventory: ["inventory:write"],
  accountant: ["payments:verify", "reports:view", "audit:view"],
  customer: []
};

export function can(role: StaffRole, permission: Permission) {
  return permissions[role].includes(permission);
}

export function roleLabel(role: StaffRole) {
  return {
    owner: "Owner/Admin",
    manager: "Manager",
    counter: "Counter Staff",
    inventory: "Inventory Staff",
    accountant: "Accountant/Viewer",
    customer: "Customer"
  }[role];
}
