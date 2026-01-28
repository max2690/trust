"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { 
  Home, 
  User, 
  Settings, 
  LogIn, 
  UserPlus,
  LogOut,
  Menu,
  X
} from "lucide-react";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { data: session, status } = useSession();
  const router = useRouter();

  // Определяем URL главной страницы в зависимости от роли пользователя
  const getHomeUrl = () => {
    if (!session?.user) return "/";
    const role = (session.user as { role?: string }).role;
    if (role === "CUSTOMER") return "/dashboard/customer";
    if (role === "EXECUTOR") return "/executor/available";
    if (role === "MODERATOR_ADMIN" || role === "SUPER_ADMIN") return "/admin-god/dashboard";
    return "/";
  };

  const navigation = [
    { name: "Главная", href: getHomeUrl(), icon: Home },
    { name: "Заказчики", href: "/dashboard/customer", icon: User },
    { name: "Исполнители", href: "/dashboard/executor", icon: User },
    { name: "Админ", href: "/admin-god/dashboard", icon: Settings },
  ];

  const authButtons = [
    { name: "Войти", href: "/auth/signin", icon: LogIn, variant: "outline" as const },
    { name: "Регистрация", href: "/auth/signup", icon: UserPlus, variant: "primary" as const },
  ];

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/");
    router.refresh();
  };

  return (
    <header className="
      sticky top-0 z-50
      bg-background/80 backdrop-blur-md
      border-b border-border/50
      shadow-sm
    ">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 group">
            <div className="
              w-10 h-10 rounded-xl
              bg-gradient-to-br from-blue-500 to-purple-600
              flex items-center justify-center
              shadow-lg group-hover:shadow-xl
              transition-all duration-300
              group-hover:scale-105
            ">
              <span className="text-white font-bold text-lg">M</span>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                MB-TRUST
              </h1>
              <p className="text-xs text-muted-foreground">
                Платформа честных заданий
              </p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className="
                    flex items-center space-x-2 px-4 py-2
                    rounded-xl text-sm font-medium
                    text-muted-foreground hover:text-foreground
                    hover:bg-accent/50
                    transition-all duration-200
                    group
                  "
                >
                  <Icon className="h-4 w-4 group-hover:scale-110 transition-transform" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right side - Auth buttons */}
          <div className="flex items-center space-x-3">
            {/* Desktop Auth Buttons */}
            <div className="hidden sm:flex items-center space-x-2">
              {session?.user ? (
                // Показываем для авторизованных пользователей
                <>
                  <span className="text-sm text-muted-foreground mr-2">
                    {session.user.name || 'Пользователь'}
                  </span>
                  <Link
                    href={getHomeUrl()}
                    className="
                      inline-flex items-center justify-center rounded-xl font-medium transition-all duration-300
                      border border-mb-turquoise/20 text-mb-turquoise hover:bg-mb-turquoise/10
                      h-9 px-3 text-sm
                      hover:scale-105 hover:shadow-lg
                      flex items-center space-x-2
                    "
                  >
                    <Settings className="h-4 w-4" />
                    <span>Настройки</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="
                      inline-flex items-center justify-center rounded-xl font-medium transition-all duration-300
                      bg-mb-turquoise text-mb-black hover:bg-mb-turquoise/90 shadow-glow
                      h-9 px-3 text-sm
                      hover:scale-105 hover:shadow-lg
                      flex items-center space-x-2
                    "
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Выйти</span>
                  </button>
                </>
              ) : (
                // Показываем для неавторизованных пользователей
                authButtons.map((button) => {
                  const Icon = button.icon;
                  return (
                    <Link 
                      key={button.name}
                      href={button.href}
                      className={`
                        inline-flex items-center justify-center rounded-xl font-medium transition-all duration-300
                        ${button.variant === 'primary' ? 'bg-mb-turquoise text-mb-black hover:bg-mb-turquoise/90 shadow-glow' : 'border border-mb-turquoise/20 text-mb-turquoise hover:bg-mb-turquoise/10'}
                        h-9 px-3 text-sm
                        hover:scale-105 hover:shadow-lg
                        flex items-center space-x-2
                      `}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{button.name}</span>
                    </Link>
                  );
                })
              )}
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="
                md:hidden p-2 rounded-xl
                hover:bg-accent/50
                transition-all duration-200
                focus:outline-none focus:ring-2 focus:ring-ring
              "
              aria-label="Открыть меню"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6 text-foreground" />
              ) : (
                <Menu className="h-6 w-6 text-foreground" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="
            md:hidden
            border-t border-border/50
            bg-background/95 backdrop-blur-md
            animate-slide-up
          ">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {/* Mobile Navigation Links */}
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="
                      flex items-center space-x-3 px-3 py-3
                      rounded-xl text-base font-medium
                      text-muted-foreground hover:text-foreground
                      hover:bg-accent/50
                      transition-all duration-200
                      group
                    "
                  >
                    <Icon className="h-5 w-5 group-hover:scale-110 transition-transform" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}

              {/* Mobile Auth Buttons */}
              <div className="pt-3 border-t border-border/50 space-y-2">
                {session?.user ? (
                  // Показываем для авторизованных пользователей
                  <>
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      {session.user.name || 'Пользователь'}
                    </div>
                    <Link
                      href={getHomeUrl()}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="
                        inline-flex items-center justify-center rounded-xl font-medium transition-all duration-300
                        border border-mb-turquoise/20 text-mb-turquoise hover:bg-mb-turquoise/10
                        h-9 px-3 text-sm
                        w-full justify-start flex items-center space-x-3
                      "
                    >
                      <Settings className="h-4 w-4" />
                      <span>Настройки</span>
                    </Link>
                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        handleLogout();
                      }}
                      className="
                        inline-flex items-center justify-center rounded-xl font-medium transition-all duration-300
                        bg-mb-turquoise text-mb-black hover:bg-mb-turquoise/90 shadow-glow
                        h-9 px-3 text-sm
                        w-full justify-start flex items-center space-x-3
                      "
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Выйти</span>
                    </button>
                  </>
                ) : (
                  // Показываем для неавторизованных пользователей
                  authButtons.map((button) => {
                    const Icon = button.icon;
                    return (
                      <Link
                        key={button.name}
                        href={button.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`
                          inline-flex items-center justify-center rounded-xl font-medium transition-all duration-300
                          ${button.variant === 'primary' ? 'bg-mb-turquoise text-mb-black hover:bg-mb-turquoise/90 shadow-glow' : 'border border-mb-turquoise/20 text-mb-turquoise hover:bg-mb-turquoise/10'}
                          h-9 px-3 text-sm
                          w-full justify-start flex items-center space-x-3
                        `}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{button.name}</span>
                      </Link>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
