import React from 'react'
import { ButtonProps } from '../../types'
import './Button.less'

export const Button: React.FC<ButtonProps> = ({
    variant = 'primary',
    size = 'medium',
    type = 'button',
    loading = false,
    disabled = false,
    fullWidth = false,
    icon,
    iconPosition = 'left',
    onClick,
    children,
    className = '',
    'data-testid': dataTestId
}) => {
    const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
        if (!disabled && !loading && onClick) {
            onClick(event)
        }
    }

    const buttonClasses = [
        'btn',
        `btn--${variant}`,
        `btn--${size}`,
        fullWidth && 'btn--full-width',
        loading && 'btn--loading',
        disabled && 'btn--disabled',
        className
    ].filter(Boolean).join(' ')

    const renderIcon = () => {
        if (!icon) return null
        return (
            <span className={`btn-icon btn-icon--${iconPosition}`}>
                {icon}
            </span>
        )
    }

    const renderContent = () => {
        if (loading) {
            return (
                <>
                    <span className="btn-spinner">
                        <svg className="btn-spinner-svg" viewBox="0 0 24 24">
                            <circle
                                className="btn-spinner-circle"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="2"
                                fill="none"
                                strokeLinecap="round"
                            />
                        </svg>
                    </span>
                    <span className="btn-text">{children}</span>
                </>
            )
        }

        return (
            <>
                {iconPosition === 'left' && renderIcon()}
                <span className="btn-text">{children}</span>
                {iconPosition === 'right' && renderIcon()}
            </>
        )
    }

    return (
        <button
            type={type}
            className={buttonClasses}
            disabled={disabled || loading}
            onClick={handleClick}
            data-testid={dataTestId}
        >
            {renderContent()}
        </button>
    )
}

// 便捷组件
export const PrimaryButton: React.FC<Omit<ButtonProps, 'variant'>> = (props) => (
    <Button {...props} variant="primary" />
)

export const SecondaryButton: React.FC<Omit<ButtonProps, 'variant'>> = (props) => (
    <Button {...props} variant="secondary" />
)

export const DangerButton: React.FC<Omit<ButtonProps, 'variant'>> = (props) => (
    <Button {...props} variant="danger" />
)

export const GhostButton: React.FC<Omit<ButtonProps, 'variant'>> = (props) => (
    <Button {...props} variant="ghost" />
)

export const LinkButton: React.FC<Omit<ButtonProps, 'variant'>> = (props) => (
    <Button {...props} variant="link" />
) 