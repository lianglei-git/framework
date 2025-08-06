import React, { forwardRef, useState } from 'react'
import { InputProps } from '../../types'
import './Input.less'

export const Input = forwardRef<HTMLInputElement, InputProps>(({
    type = 'text',
    placeholder,
    value,
    onChange,
    onBlur,
    onFocus,
    error,
    disabled = false,
    readonly = false,
    required = false,
    autoComplete,
    autoFocus = false,
    maxLength,
    minLength,
    pattern,
    icon,
    iconPosition = 'left',
    clearable = false,
    showPasswordToggle = false,
    size = 'medium',
    fullWidth = false,
    label,
    helperText,
    className = '',
    'data-testid': dataTestId
}, ref) => {
    const [isFocused, setIsFocused] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        onChange(event.target.value)
    }

    const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
        setIsFocused(true)
        onFocus?.()
    }

    const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
        setIsFocused(false)
        onBlur?.()
    }

    const handleClear = () => {
        onChange('')
    }

    const handlePasswordToggle = () => {
        setShowPassword(!showPassword)
    }

    const getInputType = () => {
        if (type === 'password' && showPassword) {
            return 'text'
        }
        return type
    }

    const inputClasses = [
        'input',
        `input--${size}`,
        fullWidth && 'input--full-width',
        isFocused && 'input--focused',
        error && 'input--error',
        disabled && 'input--disabled',
        readonly && 'input--readonly',
        icon && `input--has-icon input--icon-${iconPosition}`,
        className
    ].filter(Boolean).join(' ')

    const renderIcon = () => {
        if (!icon) return null
        return (
            <span className={`input-icon input-icon--${iconPosition}`}>
                {icon}
            </span>
        )
    }

    const renderPasswordToggle = () => {
        if (!showPasswordToggle || type !== 'password') return null

        return (
            <button
                type="button"
                className="input-password-toggle"
                onClick={handlePasswordToggle}
                tabIndex={-1}
            >
                {showPassword ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                    </svg>
                )}
            </button>
        )
    }

    const renderClearButton = () => {
        if (!clearable || !value || disabled || readonly) return null

        return (
            <button
                type="button"
                className="input-clear"
                onClick={handleClear}
                tabIndex={-1}
            >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
            </button>
        )
    }

    const renderHelperText = () => {
        if (!helperText && !error) return null

        return (
            <div className={`input-helper ${error ? 'input-helper--error' : ''}`}>
                {error || helperText}
            </div>
        )
    }

    return (
        <div className="input-wrapper">
            {label && (
                <label className="input-label">
                    {label}
                    {required && <span className="input-required">*</span>}
                </label>
            )}

            <div className="input-container">
                {iconPosition === 'left' && renderIcon()}

                <input
                    ref={ref}
                    type={getInputType()}
                    placeholder={placeholder}
                    value={value}
                    onChange={handleChange}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    disabled={disabled}
                    readOnly={readonly}
                    required={required}
                    autoComplete={autoComplete}
                    autoFocus={autoFocus}
                    maxLength={maxLength}
                    minLength={minLength}
                    pattern={pattern}
                    className={inputClasses}
                    data-testid={dataTestId}
                />

                {iconPosition === 'right' && renderIcon()}
                {renderPasswordToggle()}
                {renderClearButton()}
            </div>

            {renderHelperText()}
        </div>
    )
})

Input.displayName = 'Input'

// 便捷组件
export const TextInput: React.FC<Omit<InputProps, 'type'>> = (props) => (
    <Input {...props} type="text" />
)

export const EmailInput: React.FC<Omit<InputProps, 'type'>> = (props) => (
    <Input {...props} type="email" />
)

export const PasswordInput: React.FC<Omit<InputProps, 'type'>> = (props) => (
    <Input {...props} type="password" showPasswordToggle />
)

export const TelInput: React.FC<Omit<InputProps, 'type'>> = (props) => (
    <Input {...props} type="tel" />
)

export const NumberInput: React.FC<Omit<InputProps, 'type'>> = (props) => (
    <Input {...props} type="number" />
)

export const UrlInput: React.FC<Omit<InputProps, 'type'>> = (props) => (
    <Input {...props} type="url" />
)

export const SearchInput: React.FC<Omit<InputProps, 'type'>> = (props) => (
    <Input {...props} type="search" />
) 