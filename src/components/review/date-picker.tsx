"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function DatePicker({ initialDate }: { initialDate?: string }) {
  const router = useRouter();
  const today = new Date().toLocaleDateString("sv");
  const [date, setDate] = useState(initialDate || today);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setDate(newDate);
    router.push(`/review/?date=${newDate}`);
  };

  return (
    <div className="flex items-center gap-2">
      <input
        type="date"
        value={date}
        max={today}
        onChange={handleChange}
        className="neo-input px-3 py-1.5 text-[12px]"
      />
    </div>
  );
}
