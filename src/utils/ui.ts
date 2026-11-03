/** Shared Tailwind class sets so new components match the existing Ocean / White themes. */
export const ui = (isOcean: boolean) => ({
  card: `p-6 rounded-2xl border shadow-lg ${isOcean ? 'bg-[#004b7a] border-[#006cae]/60 text-white' : 'bg-white border-slate-200 text-slate-900'}`,
  field: `w-full px-3 py-2 rounded-xl border text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
    isOcean ? 'bg-[#003152] border-[#006cae] text-white placeholder:text-cyan-200/50' : 'bg-slate-50 border-slate-300 text-slate-900'
  }`,
  label: `block text-xs font-semibold mb-1 ${isOcean ? 'text-cyan-200' : 'text-slate-600'}`,
  muted: isOcean ? 'text-cyan-100' : 'text-slate-600',
  well: isOcean ? 'bg-[#00385c] border-[#005f9e]' : 'bg-slate-50 border-slate-200',
  divider: isOcean ? 'border-[#006cae]/40' : 'border-slate-200',
  btnPrimary: 'px-4 py-2 rounded-xl text-xs font-bold bg-[#f05a36] hover:bg-[#d94a28] disabled:opacity-60 text-white shadow-md cursor-pointer transition-all',
  btnBlue: 'px-4 py-2 rounded-xl text-xs font-bold bg-[#005f9e] hover:bg-[#004e82] disabled:opacity-60 text-white shadow-md cursor-pointer transition-all',
  btnGhost: `px-3 py-2 rounded-xl text-xs font-bold border cursor-pointer transition-all ${
    isOcean ? 'bg-[#00385c] border-[#005f9e] text-cyan-200 hover:text-white hover:bg-[#004d7c]' : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
  }`,
  modalWrap: 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto',
  modal: `max-w-2xl w-full p-6 rounded-2xl border shadow-2xl my-8 ${
    isOcean ? 'bg-[#004b7a] border-[#006cae] text-white' : 'bg-white border-slate-200 text-slate-900'
  }`,
  error: 'p-3 rounded-xl bg-rose-500/20 border border-rose-400/30 text-rose-200 text-xs font-semibold',
  ok: 'p-3 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 text-xs font-semibold',
});
