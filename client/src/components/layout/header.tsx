import React, { useEffect, useState } from "react";
import { useTheme } from "@/lib/theme-provider";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { ThemeToggle } from "@/lib/theme-provider";
import { Menu, X, Sparkles, User, LogOut, FolderOpen, Archive } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DatabaseUpdateModal } from "@/components/database-update-modal";
import { AuthModal } from "@/components/auth-modal";
import { useAuth } from "@/hooks/use-auth";

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const { user, logout, isAuthenticated } = useAuth();
  const { theme, setTheme } = useTheme();
  const [location] = useLocation();

  // Handle toggling theme with extra checks and EXACT color codes
  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);

    // Apply immediate visual updates for faster feedback with EXACT colors
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light-theme-styles");
      document.documentElement.style.backgroundColor = '#121212';
      document.body.style.backgroundColor = '#121212';
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light-theme-styles");
      document.documentElement.style.backgroundColor = '#E0E2E3';
      document.body.style.backgroundColor = '#E0E2E3';
    }
  };

  // Ensure theme is correctly applied on component mount with EXACT color codes
  useEffect(() => {
    // Sync DOM with current theme state using EXACT color codes
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light-theme-styles");
      document.documentElement.style.backgroundColor = '#121212';
      document.body.style.backgroundColor = '#121212';
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light-theme-styles");
      document.documentElement.style.backgroundColor = '#E0E2E3';
      document.body.style.backgroundColor = '#E0E2E3';
    }
  }, []);

  return (
    <header className="bg-[#E9EBED] dark:bg-[#1E1E1E] shadow-sm z-10 border-b border-gray-200 dark:border-gray-800">
      <nav className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center">
          <Link href="/" className="flex items-center">
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#4777e6] dark:border-[#9c4dff] flex items-center justify-center bg-gradient-to-br from-[#4777e6] to-[#9c4dff]">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-8 h-8">
                <path fillRule="evenodd" d="M10.5 3.798v5.02a3 3 0 0 1-.879 2.121l-2.377 2.377a9.845 9.845 0 0 1 5.091 1.013 8.315 8.315 0 0 0 5.713.636l.285-.071-3.954-3.955a3 3 0 0 1-.879-2.121v-5.02a23.614 23.614 0 0 0-3 0Zm4.5.138a.75.75 0 0 0 .093-1.495A24.837 24.837 0 0 0 12 2.25a25.048 25.048 0 0 0-3.093.191A.75.75 0 0 0 9 3.936v4.882a1.5 1.5 0 0 0 .44 1.06l6.293 6.294c.67.67 1.767.67 2.437 0l3.586-3.586a.75.75 0 0 0 .237-.765 13.6 13.6 0 0 1-.345-3.188 13.6 13.6 0 0 1 .345-3.188.75.75 0 0 0-.237-.765L18.12 1.284a.75.75 0 0 0-1.06 0l-6.06 6.06a.75.75 0 0 0 0 1.06l5.353 5.353a6.777 6.777 0 0 1-1.81.257 8.417 8.417 0 0 1-4.3-.908A11.31 11.31 0 0 0 1.922 12.9a.75.75 0 0 0-.443.713c.141 4.006 2.489 7.703 6.14 9.73a.75.75 0 0 0 .724.014A14.94 14.94 0 0 0 12 21.75c2.43 0 4.817-.583 7.101-1.792a.75.75 0 0 0 .36-.992.75.75 0 0 0-.627-.422 12.38 12.38 0 0 1-2.361-.235.75.75 0 0 0-.033 1.496 3.8 3.8 0 0 0 .611.07A10.758 10.758 0 0 1 12 20.25c-1.999 0-3.937-.533-5.8-1.563a11.093 11.093 0 0 1-4.267-6.69 12.856 12.856 0 0 1 2.499.416c.217.07.44.103.671.133A9.826 9.826 0 0 0 9.75 15c0-.423.035-.84.102-1.247a3 3 0 0 1-1.58-.514l-2.718-2.718a.75.75 0 0 0-1.06 0 .75.75 0 0 0-.001 1.06l2.12 2.121a4.5 4.5 0 0 1-1.364.79.75.75 0 1 0 .394 1.447 6 6 0 0 0 1.819-1.052c.96.617 2.025 1.05 3.175 1.276A9.830 9.830 0 0 0 15 18.75a.75.75 0 0 0 0-1.5 8.25 8.25 0 1 1 .372-16.5.75.75 0 0 0 0 1.5 6.752 6.752 0 0 0-6.072 9.797c.291-.235.586-.463.873-.687l.243.243a4.5 4.5 0 0 0 6.382 0l3.207-3.208a14.25 14.25 0 0 0 0-4.791l-3.944-3.944a.75.75 0 0 1 0-1.06L15 4.061Zm-8.95 12.58a.75.75 0 0 0 1.06 0l2.121-2.121a.75.75 0 1 0-1.06-1.06L6.55 15.56a.75.75 0 0 0 0 1.06Z" clipRule="evenodd" />
              </svg>
            </div>
            <h1 className="ml-3 text-[2.5rem] font-bold font-heading bg-gradient-to-r from-[#4777e6] to-[#9c4dff] text-transparent bg-clip-text">Spark Arcanum</h1>
          </Link>
          <div className="block md:hidden">
            <Dialog open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" className="p-2">
                  {isMobileMenuOpen ? (
                    <X className="w-5 h-5" />
                  ) : (
                    <Menu className="w-5 h-5" />
                  )}
                  <span className="sr-only">Toggle Menu</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="w-screen max-w-sm bg-white dark:bg-gray-900 text-foreground shadow-xl border-none">
                <DialogHeader className="pt-6">
                  <DialogTitle>Menu</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <button
                    onClick={() => {
                      if (window.location.pathname === '/') {
                        document.getElementById('ai-assistant')?.scrollIntoView({ behavior: 'smooth' });
                      } else {
                        window.location.href = '/#ai-assistant';
                      }
                      setIsMobileMenuOpen(false);
                    }}
                    className="text-left text-foreground hover:text-foreground/80 transition-colors"
                  >
                    AI Assistant
                  </button>
                  <Link
                    href="/deck-builder"
                    className="text-foreground hover:text-foreground/80 transition-colors"
                  >
                    Deck Builder
                  </Link>
                  <Link
                    href="/public-decks"
                    className="text-foreground hover:text-foreground/80 transition-colors"
                  >
                    Deck Archive
                  </Link>
                  <Link
                    href="/database-update"
                    className="text-foreground hover:text-foreground/80 transition-colors"
                  >
                    Database Update
                  </Link>
                  <Link
                    href="/admin"
                    className="text-foreground hover:text-foreground/80 transition-colors"
                  >
                    Admin
                  </Link>

                  {isAuthenticated ? (
                    <div className="space-y-2 pt-2 border-t">
                      <div className="text-sm text-muted-foreground">
                        Logged in as {user?.username}
                      </div>
                      <Link 
                        href="/my-decks"
                        className="flex items-center space-x-2 text-foreground hover:text-foreground/80 transition-colors"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <FolderOpen className="h-4 w-4" />
                        <span>My Decks</span>
                      </Link>
                      <Link 
                        href="/public-decks"
                        className="flex items-center space-x-2 text-foreground hover:text-foreground/80 transition-colors"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <Archive className="h-4 w-4" />
                        <span>Deck Archive</span>
                      </Link>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          logout();
                          setIsMobileMenuOpen(false);
                        }}
                        className="w-full justify-start"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Logout
                      </Button>
                    </div>
                  ) : (
                    <div className="pt-2 border-t">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          setAuthModalOpen(true);
                          setIsMobileMenuOpen(false);
                        }}
                        className="w-full justify-start"
                      >
                        <User className="h-4 w-4 mr-2" />
                        Login / Register
                      </Button>
                    </div>
                  )}

                  <ThemeToggle />
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="hidden md:flex items-center space-x-4">
          {/* Main Navigation Links */}
          <Link href="/deck-builder" className="text-sm font-medium text-foreground hover:text-foreground/80 transition-colors">
            Deck Builder
          </Link>
          <Link href="/public-decks" className="text-sm font-medium text-foreground hover:text-foreground/80 transition-colors">
            Deck Archive
          </Link>
          <button 
            onClick={() => {
              if (window.location.pathname === '/') {
                document.getElementById('ai-assistant')?.scrollIntoView({ behavior: 'smooth' });
              } else {
                window.location.href = '/#ai-assistant';
              }
            }}
            className="text-sm font-medium text-foreground hover:text-foreground/80 transition-colors"
          >
            AI Assistant
          </button>

          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <span>{user?.username}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link href="/my-decks" className="flex items-center">
                    <FolderOpen className="h-4 w-4 mr-2" />
                    My Decks
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="flex items-center text-red-600">
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            // Show login button only in deck builder area
            location === '/deck-builder' && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setAuthModalOpen(true)}
                className="flex items-center space-x-2"
              >
                <User className="h-4 w-4" />
                <span>Login</span>
              </Button>
            )
          )}

          <ThemeToggle />
        </div>
      </nav>

      <AuthModal 
        isOpen={authModalOpen} 
        onClose={() => setAuthModalOpen(false)} 
      />
    </header>
  );
}