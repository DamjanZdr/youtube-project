import { ReactNode } from "react";

interface PhoneMockupProps {
  children: ReactNode;
}

export function PhoneMockup({ children }: PhoneMockupProps) {
  // Use calc to subtract header (~140px) and controls (~60px) from viewport height
  return (
    <div 
      className="aspect-[9/19] bg-[#0f0f0f] rounded-[2rem] md:rounded-[2.5rem] lg:rounded-[3rem] border-[6px] md:border-[8px] border-zinc-800 flex flex-col shadow-2xl overflow-hidden"
      style={{ height: 'calc(100vh - 260px)' }}
    >
      {/* Status Bar / Notch */}
      <div className="h-5 md:h-6 bg-[#0f0f0f] flex items-center justify-center shrink-0">
        <div className="w-12 md:w-16 h-3 md:h-4 bg-zinc-800 rounded-full" />
      </div>
      {children}
    </div>
  );
}
