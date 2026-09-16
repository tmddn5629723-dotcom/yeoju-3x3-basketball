"use client";

import { forwardRef } from "react";
import { formatPhoneNumber } from "@/lib/validation";

interface PhoneInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  "aria-invalid"?: boolean;
}

/**
 * 모바일에서 숫자 키패드가 뜨도록 inputMode="numeric" 을 사용하고,
 * 입력 즉시 010-1234-5678 형태로 자동 하이픈을 적용합니다.
 */
export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  function PhoneInput({ id, value, onChange, placeholder, ...rest }, ref) {
    return (
      <input
        ref={ref}
        id={id}
        name={id}
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
        placeholder={placeholder ?? "010-1234-5678"}
        value={value}
        maxLength={13}
        onChange={(e) => onChange(formatPhoneNumber(e.target.value))}
        className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
        {...rest}
      />
    );
  }
);
