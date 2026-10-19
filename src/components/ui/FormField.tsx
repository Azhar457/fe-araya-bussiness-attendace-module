import { Children, cloneElement, isValidElement, type InputHTMLAttributes, type ReactElement, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

import { AlertIcon } from "@/components/ui/Icons";

const CONTROL =
  "w-full rounded-sm border border-line-strong bg-surface px-3 text-body text-text placeholder:text-muted aria-invalid:border-danger-solid disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-muted";

export function Input({ className = "", ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...rest} className={`h-control ${CONTROL} ${className}`} />;
}

export function Select({ className = "", ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...rest} className={`h-control ${CONTROL} ${className}`} />;
}

export function Textarea({ className = "", ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...rest} className={`py-3 ${CONTROL} ${className}`} />;
}

export type RadioOption = { value: string; label: string };

export type RadioGroupProps = {
  id: string;
  name: string;
  legend: string;
  required?: boolean;
  options: RadioOption[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
};

/** Grup radio 2-3 pilihan: fieldset + legend, bukan bungkus FormField. */
export function RadioGroup({
  id,
  name,
  legend,
  required,
  options,
  value,
  onChange,
  error,
}: RadioGroupProps) {
  const errorId = `${id}-error`;
  return (
    <fieldset className="flex flex-col gap-2" aria-describedby={error ? errorId : undefined}>
      <legend className="text-label text-text">
        {legend}
        {required ? (
          <span className="text-danger-solid" aria-hidden>
            {" *"}
          </span>
        ) : null}
      </legend>
      <div className="flex flex-wrap gap-5">
        {options.map((option) => (
          <label key={option.value} htmlFor={`${id}-${option.value}`} className="flex items-center gap-2 text-body">
            <input
              id={`${id}-${option.value}`}
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              aria-invalid={error ? true : undefined}
              onChange={() => onChange(option.value)}
              className="size-4 accent-primary"
            />
            {option.label}
          </label>
        ))}
      </div>
      {error ? (
        <p id={errorId} className="flex items-center gap-2 text-caption text-danger-fg">
          <AlertIcon aria-hidden />
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

export type FormFieldProps = {
  /** Wajib: id kolom; dipakai juga untuk tautan label, error, dan hint. */
  id: string;
  label: string;
  required?: boolean;
  optional?: boolean;
  error?: string;
  hint?: ReactNode;
  children: ReactNode;
};

/** Merangkai label, kontrol, dan pesan error sesuai aturan aksesibilitas. */
export function FormField({ id, label, required, optional, error, hint, children }: FormFieldProps) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = error ? errorId : hint ? hintId : undefined;

  const control = Children.only(children);
  const wired = isValidElement(control)
    ? cloneElement(control as ReactElement<Record<string, unknown>>, {
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy,
      })
    : control;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-label text-text">
        {label}
        {required ? (
          <span className="text-danger-solid" aria-hidden>
            {" *"}
          </span>
        ) : null}
        {optional ? <span className="font-normal text-muted">{" (opsional)"}</span> : null}
      </label>
      {wired}
      {error ? (
        <p id={errorId} className="flex items-center gap-2 text-caption text-danger-fg">
          <AlertIcon aria-hidden />
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-caption text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
