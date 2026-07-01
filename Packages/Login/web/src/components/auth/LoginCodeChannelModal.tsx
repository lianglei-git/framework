import React from 'react'
import { Button } from '../common'
import type { CodeChannel } from '../../utils/codeLoginContact'

export interface LoginCodeChannelModalProps {
    visible: boolean
    emailLabel: string
    phoneLabel: string
    selectedChannel: CodeChannel
    onSelect: (channel: CodeChannel) => void
    onConfirm: () => void
    onCancel: () => void
}

export const LoginCodeChannelModal: React.FC<LoginCodeChannelModalProps> = ({
    visible,
    emailLabel,
    phoneLabel,
    selectedChannel,
    onSelect,
    onConfirm,
    onCancel,
}) => {
    if (!visible) {
        return null
    }

    return (
        <div className="login-modal">
            <div className="modal-content code-channel-modal">
                <div className="modal-header">
                    <h3>选择验证方式</h3>
                    <button type="button" className="close-btn" onClick={onCancel} aria-label="关闭">
                        ×
                    </button>
                </div>
                <p className="code-channel-desc">请选择接收验证码的方式</p>
                <div className="code-channel-options">
                    <button
                        type="button"
                        className={`code-channel-option${selectedChannel === 'email' ? ' selected' : ''}`}
                        onClick={() => onSelect('email')}
                    >
                        <span className="code-channel-optionTitle">邮箱</span>
                        <span className="code-channel-optionValue">{emailLabel}</span>
                    </button>
                    <button
                        type="button"
                        className={`code-channel-option${selectedChannel === 'phone' ? ' selected' : ''}`}
                        onClick={() => onSelect('phone')}
                    >
                        <span className="code-channel-optionTitle">手机号</span>
                        <span className="code-channel-optionValue">{phoneLabel}</span>
                    </button>
                </div>
                <div className="code-channel-actions">
                    <Button type="button" variant="secondary" fullWidth onClick={onCancel}>
                        取消
                    </Button>
                    <Button type="button" variant="primary" fullWidth onClick={onConfirm}>
                        确认
                    </Button>
                </div>
            </div>
        </div>
    )
}
