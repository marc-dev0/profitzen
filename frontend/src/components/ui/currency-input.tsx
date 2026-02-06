import * as React from "react"
import { NumberInput } from "./number-input"

export interface CurrencyInputProps
    extends Omit<React.ComponentPropsWithoutRef<typeof NumberInput>, 'decimals' | 'step'> {
    symbol?: string
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
    ({ symbol = "S/", className, ...props }, ref) => {
        return (
            <div className="relative group w-full">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold transition-colors group-focus-within:text-primary">
                    {symbol}
                </div>
                <NumberInput
                    ref={ref}
                    decimals={2}
                    step={0.01}
                    className={`pl-12 ${className}`}
                    {...props}
                />
            </div>
        )
    }
)
CurrencyInput.displayName = "CurrencyInput"

export { CurrencyInput }
