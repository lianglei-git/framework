import React from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { observer } from 'mobx-react-lite'
import { hasSubAppRedirectContext } from '../../routes/loginEntry'
import { handleSSOCallbackResult } from '../../utils/handleSSOCallbackResult'
import { useAuth } from '../../hooks/useAuth'
import styles from './AccountLayout.module.less'

export const AccountLayout: React.FC = observer(() => {
    const auth = useAuth()
    const hasOriginApp = hasSubAppRedirectContext()

    return (
        <div className={styles.page}>
            {hasOriginApp && (
                <div className={styles.returnBar}>
                    <span>已连接到子应用授权链路，保存后可立即返回。</span>
                    <button
                        type="button"
                        className={styles.returnButton}
                        onClick={() => handleSSOCallbackResult({ afterLogin: true })}
                    >
                        返回应用
                    </button>
                </div>
            )}
            <div className={styles.shell}>
                <nav className={styles.sideNav}>
                    <NavLink
                        end
                        to="/account"
                        className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
                    >
                        个人资料
                    </NavLink>
                    <NavLink
                        to="/account/security"
                        className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
                    >
                        账号安全
                    </NavLink>
                </nav>

                <section className={styles.contentCard}>
                    <div className={styles.topActions}>
                        <button type="button" className={styles.logoutButton} onClick={() => auth.ssoLogout()}>
                            退出登录
                        </button>
                    </div>
                    <Outlet />
                </section>
            </div>
        </div>
    )
})
