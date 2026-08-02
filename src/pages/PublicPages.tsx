import {
  ArrowRight,
  CalendarCheck,
  Clock,
  Filter,
  MapPin,
  MessageCircle,
  Phone,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { DressCard } from "../components/DressCard";
import { SelectField, TextAreaField, TextField } from "../components/FormControls";
import { SectionHeader } from "../components/SectionHeader";
import { StatusBadge } from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";
import { bookings, categories, inventoryItems, settings } from "../data/sampleData";
import { listPublicInventoryItems } from "../services/repositories";
import { publicAvailability, similarAvailableItems } from "../utils/availability";
import { formatCurrency } from "../utils/calculations";
import { fallbackDressImage } from "../utils/media";

function usePublicInventoryItems() {
  const [items, setItems] = useState(inventoryItems);

  useEffect(() => {
    let active = true;
    listPublicInventoryItems(inventoryItems)
      .then((rows) => {
        if (active && rows.length) setItems(rows);
      })
      .catch((error: unknown) => {
        console.warn("Public inventory sync failed", error);
      });
    return () => {
      active = false;
    };
  }, []);

  return items;
}

export function HomePage() {
  const syncedItems = usePublicInventoryItems();
  const featured = syncedItems
    .filter((item) => item.publicVisible && !item.archived)
    .sort((first, second) => new Date(second.updatedAt || second.createdAt).getTime() - new Date(first.updatedAt || first.createdAt).getTime())
    .slice(0, 3);

  return (
    <>
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_0.9fr] lg:px-8 lg:py-16">
          <div className="flex flex-col justify-center">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-gold">Dress for Every Occasion</p>
            <h1 className="mt-4 break-words font-display text-4xl font-bold leading-tight text-forest sm:text-6xl">
              Twigs Collective
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-charcoal/75">
              Explore cultural attire, school programme costumes, princess gowns, professional outfits, dance costumes,
              accessories, and props with simple reservations and trusted shop support.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/browse" className="inline-flex items-center justify-center gap-2 rounded-md bg-forest px-5 py-3 font-bold text-cream transition hover:bg-leaf">
                Browse dresses <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href={`https://wa.me/${settings.whatsappNumber}`}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-forest/20 px-5 py-3 font-bold text-forest transition hover:bg-forest/5"
              >
                <MessageCircle className="h-4 w-4" /> WhatsApp enquiry
              </a>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {featured.map((item, index) => (
              <img
                key={item.id}
                src={item.featuredImage || fallbackDressImage}
                alt={item.name}
                className={`h-full min-h-64 rounded-lg object-cover shadow-soft ${index === 0 ? "sm:col-span-2 aspect-[16/9]" : "aspect-[4/5]"}`}
                onError={(event) => {
                  event.currentTarget.src = fallbackDressImage;
                }}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <SectionHeader eyebrow="Featured" title="Popular rentals" description="Customer-ready photographs, prices, sizes, and public availability without exposing exact stock counts." />
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((item) => (
            <DressCard key={item.id} item={item} bookings={bookings} />
          ))}
        </div>
      </section>

      <section className="bg-white/70 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeader eyebrow="Categories" title="Costumes for every programme" />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {categories.slice(0, 4).map((category) => (
              <Link key={category.id} to={`/browse?category=${encodeURIComponent(category.name)}`} className="rounded-lg border border-forest/10 bg-cream p-5 shadow-soft transition hover:-translate-y-1">
                <Sparkles className="h-6 w-6 text-gold" />
                <h3 className="mt-4 text-lg font-bold text-forest">{category.name}</h3>
                <p className="mt-2 text-sm leading-6 text-charcoal/70">{category.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-12 sm:px-6 lg:grid-cols-3 lg:px-8">
        {[
          ["Choose", "Search by occasion, category, character, age, size, colour, or date."],
          ["Request", "Send a reservation request. It stays Pending Approval until authorised staff confirms it."],
          ["Pickup", "Staff verify payment, ID, dress condition, accessories, and receipt before issue."]
        ].map(([title, body]) => (
          <div key={title} className="rounded-lg border border-forest/10 bg-white p-6 shadow-soft">
            <h3 className="text-xl font-bold text-forest">{title}</h3>
            <p className="mt-3 text-charcoal/70">{body}</p>
          </div>
        ))}
      </section>

      <Footer />
    </>
  );
}

export function BrowseDressesPage() {
  const syncedItems = usePublicInventoryItems();
  const [params] = useSearchParams();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(params.get("category") || "All");
  const [size, setSize] = useState("All");
  const [ageGroup, setAgeGroup] = useState("All");
  const [colour, setColour] = useState("All");
  const [date, setDate] = useState("");
  const sizes = useMemo(() => ["All", ...Array.from(new Set(syncedItems.map((item) => item.size)))], [syncedItems]);
  const ageGroups = useMemo(() => ["All", ...Array.from(new Set(syncedItems.map((item) => item.ageGroup)))], [syncedItems]);
  const colours = useMemo(() => ["All", ...Array.from(new Set(syncedItems.map((item) => item.colour)))], [syncedItems]);

  const filtered = useMemo(() => {
    const searchValue = search.trim().toLowerCase();
    return syncedItems
      .filter((item) => item.publicVisible && !item.archived)
      .filter((item) => category === "All" || item.category === category)
      .filter((item) => size === "All" || item.size === size)
      .filter((item) => ageGroup === "All" || item.ageGroup === ageGroup)
      .filter((item) => colour === "All" || item.colour === colour)
      .filter((item) => {
        if (!date) return true;
        return publicAvailability(item, bookings, `${date}T10:00:00`, `${date}T18:00:00`, settings.preparationBufferHours) !== "Reserved";
      })
      .filter((item) => {
        if (!searchValue) return true;
        return [item.name, item.dressId, item.character, item.subcategory, item.category, item.colour]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(searchValue));
      });
  }, [ageGroup, category, colour, date, search, size, syncedItems]);

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Catalogue"
        title="Browse dresses"
        description="Search the public catalogue by dress name, ID, character, costume type, category, colour, date, age, size, and occasion."
      />
      <div className="mt-8 rounded-lg border border-forest/10 bg-white p-4 shadow-soft">
        <div className="grid gap-4 lg:grid-cols-[1.4fr_repeat(5,1fr)]">
          <label className="relative grid gap-1.5 text-sm font-semibold text-charcoal">
            Search
            <Search className="pointer-events-none absolute bottom-2.5 left-3 h-4 w-4 text-charcoal/40" />
            <input
              className="rounded-md border border-forest/15 bg-white py-2 pl-9 pr-3 outline-none focus:border-forest focus:ring-4 focus:ring-forest/10"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Name, ID, character, colour"
            />
          </label>
          <SelectField label="Category" value={category} onChange={setCategory} options={["All", ...categories.map((entry) => entry.name)]} />
          <SelectField label="Size" value={size} onChange={setSize} options={sizes} />
          <SelectField label="Age" value={ageGroup} onChange={setAgeGroup} options={ageGroups} />
          <SelectField label="Colour" value={colour} onChange={setColour} options={colours} />
          <TextField label="Availability date" value={date} onChange={setDate} type="date" />
        </div>
      </div>
      <div className="mt-8 flex items-center gap-2 text-sm font-semibold text-charcoal/60">
        <Filter className="h-4 w-4" />
        {filtered.length} matching public catalogue items
      </div>
      <div className="mt-5 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((item) => (
          <DressCard key={item.id} item={item} bookings={bookings} />
        ))}
      </div>
    </section>
  );
}

export function CategoriesPage() {
  const syncedItems = usePublicInventoryItems();

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <SectionHeader eyebrow="Dress categories" title="Choose by occasion" />
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => {
          const count = syncedItems.filter((item) => item.category === category.name && item.publicVisible).length;
          return (
            <Link key={category.id} to={`/browse?category=${encodeURIComponent(category.name)}`} className="rounded-lg border border-forest/10 bg-white p-6 shadow-soft transition hover:-translate-y-1">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-gold">{category.code}</p>
              <h2 className="mt-2 text-2xl font-bold text-forest">{category.name}</h2>
              <p className="mt-3 text-charcoal/70">{category.description}</p>
              <p className="mt-5 text-sm font-semibold text-charcoal/60">{count} visible sample items</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export function DressDetailsPage() {
  const syncedItems = usePublicInventoryItems();
  const { id } = useParams();
  const item = syncedItems.find((entry) => entry.id === id) || syncedItems[0] || inventoryItems[0];
  const [pickup, setPickup] = useState("2026-07-25T10:00");
  const [returnAt, setReturnAt] = useState("2026-07-27T18:00");
  const availability = publicAvailability(item, bookings, pickup, returnAt, settings.preparationBufferHours);
  const suggestions = similarAvailableItems(item, syncedItems, bookings, pickup, returnAt);

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-[0.95fr_1fr]">
        <div className="grid gap-4">
          <img src={item.featuredImage || fallbackDressImage} alt={item.name} className="aspect-[4/5] w-full rounded-lg object-cover shadow-soft" onError={(event) => { event.currentTarget.src = fallbackDressImage; }} />
          <div className="grid grid-cols-3 gap-3">
            {item.images.map((imageUrl) => (
              <img key={imageUrl} src={imageUrl || fallbackDressImage} alt={`${item.name} view`} className="aspect-square rounded-md object-cover" onError={(event) => { event.currentTarget.src = fallbackDressImage; }} />
            ))}
          </div>
          {item.shortVideo && (
            <video
              src={item.shortVideo}
              className="aspect-video w-full rounded-lg bg-black object-contain shadow-soft"
              controls
              playsInline
              preload="metadata"
            />
          )}
        </div>
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-gold">{item.dressId}</p>
          <h1 className="mt-2 break-words font-display text-3xl font-bold text-forest sm:text-4xl">{item.name}</h1>
          <p className="mt-4 text-lg leading-8 text-charcoal/75">{item.description}</p>
          <div className="mt-6 grid gap-4 rounded-lg border border-forest/10 bg-white p-5 shadow-soft sm:grid-cols-2">
            {[
              ["Category", item.category],
              ["Colour", item.colour],
              ["Material", item.material],
              ["Age group", item.ageGroup],
              ["Size", item.size],
              ["Gender", item.gender],
              ["Rental price", formatCurrency(item.rentalPrice)],
              ["Security deposit", formatCurrency(item.securityDeposit)]
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-charcoal/45">{label}</p>
                <p className="mt-1 font-semibold text-charcoal">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-lg border border-forest/10 bg-white p-5 shadow-soft">
            <h2 className="text-lg font-bold text-forest">Check availability</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <TextField label="Pickup" type="datetime-local" value={pickup} onChange={setPickup} />
              <TextField label="Return" type="datetime-local" value={returnAt} onChange={setReturnAt} />
            </div>
            <div className="mt-4 flex flex-col gap-3 rounded-md bg-cream p-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="font-semibold text-charcoal">Public status</span>
              <StatusBadge status={availability} />
            </div>
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link to={`/booking-request?item=${item.id}`} className="inline-flex items-center justify-center gap-2 rounded-md bg-forest px-5 py-3 font-bold text-cream hover:bg-leaf">
              <CalendarCheck className="h-4 w-4" /> Reservation request
            </Link>
            <a href={`https://wa.me/${settings.whatsappNumber}?text=I%20want%20to%20enquire%20about%20${encodeURIComponent(item.dressId)}`} className="inline-flex items-center justify-center gap-2 rounded-md border border-forest/20 px-5 py-3 font-bold text-forest hover:bg-forest/5">
              <MessageCircle className="h-4 w-4" /> Enquire
            </a>
          </div>
          <div className="mt-8">
            <h2 className="text-xl font-bold text-forest">Rental rules</h2>
            <ul className="mt-3 grid gap-2 text-charcoal/75">
              {settings.terms.map((term) => (
                <li key={term} className="flex gap-2">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                  {term}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      {suggestions.length > 0 && (
        <div className="mt-12">
          <SectionHeader title="Similar available dresses" />
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {suggestions.map((entry) => (
              <DressCard key={entry.id} item={entry} bookings={bookings} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export function BookingRequestPage() {
  const syncedItems = usePublicInventoryItems();
  const [params] = useSearchParams();
  const initialItem = syncedItems.find((item) => item.id === params.get("item")) || syncedItems[0] || inventoryItems[0];
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [pickup, setPickup] = useState("2026-07-25T10:00");
  const [returnAt, setReturnAt] = useState("2026-07-27T18:00");
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const availability = publicAvailability(initialItem, bookings, pickup, returnAt, settings.preparationBufferHours);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!/^\+?\d[\d\s-]{8,}$/.test(mobile)) return;
    setSubmitted(true);
  }

  return (
    <section className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[0.8fr_1fr] lg:px-8">
      <div className="rounded-lg border border-forest/10 bg-white p-5 shadow-soft">
        <img src={initialItem.featuredImage || fallbackDressImage} alt={initialItem.name} className="aspect-[4/5] w-full rounded-md object-cover" onError={(event) => { event.currentTarget.src = fallbackDressImage; }} />
        <h1 className="mt-5 text-2xl font-bold text-forest">{initialItem.name}</h1>
        <p className="mt-2 text-charcoal/70">{initialItem.dressId} - {initialItem.category}</p>
        <div className="mt-4 flex items-center justify-between">
          <span className="font-semibold text-charcoal">Availability</span>
          <StatusBadge status={availability} />
        </div>
      </div>
      <form onSubmit={submit} className="rounded-lg border border-forest/10 bg-white p-6 shadow-soft">
        <SectionHeader eyebrow="Pending approval" title="Reservation request" description="Customer requests are saved as Pending Approval. Staff must confirm availability and payment before the dress is blocked." />
        {submitted ? (
          <div className="mt-8 rounded-lg bg-emerald-50 p-5 text-emerald-900">
            <h2 className="text-xl font-bold">Request captured</h2>
            <p className="mt-2">Sample request TC-BKG-WEB-DRAFT is ready for staff approval. In production this writes to Firestore.</p>
          </div>
        ) : (
          <div className="mt-8 grid gap-4">
            <TextField label="Full name" value={name} onChange={setName} required />
            <TextField label="Mobile number" value={mobile} onChange={setMobile} required placeholder="+91..." />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Pickup date and time" value={pickup} onChange={setPickup} type="datetime-local" />
              <TextField label="Return date and time" value={returnAt} onChange={setReturnAt} type="datetime-local" />
            </div>
            <TextAreaField label="Event notes" value={notes} onChange={setNotes} placeholder="Occasion, age, size needs, accessories..." />
            <button className="rounded-md bg-forest px-5 py-3 font-bold text-cream hover:bg-leaf">Submit pending request</button>
          </div>
        )}
      </form>
    </section>
  );
}

export function RulesPage() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <SectionHeader eyebrow="Rental policies" title="Clear rules for smooth returns" />
      <div className="mt-8 grid gap-4">
        {settings.terms.map((term) => (
          <article key={term} className="rounded-lg border border-forest/10 bg-white p-5 shadow-soft">
            <p className="font-semibold text-charcoal">{term}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function AboutPage() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <SectionHeader eyebrow="About" title="A simple, careful rental experience" />
      <div className="mt-8 rounded-lg border border-forest/10 bg-white p-6 leading-8 text-charcoal/75 shadow-soft">
        <p>
          Twigs Collective helps families, schools, churches, event organisers, and performers find clean,
          well-presented costumes without buying outfits for one-time events. The system tracks every physical dress
          individually so availability, condition, payments, deposits, returns, cleaning, and repairs stay accurate.
        </p>
      </div>
    </section>
  );
}

export function ContactPage() {
  return (
    <section className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:px-8">
      <div>
        <SectionHeader eyebrow="Visit us" title="Contact and location" />
        <div className="mt-8 grid gap-4">
          <p className="flex min-w-0 gap-3 rounded-lg border border-forest/10 bg-white p-5 font-semibold text-charcoal shadow-soft">
            <MapPin className="h-5 w-5 shrink-0 text-gold" /> <span className="min-w-0 break-words">{settings.address}</span>
          </p>
          <p className="flex min-w-0 gap-3 rounded-lg border border-forest/10 bg-white p-5 font-semibold text-charcoal shadow-soft">
            <Phone className="h-5 w-5 shrink-0 text-gold" /> <span className="min-w-0 break-words">{settings.phones.join(" / ")}</span>
          </p>
          <p className="flex min-w-0 gap-3 rounded-lg border border-forest/10 bg-white p-5 font-semibold text-charcoal shadow-soft">
            <Clock className="h-5 w-5 shrink-0 text-gold" /> <span className="min-w-0 break-words">{settings.openingHours}</span>
          </p>
        </div>
      </div>
      <form className="rounded-lg border border-forest/10 bg-white p-6 shadow-soft">
        <h2 className="text-2xl font-bold text-forest">Customer enquiry</h2>
        <div className="mt-5 grid gap-4">
          <TextField label="Name" value="" onChange={() => undefined} />
          <TextField label="Phone" value="" onChange={() => undefined} />
          <TextAreaField label="Message" value="" onChange={() => undefined} />
          <a href={`https://wa.me/${settings.whatsappNumber}`} className="inline-flex items-center justify-center gap-2 rounded-md bg-forest px-5 py-3 font-bold text-cream hover:bg-leaf">
            <MessageCircle className="h-4 w-4" /> Continue on WhatsApp
          </a>
        </div>
      </form>
    </section>
  );
}

export function LoginPage() {
  const { configured, login, resetPassword, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);

    try {
      await login(email.trim(), password);
      navigate(from, { replace: true });
    } catch (caught) {
      setError(firebaseErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  async function sendReset() {
    setError("");
    setMessage("");
    if (!email.trim()) {
      setError("Enter your email first, then click password reset.");
      return;
    }

    setBusy(true);
    try {
      await resetPassword(email.trim());
      setMessage("Password reset email sent. Check the staff inbox.");
    } catch (caught) {
      setError(firebaseErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto grid max-w-5xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:px-8">
      <div>
        <SectionHeader eyebrow="Secure access" title="Staff and customer login" description="Firebase Authentication supports email/password login, password reset, persistent sessions, secure logout, protected routes, deactivation, and role claims." />
        <div className={`mt-6 rounded-lg border p-4 text-sm font-semibold ${configured ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
          {configured
            ? "Firebase is configured. Use an Email/Password account created in Firebase Authentication."
            : "Firebase is not configured yet. Add Firebase values in .env.local and restart the dev server."}
        </div>
      </div>
      <form onSubmit={submit} className="rounded-lg border border-forest/10 bg-white p-6 shadow-soft">
        <div className="grid gap-4">
          {user && (
            <div className="rounded-md bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">
              Signed in as {user.email}. You can open the dashboard.
            </div>
          )}
          <TextField label="Email" type="email" value={email} onChange={setEmail} placeholder="owner@twigsrental.com" required />
          <TextField label="Password" type="password" value={password} onChange={setPassword} placeholder="Use Firebase Auth" required />
          {error && <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</p>}
          {message && <p className="rounded-md bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">{message}</p>}
          <button
            disabled={!configured || busy}
            className="rounded-md bg-forest px-5 py-3 text-center font-bold text-cream hover:bg-leaf disabled:cursor-not-allowed disabled:bg-stone-300"
          >
            {busy ? "Please wait..." : "Login"}
          </button>
          <button type="button" disabled={!configured || busy} onClick={sendReset} className="text-left text-sm font-semibold text-forest disabled:text-stone-400">
            Send password reset email
          </button>
        </div>
      </form>
    </section>
  );
}

function firebaseErrorMessage(error: unknown) {
  const code = typeof error === "object" && error && "code" in error ? String((error as { code: unknown }).code) : "";

  if (code.includes("auth/invalid-credential") || code.includes("auth/wrong-password")) {
    return "The email or password is incorrect.";
  }
  if (code.includes("auth/user-not-found")) {
    return "No Firebase user exists for this email.";
  }
  if (code.includes("auth/too-many-requests")) {
    return "Too many attempts. Wait a bit, then try again.";
  }
  if (code.includes("auth/invalid-email")) {
    return "Enter a valid email address.";
  }

  return error instanceof Error ? error.message : "Login failed. Check Firebase Authentication settings.";
}

export function CustomerBookingsPage() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <SectionHeader eyebrow="Customer portal" title="Customer bookings" description="Authenticated customers can read only their own bookings through Firestore rules." />
      <div className="mt-8 grid gap-4">
        {bookings.slice(0, 2).map((booking) => (
          <article key={booking.id} className="rounded-lg border border-forest/10 bg-white p-5 shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-bold text-forest">{booking.bookingNumber}</h2>
              <StatusBadge status={booking.bookingStatus} />
            </div>
            <p className="mt-3 text-charcoal/70">{booking.items.map((item) => item.name).join(", ")}</p>
            <p className="mt-2 text-sm font-semibold text-charcoal/60">Pickup {booking.pickupDateTime} - Return {booking.expectedReturnDateTime}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-forest/10 bg-forest py-10 text-cream">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-3 lg:px-8">
        <div>
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-cream text-sm font-bold text-forest">TC</span>
            <span className="font-display text-xl font-bold">{settings.shopName}</span>
          </div>
          <p className="mt-4 text-cream/75">{settings.address}</p>
        </div>
        <div>
          <h3 className="font-bold">Contact</h3>
          <p className="mt-3 text-cream/75">{settings.phones.join(" / ")}</p>
          <p className="mt-1 text-cream/75">{settings.email}</p>
        </div>
        <div>
          <h3 className="font-bold">Rental policies</h3>
          <p className="mt-3 text-cream/75">Advance confirmation, inspection-based deposit refund, and staff-approved returns.</p>
        </div>
      </div>
    </footer>
  );
}
