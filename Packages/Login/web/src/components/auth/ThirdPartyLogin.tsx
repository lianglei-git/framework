import React, { useState } from 'react'
import { Button } from '../../'
import { getWechatQRCodeAPI, checkWechatLoginStatusAPI } from '../../../api'
import { globalUserStore } from '../../stores/UserStore'

interface ThirdPartyLoginProps {
    visible: boolean
    onClose: () => void
}

const ThirdPartyLogin: React.FC<ThirdPartyLoginProps> = ({ visible, onClose }) => {
    const [qrCodeUrl, setQrCodeUrl] = useState('')
    const [qrError, setQrError] = useState('')
    const [qrLoading, setQrLoading] = useState(false)
    const [polling, setPolling] = useState<number | null>(null)

    const handleGetQr = async () => {
        setQrLoading(true)
        setQrError('')
        try {
            const res = await getWechatQRCodeAPI()
            if (res.data.code === 200) {
                setQrCodeUrl(res.data.data.qrCodeUrl)
                // 开始轮询
                if (polling) clearInterval(polling)
                const timer = setInterval(async () => {
                    const statusRes = await checkWechatLoginStatusAPI(res.data.data.qrCodeId)
                    if (statusRes.data.code === 200 && statusRes.data.data.status === 'confirmed') {
                        clearInterval(timer)
                        setPolling(null)
                        globalUserStore.setUserInfo(statusRes.data.data.user, statusRes.data.data.token)
                        setTimeout(() => window.close(), 300)
                    }
                }, 2000)
                setPolling(timer as unknown as number)
            } else {
                setQrError('二维码获取失败')
            }
        } catch {
            setQrError('网络错误')
        } finally {
            setQrLoading(false)
        }
    }

    if (!visible) return null

    return (
        <div className="login-modal">
            <div className="modal-content">
                <div className="modal-header">
                    <h3>微信扫码登录</h3>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>
                <div className="qr-container">
                    {qrCodeUrl ? (
                        <div className="qr-code-section">
                            <img src={qrCodeUrl} alt="微信二维码" />
                            <p>请使用微信扫码登录</p>
                            <Button variant="secondary" onClick={handleGetQr} disabled={qrLoading}>
                                {qrLoading ? '获取中...' : '重新获取二维码'}
                            </Button>
                        </div>
                    ) : (
                        <div className="qr-placeholder">
                            <div className="qr-icon">📱</div>
                            <p>点击下方按钮获取二维码</p>
                            <Button variant="primary" onClick={handleGetQr} disabled={qrLoading}>
                                {qrLoading ? '获取中...' : '获取二维码'}
                            </Button>
                        </div>
                    )}
                    {qrError && <div className="error-message">{qrError}</div>}
                </div>
            </div>
        </div>
    )
}

export { ThirdPartyLogin } 