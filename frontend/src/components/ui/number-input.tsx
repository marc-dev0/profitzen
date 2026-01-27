import * as React from "react"
import { Input } from "./input"

export interface NumberInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  decimals?: number
}

const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  ({ value, onChange, min, max, step = 1, decimals = 0, onFocus, ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState(String(value))

    React.useEffect(() => {
      setDisplayValue(String(value))
    }, [value])

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      e.target.select()
      onFocus?.(e)
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value

      const validCharsRegex = decimals > 0 ? /^-?\d*[.,]?\d*$/ : /^-?\d*$/

      if (val !== '' && !validCharsRegex.test(val)) {
        return
      }

      const decimalCount = (val.match(/[.,]/g) || []).length
      if (decimalCount > 1) {
        return
      }

      setDisplayValue(val)

      if (val === '') {
        onChange(0)
        return
      }

      if (val === '-' || val === '.' || val === ',') {
        return
      }

      const normalizedVal = val.replace(',', '.')

      const num = decimals > 0 ? parseFloat(normalizedVal) : parseInt(normalizedVal)
      if (!isNaN(num)) {
        if (min !== undefined && num < min) return
        if (max !== undefined && num > max) return
        onChange(num)
      }
    }

    return (
      <Input
        ref={ref}
        type="text"
        inputMode={decimals > 0 ? "decimal" : "numeric"}
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        {...props}
      />
    )
  }
)
NumberInput.displayName = "NumberInput"

export { NumberInput }
