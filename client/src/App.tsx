import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/lib/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Header } from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import CookieNotice from "@/components/cookie-notice";
import Home from "./pages/home";
import NotFound from "./pages/not-found";
import { useAuthProvider, AuthContext } from "@/hooks/use-auth";
import { lazy, Suspense, useEffect } from "react";

// Lazy-load the admin and deck builder pages to avoid loading them unless needed
const AdminPage = lazy(() => import("./pages/admin"));
const DeckBuilderPage = lazy(() => import("./pages/deck-builder"));
const MyDecksPage = lazy(() => import("./pages/my-decks"));
const PublicDecksPage = lazy(() => import("./pages/public-decks"));
const DeckViewPage = lazy(() => import("./pages/deck-view"));
const ResetPasswordPage = lazy(() => import("./pages/reset-password"));

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/admin">
        <Suspense fallback={<div className="container mx-auto py-8 text-center">Loading admin page...</div>}>
          <AdminPage />
        </Suspense>
      </Route>
      <Route path="/deck-builder">
        <Suspense fallback={<div className="container mx-auto py-8 text-center">Loading deck builder...</div>}>
          <DeckBuilderPage />
        </Suspense>
      </Route>
      <Route path="/my-decks">
        <Suspense fallback={<div className="container mx-auto py-8 text-center">Loading your decks...</div>}>
          <MyDecksPage />
        </Suspense>
      </Route>
      <Route path="/public-decks">
        <Suspense fallback={<div className="container mx-auto py-8 text-center">Loading public decks...</div>}>
          <PublicDecksPage />
        </Suspense>
      </Route>
      <Route path="/deck-view/:id">
        <Suspense fallback={<div className="container mx-auto py-8 text-center">Loading deck...</div>}>
          <DeckViewPage />
        </Suspense>
      </Route>
      <Route path="/reset-password">
        <Suspense fallback={<div className="container mx-auto py-8 text-center">Loading reset password page...</div>}>
          <ResetPasswordPage />
        </Suspense>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthProvider({ children }: { children: React.ReactNode }) {
  const authValue = useAuthProvider();
  
  return (
    <AuthContext.Provider value={authValue}>
      {children}
    </AuthContext.Provider>
  );
}

function App() {
  // Clear user-specific cached data and state on app mount to ensure fresh sessions
  useEffect(() => {
    // Clear specific user data queries but preserve system data like metadata
    queryClient.removeQueries({ 
      predicate: (query) => {
        const queryKey = query.queryKey[0] as string;
        return queryKey !== '/api/metadata'; // Keep metadata cached
      }
    });

    // Clear any localStorage data that might persist between sessions
    try {
      localStorage.removeItem('selectedCard');
      localStorage.removeItem('searchQuery');
      localStorage.removeItem('deckBuilderState');
      sessionStorage.clear();
    } catch (error) {
      // Ignore localStorage errors in case it's not available
    }
  }, []);

  // Note: ThemeProvider is in main.tsx, wrapping the entire App
  // But we need it here too for proper context nesting
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <div className="flex flex-col min-h-screen transition-colors duration-200">
              <Header />
              <Toaster />
              <Router />
              <Footer />
              <CookieNotice />
            </div>
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;