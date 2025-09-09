"use client";

import * as React from "react";
import { cn } from "./utils";

interface SwitchProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

// Lightweight fallback Switch (no Radix dependency)
function Switch({
  className,
  checked: controlledChecked,
  defaultChecked,
  onCheckedChange,
  disabled,
  ...rest
}: SwitchProps) {
  const isControlled = controlledChecked !== undefined;
  const [uncontrolledChecked, setUncontrolledChecked] = React.useState(!!defaultChecked);
  const checked = isControlled ? controlledChecked : uncontrolledChecked;

  const toggle = () => {
    if (disabled) return;
    const next = !checked;
    if (!isControlled) setUncontrolledChecked(next);
    onCheckedChange?.(next);
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      data-state={checked ? 'checked' : 'unchecked'}
      data-slot="switch"
      disabled={disabled}
      onClick={toggle}
      className={cn(
        "inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded-full border border-transparent transition-all outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
        checked ? 'bg-primary' : 'bg-switch-background dark:bg-input/80',
        className
      )}
      {...rest}
    >
      <span
        data-slot="switch-thumb"
        data-state={checked ? 'checked' : 'unchecked'}
        className={cn(
          "pointer-events-none block size-4 rounded-full ring-0 transition-transform",
          checked ? 'translate-x-[calc(100%-2px)] bg-primary-foreground' : 'translate-x-0 bg-card dark:bg-card-foreground'
        )}
      />
    </button>
  );
}

export { Switch };
