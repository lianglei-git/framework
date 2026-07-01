import ReactDOM from "react-dom/client"
import { configure } from "mobx"
import { BrowserRouter } from 'react-router-dom'
import { AppRoutes } from './src/routes/AppRoutes'

configure({ enforceActions: "never" })

const rootEl = document.getElementById("root") as HTMLElement
const reactRoot = ReactDOM.createRoot(rootEl)
reactRoot.render(
    <BrowserRouter>
        <AppRoutes />
    </BrowserRouter>
)
