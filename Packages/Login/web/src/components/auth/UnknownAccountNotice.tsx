import React from 'react'
import { Button } from '../common'

export interface UnknownAccountNoticeProps {
    onCreateAccount: () => void
}

export const UnknownAccountNotice: React.FC<UnknownAccountNoticeProps> = ({
    onCreateAccount,
}) => {
    return (
        <div className="unknown-account-notice">
            <h4 className="unknown-account-title">该账号不存在</h4>
            <p className="unknown-account-desc">请检查输入，或创建新账户</p>
            <Button type="button" variant="primary" fullWidth onClick={onCreateAccount}>
                创建账户
            </Button>
        </div>
    )
}
