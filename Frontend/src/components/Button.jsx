const Button = ({
  children,
  variant = "primary",
  className = "",
  type = "button",
  ...props
}) => {
  const variants = {
    primary:
      "bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-strong)] focus-visible:ring-[var(--color-brand)] dark:bg-red-600 dark:hover:bg-red-700 dark:focus-visible:ring-red-500 transition-colors duration-300",
    secondary:
      "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-[var(--brand-secondary-soft)] focus-visible:ring-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 dark:border-slate-600 dark:focus-visible:ring-slate-500 transition-colors duration-300",
    edit:
      "bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/20 border border-[var(--brand-primary)]/30 focus-visible:ring-[var(--brand-primary)] dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/50 dark:border-red-900/50 dark:focus-visible:ring-red-500 transition-colors duration-300",
    delete:
      "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 focus-visible:ring-rose-300 dark:bg-rose-950/30 dark:text-rose-400 dark:hover:bg-rose-950/50 dark:border-rose-900/50 dark:focus-visible:ring-rose-500 transition-colors duration-300",
    ghost:
      "bg-white/80 text-slate-700 hover:bg-white border border-slate-200 focus-visible:ring-slate-300 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:bg-slate-800 dark:border-slate-700 dark:focus-visible:ring-slate-600 transition-colors duration-300"
  }

  return (
    <button
      type={type}
      className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export default Button
