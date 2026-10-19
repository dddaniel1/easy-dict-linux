import { Select as BaseSelect } from "@base-ui/react/select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SelectProps<Value extends string> {
  items: readonly { value: Value; label: string }[];
  value?: Value;
  defaultValue?: Value;
  onValueChange: (value: Value) => void;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  className?: string;
}

export function Select<Value extends string>({
  items, value, defaultValue, onValueChange, className, ...labelProps
}: SelectProps<Value>) {
  return (
    <BaseSelect.Root
      items={items}
      value={value}
      defaultValue={defaultValue}
      onValueChange={(next) => next !== null && onValueChange(next)}
    >
      <BaseSelect.Trigger
        {...labelProps}
        className={cn("inline-flex h-7 items-center justify-between gap-2 rounded-md border border-zinc-200 bg-white px-2 text-xs text-zinc-900 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 cursor-pointer", className)}
      >
        <BaseSelect.Value />
        <BaseSelect.Icon><ChevronDown className="h-3 w-3 shrink-0" /></BaseSelect.Icon>
      </BaseSelect.Trigger>
      <BaseSelect.Portal>
        <BaseSelect.Positioner sideOffset={4} align="start" alignItemWithTrigger={false} className="z-[60] outline-none">
          <BaseSelect.Popup className="min-w-[var(--anchor-width)] max-w-[var(--available-width)] rounded-md border border-zinc-200 bg-white p-1 text-xs text-zinc-900 shadow-lg dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
            <BaseSelect.List className="max-h-[min(18rem,var(--available-height))] overflow-y-auto">
              {items.map((item) => (
                <BaseSelect.Item key={item.value} value={item.value} className="flex cursor-pointer items-center justify-between gap-3 rounded-sm px-2 py-1.5 outline-none data-[highlighted]:bg-blue-50 data-[highlighted]:text-blue-700 dark:data-[highlighted]:bg-blue-950 dark:data-[highlighted]:text-blue-200">
                  <BaseSelect.ItemText>{item.label}</BaseSelect.ItemText>
                  <BaseSelect.ItemIndicator><Check className="h-3 w-3" /></BaseSelect.ItemIndicator>
                </BaseSelect.Item>
              ))}
            </BaseSelect.List>
          </BaseSelect.Popup>
        </BaseSelect.Positioner>
      </BaseSelect.Portal>
    </BaseSelect.Root>
  );
}
