import {
  Children,
  isValidElement,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FocusEvent as ReactFocusEvent,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/utils/cn';

const baseControlClassName =
  'w-full rounded-[20px] border border-slate-200/90 bg-white/85 px-3.5 py-2.5 text-sm text-slate-900 shadow-[0_16px_30px_-24px_rgba(15,23,42,0.25)] outline-none transition duration-300 placeholder:text-slate-400 focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-300/25 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400';

type ParsedSelectOption = {
  value: string;
  label: ReactNode;
  textLabel: string;
  disabled: boolean;
};

const flattenTextContent = (node: ReactNode): string => {
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map(flattenTextContent).join('');
  }

  if (isValidElement(node)) {
    return flattenTextContent(node.props.children);
  }

  return '';
};

const parseSelectOptions = (children: ReactNode): ParsedSelectOption[] => {
  const options: ParsedSelectOption[] = [];

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) {
      return;
    }

    if (child.type === 'option') {
      options.push({
        value: String(child.props.value ?? ''),
        label: child.props.children,
        textLabel: flattenTextContent(child.props.children).trim(),
        disabled: Boolean(child.props.disabled),
      });
      return;
    }

    if (child.props?.children) {
      options.push(...parseSelectOptions(child.props.children));
    }
  });

  return options;
};

export function FieldLabel({
  children,
  hint,
  className,
  labelClassName,
}: {
  children: ReactNode;
  hint?: ReactNode;
  className?: string;
  labelClassName?: string;
}) {
  return (
    <div className={cn('mb-1.5 flex min-h-[1.2rem] items-center justify-between gap-3', className)}>
      <label className={cn('block min-w-0 flex-1 truncate whitespace-nowrap text-xs font-semibold uppercase tracking-[0.2em] text-slate-500', labelClassName)}>
        {children}
      </label>
      {hint ? <span className="shrink-0 text-xs text-slate-400">{hint}</span> : null}
    </div>
  );
}

export function TextInput({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(baseControlClassName, className)} {...props} />;
}

export function SelectInput({
  children,
  className,
  value,
  defaultValue,
  onChange,
  disabled,
  required,
  name,
  id,
  onBlur,
  onFocus,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const listboxId = useId();
  const [open, setOpen] = useState(false);
  const [internalValue, setInternalValue] = useState(String(defaultValue ?? ''));
  const [activeIndex, setActiveIndex] = useState(-1);
  const options = useMemo(() => parseSelectOptions(children), [children]);
  const resolvedValue = value !== undefined ? String(value ?? '') : internalValue;
  const selectedOption = options.find((option) => option.value === resolvedValue) ?? null;
  const selectedIndex = options.findIndex((option) => option.value === resolvedValue && !option.disabled);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) {
        return;
      }

      if (containerRef.current && !containerRef.current.contains(target)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (!open) {
      setActiveIndex(-1);
      return;
    }

    if (selectedIndex >= 0) {
      setActiveIndex(selectedIndex);
      return;
    }

    setActiveIndex(options.findIndex((option) => !option.disabled));
  }, [open, options, selectedIndex]);

  const emitChange = (nextValue: string) => {
    if (value === undefined) {
      setInternalValue(nextValue);
    }

    const syntheticEvent = {
      target: { value: nextValue, name, id },
      currentTarget: { value: nextValue, name, id },
    } as ChangeEvent<HTMLSelectElement>;

    onChange?.(syntheticEvent);
  };

  const selectValue = (nextValue: string) => {
    emitChange(nextValue);
    setOpen(false);
    setActiveIndex(-1);
  };

  const moveActiveIndex = (direction: 1 | -1) => {
    const enabledOptions = options
      .map((option, index) => ({ option, index }))
      .filter(({ option }) => !option.disabled);

    if (enabledOptions.length === 0) {
      return;
    }

    const currentEnabledIndex = enabledOptions.findIndex(({ index }) => index === activeIndex);
    const nextEnabledIndex = currentEnabledIndex < 0
      ? (direction === 1 ? 0 : enabledOptions.length - 1)
      : (currentEnabledIndex + direction + enabledOptions.length) % enabledOptions.length;

    setActiveIndex(enabledOptions[nextEnabledIndex].index);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      moveActiveIndex(1);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      moveActiveIndex(-1);
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }

      if (activeIndex >= 0) {
        const activeOption = options[activeIndex];
        if (activeOption && !activeOption.disabled) {
          selectValue(activeOption.value);
        }
      }
      return;
    }

    if (event.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <select
        {...props}
        id={id}
        name={name}
        value={resolvedValue}
        required={required}
        disabled={disabled}
        onChange={() => undefined}
        tabIndex={-1}
        aria-hidden="true"
        className="pointer-events-none absolute h-0 w-0 opacity-0"
      >
        {children}
      </select>

      <button
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={handleKeyDown}
        onFocus={(event) => onFocus?.(event as unknown as ReactFocusEvent<HTMLSelectElement>)}
        onBlur={(event) => {
          window.setTimeout(() => {
            if (containerRef.current && !containerRef.current.contains(document.activeElement)) {
              setOpen(false);
              setActiveIndex(-1);
            }
          }, 0);
          onBlur?.(event as unknown as ReactFocusEvent<HTMLSelectElement>);
        }}
        className={cn(
          baseControlClassName,
          'flex items-center justify-between gap-3 text-left',
          open && 'border-sky-300 bg-white ring-2 ring-sky-300/25',
          className
        )}
      >
        <span className={cn('min-w-0 flex-1 truncate', !selectedOption && 'text-slate-400')}>
          {selectedOption?.label ?? selectedOption?.textLabel ?? ''}
        </span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-slate-500 transition', open && 'rotate-180')} />
      </button>

      {open ? (
        <div
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-[24px] border border-slate-200 bg-white py-2 shadow-[0_24px_70px_-32px_rgba(15,23,42,0.32)]"
        >
          <div className="max-h-72 overflow-y-auto">
            {options.map((option, index) => {
              const isSelected = option.value === resolvedValue;
              const isActive = index === activeIndex;

              return (
                <button
                  key={`${option.value}-${index}`}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  disabled={option.disabled}
                  onMouseEnter={() => {
                    if (!option.disabled) {
                      setActiveIndex(index);
                    }
                  }}
                  onClick={() => {
                    if (!option.disabled) {
                      selectValue(option.value);
                    }
                  }}
                  className={cn(
                    'flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm transition',
                    option.disabled && 'cursor-not-allowed text-slate-300',
                    !option.disabled && (isActive || isSelected ? 'bg-sky-50 text-slate-900' : 'text-slate-700 hover:bg-sky-50')
                  )}
                >
                  <span className="min-w-0 truncate">{option.label}</span>
                  {isSelected ? <Check className="h-4 w-4 shrink-0 text-sky-600" /> : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function TextareaInput({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(baseControlClassName, className)} {...props} />;
}

export function ToggleInput({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      aria-disabled={disabled}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-7 w-12 items-center rounded-full border transition duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 disabled:cursor-not-allowed disabled:opacity-60',
        checked ? 'border-sky-400 bg-sky-500/90' : 'border-slate-200 bg-slate-200'
      )}
    >
      <span
        className={cn(
          'inline-block h-5 w-5 rounded-full bg-white shadow-sm transition duration-300',
          checked ? 'translate-x-6' : 'translate-x-1'
        )}
      />
    </button>
  );
}
