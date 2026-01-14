export function YouTubeLogo({ size = "md" }: { size?: "sm" | "md" }) {
  const sm = size === "sm";
  return (
    <div className={`flex items-center gap-0.5 ${sm ? "scale-75" : ""}`}>
      <div className={`${sm ? "w-5 h-3.5" : "w-6 h-4"} bg-red-600 rounded-sm flex items-center justify-center`}>
        <div className="w-0 h-0 border-l-[5px] border-l-white border-y-[3px] border-y-transparent ml-0.5" />
      </div>
      <span className={`text-white font-semibold ${sm ? "text-[10px]" : "text-xs"}`}>YouTube</span>
    </div>
  );
}
