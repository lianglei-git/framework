import React from 'react'

interface LegalModalProps {
    visible: boolean
    title: string
    onClose: () => void
    children: React.ReactNode
}

const LegalModal: React.FC<LegalModalProps> = ({ visible, title, onClose, children }) => {
    if (!visible) return null
    return (
        <div className="login-modal">{/* 复用现有弹窗覆盖层样式 */}
            <div className="modal-content" style={{ maxWidth: 720, width: '92%' }}>
                <div className="modal-header">
                    <h3>{title}</h3>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>
                <div className="legal-content">
                    {children}
                </div>
            </div>
        </div>
    )
}

export { LegalModal } 