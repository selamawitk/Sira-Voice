export const PrimaryButton = ({ children, onClick, type = "button" }) => (
  <button
    type={type}
    onClick={onClick}
    className="w-full bg-[#2BB8B8] text-slate-950 py-4 rounded-2xl font-black text-lg hover:brightness-110 transition-all active:scale-[0.98] shadow-xl shadow-[#2BB8B8]/15"
  >
    {children}
  </button>
);