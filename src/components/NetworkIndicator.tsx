import { Wifi, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

export function NetworkIndicator() {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${online ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
      {online ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
      {online ? "Online" : "Offline"}
    </span>
  );
}
