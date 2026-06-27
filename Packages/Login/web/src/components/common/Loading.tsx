import React from 'react'
import { LoadingProps } from '../../types'
import './Loading.less'

export const Loading: React.FC<LoadingProps> = ({
    type = 'spinner',
    size = 'medium',
    color,
    text,
    fullScreen = false,
    overlay = false,
    className = '',
    'data-testid': dataTestId
}) => {
    const loadingClasses = [
        'loading',
        `loading--${type}`,
        `loading--${size}`,
        fullScreen && 'loading--full-screen',
        overlay && 'loading--overlay',
        className
    ].filter(Boolean).join(' ')

    const renderContent = () => {
        switch (type) {
            case 'dots':
                return renderDots()
            case 'pulse':
                return renderPulse()
            case 'ring':
                return renderRing()
            case 'bars':
                return renderBars()
            case 'spinner':
            default:
                return renderSpinner()
        }
    }

    const renderSpinner = () => (
        <div className="loading-spinner">
            <svg className="loading-spinner-svg" viewBox="0 0 24 24">
                <circle
                    className="loading-spinner-circle"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"
                />
            </svg>
        </div>
    )

    const renderDots = () => (
        <div className="loading-dots">
            <div className="loading-dot"></div>
            <div className="loading-dot"></div>
            <div className="loading-dot"></div>
        </div>
    )

    const renderPulse = () => (
        <div className="loading-pulse"></div>
    )

    const renderRing = () => (
        <div className="loading-ring">
            <div></div>
            <div></div>
            <div></div>
            <div></div>
        </div>
    )

    const renderBars = () => (
        <div className="loading-bars">
            <div className="loading-bar"></div>
            <div className="loading-bar"></div>
            <div className="loading-bar"></div>
            <div className="loading-bar"></div>
            <div className="loading-bar"></div>
        </div>
    )

    const style = color ? { color } : undefined

    return (
        <div className={loadingClasses} style={style} data-testid={dataTestId}>
            <div className="loading-content">
                {renderContent()}
                {text && <div className="loading-text">{text}</div>}
            </div>
        </div>
    )
}

// 便捷组件
export const Spinner: React.FC<Omit<LoadingProps, 'type'>> = (props) => (
    <Loading {...props} type="spinner" />
)

export const Dots: React.FC<Omit<LoadingProps, 'type'>> = (props) => (
    <Loading {...props} type="dots" />
)

export const Pulse: React.FC<Omit<LoadingProps, 'type'>> = (props) => (
    <Loading {...props} type="pulse" />
)

export const Ring: React.FC<Omit<LoadingProps, 'type'>> = (props) => (
    <Loading {...props} type="ring" />
)

export const Bars: React.FC<Omit<LoadingProps, 'type'>> = (props) => (
    <Loading {...props} type="bars" />
)

export const FullScreenLoading: React.FC<Omit<LoadingProps, 'fullScreen'>> = (props) => (
    <Loading {...props} fullScreen />
)

export const OverlayLoading: React.FC<Omit<LoadingProps, 'overlay'>> = (props) => (
    <Loading {...props} overlay />
) 