import React from 'react'
import { LegalModal } from './LegalModal'

interface TermsOfServiceProps {
    visible: boolean
    onClose: () => void
}

const TermsOfService: React.FC<TermsOfServiceProps> = ({ visible, onClose }) => {
    return (
        <LegalModal visible={visible} onClose={onClose} title="使用条款">
            <section>
                <h4>1. 接受条款</h4>
                <p>使用本产品即表示你同意遵守本《使用条款》及后续更新版本。若你不同意，请立即停止使用。本条款与我们的《隐私政策》共同构成你与我们之间的完整协议。</p>
            </section>
            <section>
                <h4>2. 账户与安全</h4>
                <ul>
                    <li>你应对注册账户的真实性、准确性与完整性负责，并及时更新。</li>
                    <li>你需妥善保管账户凭据，对通过账户进行的一切活动承担责任。</li>
                    <li>若发现账户被未授权使用，请第一时间联系我们。</li>
                </ul>
            </section>
            <section>
                <h4>3. 使用限制</h4>
                <ul>
                    <li>不得利用本服务从事任何违法、侵权、欺诈或破坏性行为。</li>
                    <li>不得以任何方式试图绕过访问控制、探测或扫描系统漏洞。</li>
                    <li>不得未经授权抓取、存储或分享他人个人信息。</li>
                </ul>
            </section>
            <section>
                <h4>4. 服务变更与中断</h4>
                <p>我们可能根据业务需要对功能进行迭代、优化或暂停，重大变更会通过站内或邮件通知。对于不可抗力或第三方原因导致的服务不可用，我们将尽力恢复但不承担由此造成的间接损失。</p>
            </section>
            <section>
                <h4>5. 知识产权</h4>
                <p>本服务中的软件、标识、界面与文档等均受相关法律保护。未经授权，不得复制、修改、分发或制作衍生作品。你对上传的内容保留权利，但授予我们为提供服务之目的进行必要的存储、展示与备份的非独占许可。</p>
            </section>
            <section>
                <h4>6. 责任限制</h4>
                <p>在适用法律允许的最大范围内，我们对因使用或无法使用本服务造成的任何间接、偶然或后果性损失不承担责任。对付费服务，我们的总责任不超过你在争议发生前最近十二个月为该服务支付的费用总额。</p>
            </section>
            <section>
                <h4>7. 终止</h4>
                <p>如你严重违反本条款或适用法律，我们有权在通知或无需通知的情况下暂停或终止对你的服务。你也可随时停止使用并注销账户。</p>
            </section>
            <section>
                <h4>8. 适用法律与争议解决</h4>
                <p>本条款适用你所在地或我们主要经营地的法律（不含冲突法）。若发生争议，双方应先友好协商，协商不成的，提交有管辖权的法院诉讼解决。</p>
            </section>
            <section>
                <h4>9. 联系我们</h4>
                <p>如对本条款有任何疑问，或需要行使你的权利，请通过页面底部的联系方式与我们沟通。</p>
            </section>
        </LegalModal>
    )
}

export { TermsOfService } 