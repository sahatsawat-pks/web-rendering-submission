export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="w-full border-t border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm mt-auto">
      <div className="container mx-auto max-w-7xl px-4 md:px-6 py-6">
        <p className="text-center text-sm text-slate-600 dark:text-slate-400">
          © {currentYear} MUICT Web Rendering Platform, developed by Kanzaki Aito.
        </p>
      </div>
    </footer>
  );
}
