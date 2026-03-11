import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Download, Menu, X, Clock3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const navItems = [
  { label: 'Product', href: '#product' },
  { label: 'Features', href: '#features' },
  { label: 'Workflow', href: '#workflow' },
  { label: 'Screens', href: '#screenshots' },
  { label: 'Security', href: '#security' },
  { label: 'Login', href: '/login', external: true },
];

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
const API_BASE_URL = API_URL.replace(/\/api\/?$/, '');
const desktopDownloadUrl =
  import.meta.env.VITE_DESKTOP_DOWNLOAD_URL?.trim() || `${API_BASE_URL}/api/downloads/desktop/windows`;

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const location = useLocation();

  useEffect(() => {
    let lastScrollY = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollingUp = currentScrollY < lastScrollY;

      setIsScrolled(currentScrollY > 12);

      if (currentScrollY < 24) {
        setIsVisible(true);
      } else if (scrollingUp) {
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY + 18) {
        setIsVisible(false);
        setIsOpen(false);
      }

      lastScrollY = currentScrollY;
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogoClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    setIsOpen(false);

    if (location.pathname === '/') {
      event.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <header
      className={`sticky top-0 z-50 px-4 pt-4 transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform sm:px-6 lg:px-8 ${
        isVisible || isOpen ? 'translate-y-0' : '-translate-y-[115%]'
      }`}
    >
      <div
        className={`mx-auto max-w-7xl rounded-[24px] border transition-all duration-500 ${
          isScrolled
            ? 'border-white/80 bg-white/78 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.38)] backdrop-blur-2xl'
            : 'border-white/55 bg-white/58 shadow-[0_12px_40px_-30px_rgba(14,165,233,0.35)] backdrop-blur-xl'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4 lg:px-7">
          <Link to="/" onClick={handleLogoClick} className="flex items-center gap-3 text-slate-950">
            <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,#020617_0%,#0f172a_30%,#0284c7_75%,#67e8f9_100%)] shadow-[0_18px_35px_-14px_rgba(14,165,233,0.8)]">
              <Clock3 className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-sky-700">CareVance HRMS</p>
              <p className="text-lg font-semibold tracking-[-0.04em]">TimeTrack</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-8 lg:flex">
            {navItems.map((item) =>
              item.external ? (
                <Link
                  key={item.label}
                  to={item.href}
                  className="text-sm font-medium text-slate-600 transition duration-300 hover:text-slate-950"
                >
                  {item.label}
                </Link>
              ) : (
                <a
                  key={item.label}
                  href={item.href}
                  className="text-sm font-medium text-slate-600 transition duration-300 hover:text-slate-950"
                >
                  {item.label}
                </a>
              )
            )}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <a
              href={desktopDownloadUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-slate-300/80 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 transition duration-300 hover:-translate-y-0.5 hover:border-slate-950 hover:text-slate-950"
            >
              <Download className="h-4 w-4" />
              Download
            </a>
            <Link
              to="/login"
              className="rounded-full px-4 py-2 text-sm font-medium text-slate-600 transition duration-300 hover:bg-slate-950/5 hover:text-slate-950"
            >
              Login
            </Link>
            <Link
              to="/register"
              className="rounded-full bg-[linear-gradient(135deg,#020617_0%,#0f172a_30%,#0284c7_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_18px_40px_-18px_rgba(14,165,233,0.7)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_46px_-20px_rgba(14,165,233,0.8)]"
            >
              Start Monitoring
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="inline-flex rounded-full border border-slate-200 bg-white/80 p-2 text-slate-700 shadow-sm lg:hidden"
            aria-label="Toggle navigation"
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden border-t border-slate-200/80 lg:hidden"
            >
              <div className="space-y-3 px-5 py-4">
                <a
                  href={desktopDownloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white/90 px-4 py-3 text-sm font-medium text-slate-700"
                >
                  <Download className="h-4 w-4" />
                  Download Desktop App
                </a>
                {navItems.map((item) =>
                  item.external ? (
                    <Link
                      key={item.label}
                      to={item.href}
                      onClick={() => setIsOpen(false)}
                      className="block rounded-2xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-950/5 hover:text-slate-950"
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <a
                      key={item.label}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className="block rounded-2xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-950/5 hover:text-slate-950"
                    >
                      {item.label}
                    </a>
                  )
                )}
                <Link
                  to="/register"
                  onClick={() => setIsOpen(false)}
                  className="block rounded-2xl bg-[linear-gradient(135deg,#020617_0%,#0f172a_35%,#0284c7_100%)] px-4 py-3 text-center text-sm font-semibold text-white"
                >
                  Start Monitoring
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
