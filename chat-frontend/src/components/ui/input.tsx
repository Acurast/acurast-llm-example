import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", ...props }, ref) => {
    return (
      <input
        className={`w-full px-4 py-3 text-[15px] border border-[#E5E5E5] rounded-lg bg-white placeholder:text-[#909090] focus:outline-none focus:border-[#D1D1D1] ${className}`}
        ref={ref}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";
