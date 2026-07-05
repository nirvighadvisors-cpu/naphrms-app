import * as React from "react"
import { format, isValid } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import type { Matcher } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
  placeholder?: string;
  disabled?: Matcher | Matcher[] | boolean;
}

export function DatePicker({ value, onChange, className, placeholder = "dd/mm/yyyy", disabled }: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  // Parse string YYYY-MM-DD to Date
  const date = React.useMemo(() => {
    if (!value) return undefined;
    // Check if ISO format or just YYYY-MM-DD
    const parsed = new Date(value);
    return isValid(parsed) ? parsed : undefined;
  }, [value]);

  const handleSelect = (selectedDate: Date | undefined) => {
    if (selectedDate && onChange) {
      // Format as YYYY-MM-DD to be compatible with standard <input type="date"> APIs
      const formatted = format(selectedDate, "yyyy-MM-dd");
      onChange(formatted);
    }
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal bg-background h-10 px-3 py-2",
            !date && "text-text-muted",
            className
          )}
          disabled={disabled === true}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "dd/MM/yyyy") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 z-[100]" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
          initialFocus
          disabled={disabled}
          captionLayout="dropdown-buttons"
          fromYear={1900}
          toYear={2100}
        />
      </PopoverContent>
    </Popover>
  )
}
