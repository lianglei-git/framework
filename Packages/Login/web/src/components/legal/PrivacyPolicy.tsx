import React from 'react'
import { LegalModal } from './LegalModal'

interface PrivacyPolicyProps {
    visible: boolean
    onClose: () => void
}

const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ visible, onClose }) => {
    return (
        <LegalModal visible={visible} onClose={onClose} title="隐私政策">
            <section>
                <h4>1. 我们收集的信息</h4>
                <ul>
                    <li>账户信息：邮箱、手机号、用户名等注册必要信息。</li>
                    <li>使用数据：功能使用记录、设备信息、日志与崩溃信息，用于改进产品质量。</li>
                    <li>可选信息：你自愿提供的头像、昵称、偏好等个性化设置。</li>
                </ul>
            </section>
            <section>
                <h4>2. 我们如何使用信息</h4>
                <ul>
                    <li>用于创建与维护账户、提供与改进服务、个性化体验。</li>
                    <li>用于安全目的，如检测滥用与预防欺诈、风控与审计。</li>
                    <li>在获得同意或法律允许的情况下，用于活动通知、服务更新等沟通。</li>
                </ul>
            </section>
            <section>
                <h4>3. 信息共享与披露</h4>
                <ul>
                    <li>仅在以下情形共享：获得你的明确同意；为实现功能与服务之必要（委托处理与基础设施服务商）；法律法规或执法要求。</li>
                    <li>我们不会出售你的个人信息。</li>
                </ul>
            </section>
            <section>
                <h4>4. 数据的保存与跨境传输</h4>
                <p>我们在实现收集目的所必需的期间内保存你的数据，并依据法律要求确定更长或更短的保留期。若发生跨境传输，将采取合法合规的传输机制与保护措施。</p>
            </section>
            <section>
                <h4>5. 你的权利</h4>
                <ul>
                    <li>访问、更正与删除你的个人信息。</li>
                    <li>撤回同意与注销账户（在法律与合同允许的范围内）。</li>
                    <li>限制或反对特定处理；数据可携带（如适用）。</li>
                </ul>
            </section>
            <section>
                <h4>6. Cookie 与同类技术</h4>
                <p>我们可能使用 Cookie 或本地存储以记住会话状态、偏好设置与统计分析。你可以在浏览器中进行管理，但禁用后部分功能可能不可用。</p>
            </section>
            <section>
                <h4>7. 信息安全</h4>
                <p>我们采取合理可行的安全措施保护你的数据，包括加密传输、访问控制与安全审计。但互联网环境下无法保证绝对安全，请妥善保管账户凭据。</p>
            </section>
            <section>
                <h4>8. 儿童隐私</h4>
                <p>若你为未成年人，应在监护人同意与指导下使用本服务。若我们发现未经同意收集了未成年人的信息，将尽快删除。</p>
            </section>
            <section>
                <h4>9. 政策更新</h4>
                <p>我们可能适时更新本政策。重大变更将通过站内或邮件通知并在生效前给予合理时间窗口以便你审阅。</p>
            </section>
            <section>
                <h4>10. 联系我们</h4>
                <p>如对本政策有任何疑问或投诉建议，请使用页面底部的联系方式与我们沟通。</p>
            </section>
        </LegalModal>
    )
}

export { PrivacyPolicy } 