import { useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import Footer from "./components/Footer";
import Navbar from "./components/Navbar";
import { MarketplaceProvider } from "./context/MarketplaceContext";
import Architecture from "./pages/Architecture";
import Browse from "./pages/Browse";
import Dashboard from "./pages/Dashboard";
import Home from "./pages/Home";
import ListSkill from "./pages/ListSkill";
import SkillDetail from "./pages/SkillDetail";

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
      <ScrollToTop />
      <Navbar />
      <main className="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/browse" element={<Browse />} />
          <Route path="/skill/:id" element={<SkillDetail />} />
          <Route path="/list" element={<ListSkill />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/architecture" element={<Architecture />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
      <Footer />
    </MarketplaceProvider>
  );
}
