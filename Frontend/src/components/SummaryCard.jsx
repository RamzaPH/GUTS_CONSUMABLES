const SummaryCard = ({ label, value, subtitle, icon: Icon }) => {
  return (
    <article className="flex h-full min-h-[150px] flex-col justify-between rounded-2xl border border-[var(--brand-secondary-soft)] bg-white p-4 text-center transition-colors duration-300 dark:border-slate-700 dark:bg-slate-800 sm:min-h-[170px] sm:p-5">
      <div>
        <div className="mb-3 flex items-center justify-center gap-2 sm:mb-4 sm:gap-3">
          <span className="inline-flex rounded-lg bg-slate-100 p-2 text-[var(--brand-primary)] dark:bg-slate-700 dark:text-yellow-400 transition-colors duration-300">
            <Icon className="h-4 w-4" />
          </span>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 transition-colors duration-300 dark:text-slate-400 sm:text-xs">{label}</p>
        </div>
        <h3 className="font-title text-3xl font-extrabold text-slate-800 transition-colors duration-300 dark:text-white sm:text-4xl">{value}</h3>
      </div>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 transition-colors duration-300">{subtitle}</p>
    </article>
  )
}

export default SummaryCard
