import { CalendarCheck, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import type { Booking, InventoryItem } from "../types";
import { publicAvailability } from "../utils/availability";
import { formatCurrency } from "../utils/calculations";
import { StatusBadge } from "./StatusBadge";

export function DressCard({ item, bookings }: { item: InventoryItem; bookings: Booking[] }) {
  const availability = publicAvailability(item, bookings);

  return (
    <article className="group overflow-hidden rounded-lg border border-forest/10 bg-white shadow-soft transition duration-200 hover:-translate-y-1">
      <div className="aspect-[4/5] overflow-hidden bg-stone-100">
        <img
          src={item.featuredImage}
          alt={item.name}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          loading="lazy"
        />
      </div>
      <div className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold">{item.category}</p>
            <h3 className="mt-1 text-lg font-bold text-charcoal">{item.name}</h3>
          </div>
          <StatusBadge status={availability} />
        </div>
        <dl className="grid grid-cols-2 gap-3 text-sm text-charcoal/75">
          <div>
            <dt className="font-semibold text-charcoal">Age</dt>
            <dd>{item.ageGroup}</dd>
          </div>
          <div>
            <dt className="font-semibold text-charcoal">Size</dt>
            <dd>{item.size}</dd>
          </div>
          <div>
            <dt className="font-semibold text-charcoal">Colour</dt>
            <dd>{item.colour}</dd>
          </div>
          <div>
            <dt className="font-semibold text-charcoal">Rent</dt>
            <dd>{formatCurrency(item.rentalPrice)}</dd>
          </div>
        </dl>
        <div className="grid grid-cols-2 gap-2">
          <Link
            to={`/dresses/${item.id}`}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-forest px-3 py-2 text-sm font-semibold text-cream transition hover:bg-leaf"
          >
            <CalendarCheck className="h-4 w-4" />
            Details
          </Link>
          <Link
            to={`/booking-request?item=${item.id}`}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-forest/20 px-3 py-2 text-sm font-semibold text-forest transition hover:border-forest hover:bg-forest/5"
          >
            <MessageCircle className="h-4 w-4" />
            Reserve
          </Link>
        </div>
      </div>
    </article>
  );
}
