"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Target, Clock, History, Wallet, BarChart2, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  {
    href: "/executor/available",
    label: "Доступные",
    icon: Target,
  },
  {
    href: "/executor/active",
    label: "Активные",
    icon: Clock,
  },
  {
    href: "/executor/history",
    label: "История",
    icon: History,
  },
  {
    href: "/executor/balance",
    label: "Баланс",
    icon: Wallet,
  },
  {
    href: "/executor/stats",
    label: "Статус",
    icon: BarChart2,
  },
  {
    href: "/executor/profile",
    label: "Профиль",
    icon: User,
  },
];

export function ExecutorNav() {
  const pathname = usePathname();
  
  const handleLogout = async () => {
    await signOut({ callbackUrl: '/auth/signin' });
  };

  return (
    <nav className="border-b border-mb-gray/20 bg-mb-black/80 backdrop-blur-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between">
          <div className="flex space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    className={cn(
                      "flex items-center space-x-2 rounded-none border-b-2 border-transparent px-4 py-3 transition-colors",
                      isActive 
                        ? "border-mb-turquoise bg-mb-black text-mb-turquoise" 
                        : "hover:text-mb-turquoise"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Button>
                </Link>
              );
            })}
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleLogout}
            className="text-mb-gray hover:text-mb-red"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Выйти
          </Button>
        </div>
      </div>
    </nav>
  );
}

