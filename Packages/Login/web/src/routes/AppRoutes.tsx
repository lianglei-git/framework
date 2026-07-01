import React from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { LoginEntryRoute } from './LoginEntryRoute'
import { RequireAuth } from './RequireAuth'
import { AccountLayout } from '../layouts/AccountLayout/AccountLayout'
import { ProfilePage } from '../pages/account/ProfilePage'
import { SecurityPage } from '../pages/account/SecurityPage'

export const AppRoutes: React.FC = () => {
    return (
        <Routes>
            <Route path="/" element={<LoginEntryRoute />} />
            <Route path="/login" element={<LoginEntryRoute />} />
            <Route element={<RequireAuth />}>
                <Route path="/account" element={<AccountLayout />}>
                    <Route index element={<ProfilePage />} />
                    <Route path="security" element={<SecurityPage />} />
                </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    )
}
