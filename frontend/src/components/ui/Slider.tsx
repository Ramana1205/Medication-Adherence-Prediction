import * as React from "react"
import { cn } from "../../lib/utils"

export interface SliderProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value?: number;
  onValueChange?: (value: number) => void;
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ className, value, onValueChange, min = 0, max = 100, ...props }, ref) => {
    return (
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onValueChange?.(Number(e.target.value))}
        className={cn(
          "w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Slider.displayName = "Slider"

export { Slider }
