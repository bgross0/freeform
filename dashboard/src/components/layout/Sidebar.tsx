import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Forms", href: "/", icon: LayoutDashboard },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="hidden w-64 border-r bg-card md:block">
      <div className="flex h-16 items-center border-b px-6">
        <Link to="/" className="flex items-center gap-2">
          <Mail className="h-6 w-6 text-primary" />
          <span className="text-lg font-semibold">Freeform</span>
        </Link>
      </div>
      <nav className="p-4 space-y-1">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href ||
            (item.href !== "/" && location.pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
