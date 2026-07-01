import ReactDOM from "react-dom/client"
import { configure } from "mobx"
import { BrowserRouter } from 'react-router-dom'
import { AppRoutes } from './src/routes/AppRoutes'
import { ensureSSOService } from './src/sso/ssoBootstrap'

configure({ enforceActions: "never" })

void ensureSSOService()

const rootEl = document.getElementById("root") as HTMLElement
const reactRoot = ReactDOM.createRoot(rootEl)
reactRoot.render(
    <BrowserRouter>
        <AppRoutes />
    </BrowserRouter>
)
