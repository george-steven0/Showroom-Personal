import type { ReactNode } from 'react'
import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form'
import { DatePicker, Input, InputNumber, Select } from 'antd'
import type { SelectProps } from 'antd'
import dayjs from 'dayjs'
import { formatIso } from '@/lib/format'

export function FormRow({ children, cols = 2 }: { children: ReactNode; cols?: 1 | 2 | 3 | 4 }) {
  const map = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  } as const
  return <div className={`grid gap-4 ${map[cols]}`}>{children}</div>
}

export interface FieldShellProps {
  label?: ReactNode
  required?: boolean
  error?: string
  hint?: ReactNode
  children: ReactNode
  className?: string
  htmlFor?: string
}

export function FieldShell({ label, required, error, hint, children, className = '', htmlFor }: FieldShellProps) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-ink">
          {label}
          {required && (
            <span className="ms-1 text-danger" aria-hidden>
              *
            </span>
          )}
        </label>
      )}
      {children}
      {error ? (
        <p role="alert" className="mt-1 text-xs font-medium text-danger">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1 text-xs text-muted">{hint}</p>
      )}
    </div>
  )
}

interface BaseProps<T extends FieldValues> {
  control: Control<T>
  name: FieldPath<T>
  label?: ReactNode
  required?: boolean
  hint?: ReactNode
  placeholder?: string
  disabled?: boolean
  className?: string
  autoFocus?: boolean
}

export function TextField<T extends FieldValues>({
  control,
  name,
  label,
  required,
  hint,
  placeholder,
  disabled,
  className,
  autoFocus,
  type = 'text',
}: BaseProps<T> & { type?: 'text' | 'password' | 'email' | 'tel' }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FieldShell label={label} required={required} hint={hint} error={fieldState.error?.message} className={className} htmlFor={field.name}>
          {type === 'password' ? (
            <Input.Password
              {...field}
              id={field.name}
              value={field.value ?? ''}
              status={fieldState.error ? 'error' : undefined}
              placeholder={placeholder}
              disabled={disabled}
              autoFocus={autoFocus}
              autoComplete="new-password"
            />
          ) : (
            <Input
              {...field}
              id={field.name}
              type={type}
              value={field.value ?? ''}
              status={fieldState.error ? 'error' : undefined}
              placeholder={placeholder}
              disabled={disabled}
              autoFocus={autoFocus}
            />
          )}
        </FieldShell>
      )}
    />
  )
}

export function NumberField<T extends FieldValues>({
  control,
  name,
  label,
  required,
  hint,
  placeholder,
  disabled,
  className,
  min = 0,
  max,
  step = 1,
  precision,
  suffix,
  grouping = true,
}: BaseProps<T> & { min?: number; max?: number; step?: number; precision?: number; suffix?: ReactNode; grouping?: boolean }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FieldShell label={label} required={required} hint={hint} error={fieldState.error?.message} className={className} htmlFor={field.name}>
          <InputNumber
            id={field.name}
            value={field.value ?? null}
            onChange={(value) => field.onChange(value)}
            onBlur={field.onBlur}
            status={fieldState.error ? 'error' : undefined}
            placeholder={placeholder}
            disabled={disabled}
            min={min}
            max={max}
            step={step}
            precision={precision}
            suffix={suffix}
            className="w-full"
            {...(grouping
              ? {
                  formatter: (value) => (value == null ? '' : `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')),
                  parser: (value) => (value ? Number(value.replace(/,/g, '')) : null) as never,
                }
              : {})}
          />
        </FieldShell>
      )}
    />
  )
}

export function SelectField<T extends FieldValues>({
  control,
  name,
  label,
  required,
  hint,
  placeholder,
  disabled,
  className,
  options,
  allowClear,
  showSearch = true,
  onAfterChange,
  notFoundContent,
  loading,
  filterOption,
}: BaseProps<T> & {
  options: SelectProps['options']
  allowClear?: boolean
  showSearch?: boolean
  onAfterChange?: (value: unknown) => void
  notFoundContent?: ReactNode
  loading?: boolean
  filterOption?: SelectProps['filterOption']
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FieldShell label={label} required={required} hint={hint} error={fieldState.error?.message} className={className} htmlFor={field.name}>
          <Select
            id={field.name}
            value={field.value ?? undefined}
            onChange={(value) => {
              field.onChange(value)
              onAfterChange?.(value)
            }}
            onBlur={field.onBlur}
            status={fieldState.error ? 'error' : undefined}
            placeholder={placeholder}
            disabled={disabled}
            options={options}
            allowClear={allowClear}
            showSearch={showSearch}
            loading={loading}
            notFoundContent={notFoundContent}
            optionFilterProp={filterOption ? undefined : 'label'}
            filterOption={filterOption}
            className="w-full"
          />
        </FieldShell>
      )}
    />
  )
}

export function DateField<T extends FieldValues>({
  control,
  name,
  label,
  required,
  hint,
  placeholder,
  disabled,
  className,
  maxToday = false,
}: BaseProps<T> & { maxToday?: boolean }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FieldShell label={label} required={required} hint={hint} error={fieldState.error?.message} className={className} htmlFor={field.name}>
          <DatePicker
            id={field.name}
            value={field.value ? dayjs(field.value) : null}
            onChange={(date) => field.onChange(date ? formatIso(date) : null)}
            onBlur={field.onBlur}
            status={fieldState.error ? 'error' : undefined}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full"
            disabledDate={(current) => Boolean(maxToday && current && current.isAfter(dayjs(), 'day'))}
          />
        </FieldShell>
      )}
    />
  )
}

export function TextAreaField<T extends FieldValues>({
  control,
  name,
  label,
  required,
  hint,
  placeholder,
  disabled,
  className,
  rows = 3,
}: BaseProps<T> & { rows?: number }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FieldShell label={label} required={required} hint={hint} error={fieldState.error?.message} className={className} htmlFor={field.name}>
          <Input.TextArea
            {...field}
            id={field.name}
            value={field.value ?? ''}
            status={fieldState.error ? 'error' : undefined}
            placeholder={placeholder}
            disabled={disabled}
            rows={rows}
          />
        </FieldShell>
      )}
    />
  )
}
