import React, { useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { observer } from 'mobx-react-lite'
import { globalUserStore } from '../stores/UserStore'

export const RequireAuth: React.FC = observer(() => {
    const location = useLocation()

    useEffect(() => {
        if (globalUserStore.isAuthenticated) {
            void globalUserStore.requestUserDetailsInfo()
        }
    }, [globalUserStore.isAuthenticated])

    if (!globalUserStore.isAuthenticated) {
        return <Navigate to="/" replace state={{ from: location }} />
    }

    return <Outlet />
})
