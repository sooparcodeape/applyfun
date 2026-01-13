import { Link, useLocation } from "wouter";
import { Briefcase, Home, User, Zap } from "lucide-react";
import { useHaptic } from "@/hooks/useHaptic";

export function MobileBottomNav() {
  const [location] = useLocation();
  const { triggerHaptic } = useHaptic();

  const navItems = [
    { href: "/dashboard", icon: Home, label: "Home" },
    { href: "/dashboard/jobs", icon: Briefcase, label: "Jobs" },
    { href: "/queue", icon: Zap, label: "Queue" },
    { href: "/profile", icon: User, label: "Profile" },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border z-50 safe-bottom">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href || 
            (item.href !== "/" && location.startsWith(item.href));
          
          return (
            <Link 
              key={item.href} 
              href={item.href}
              onClick={() => triggerHaptic("selection")}
            >
              <div className={`relative flex flex-col items-center justify-center w-16 h-full transition-all duration-200 cursor-pointer ${
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              }`}>
                {isActive && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-primary rounded-b-full" />
                )}
                <Icon className={`w-6 h-6 transition-transform duration-200 ${
                  isActive ? "scale-110" : ""
                }`} />
                <span className={`text-xs mt-1 transition-all duration-200 ${
                  isActive ? "font-semibold" : ""
                }`}>{item.label}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
