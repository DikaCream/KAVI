import { lazy, Suspense, useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import Footer from "./components/Footer";
import Navbar from "./components/Navbar";
import { MarketplaceProvider } from "./context/MarketplaceContext";

// Route-level code splitting: each page is its own chunk, so the initial
// bundle only ships the shell + Home.
const Home = lazy(() => import("./pages/Home"));
const Browse = lazy(() => import("./pages/Browse"));
const SkillDetail = lazy(() => import("./pages/SkillDetail"));
const ListSkill = lazy(() => import("./pages/ListSkill"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Architecture = lazy(() => import("./pages/Architecture"));
const NotFound = lazy(() => import("./pages/NotFound"));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <MarketplaceProvider>
      <div className="bg-wash" aria-hidden="true" />
      <ScrollToTop />
      <Navbar />
      <main className="main">
        <Suspense
          fallback={
            <div className="page-loading" role="status" aria-live="polite">
              <span className="spinner" aria-hidden="true" />
              Loading region…
            </div>
          }
        >
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/browse" element={<Browse />} />
            <Route path="/skill/:id" element={<SkillDetail />} />
            <Route path="/list" element={<ListSkill />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/architecture" element={<Architecture />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
    </MarketplaceProvider>
  );
}
