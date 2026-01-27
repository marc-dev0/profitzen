import { useState, useEffect, useRef } from "react";
import { Calendar } from "lucide-react";

interface FormattedDateInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

export function FormattedDateInput({ value, onChange, placeholder }: FormattedDateInputProps) {
    const [inputValue, setInputValue] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);
    const dateInputRef = useRef<HTMLInputElement>(null);

    // Format yyyy-MM-dd to dd/MM/yyyy
    const formatDateToDisplay = (isoStr: string) => {
        if (!isoStr) return "";
        const [y, m, d] = isoStr.split('-');
        if (!y || !m || !d) return isoStr;
        return `${d}/${m}/${y}`;
    };

    // Sync internal state when prop changes
    useEffect(() => {
        setInputValue(formatDateToDisplay(value));
    }, [value]);

    const handleTextChange = (text: string) => {
        setInputValue(text);

        // Allow entering just numbers and slashes
        if (!/^[\d/]*$/.test(text)) return;

        // Try to parse dd/MM/yyyy
        const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (match) {
            const day = parseInt(match[1], 10);
            const month = parseInt(match[2], 10);
            const year = parseInt(match[3], 10);

            // Validate date
            const date = new Date(year, month - 1, day);
            if (
                date.getFullYear() === year &&
                date.getMonth() === month - 1 &&
                date.getDate() === day
            ) {
                // Return yyyy-MM-dd
                const isoDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                onChange(isoDate);
            }
        } else if (text === "") {
            onChange("");
        }
    };

    const handleDateSelect = (isoDate: string) => {
        onChange(isoDate);
        // inputValue updated by useEffect
    };

    const openDatePicker = () => {
        if (dateInputRef.current) {
            try {
                dateInputRef.current.showPicker();
            } catch (e) {
                console.error("Browser does not support showPicker", e);
            }
        }
    };

    return (
        <div className="relative">
            <div
                className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center z-10 cursor-pointer hover:text-primary transition-colors"
                onClick={openDatePicker}
            >
                <Calendar className="h-4 w-4 text-muted-foreground" />
            </div>
            <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => handleTextChange(e.target.value)}
                placeholder={placeholder || "dd/mm/yyyy"}
                maxLength={10}
                className="pl-10 h-10 w-full min-w-[180px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent cursor-text text-foreground"
            />
            {/* Hidden date input for popup */}
            <input
                ref={dateInputRef}
                type="date"
                value={value}
                onChange={(e) => handleDateSelect(e.target.value)}
                className="absolute opacity-0 pointer-events-none w-0 h-0 bottom-0"
                tabIndex={-1}
            />
        </div>
    );
}
