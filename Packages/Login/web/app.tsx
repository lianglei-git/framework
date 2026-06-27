import ReactDOM from "react-dom/client"
import { configure } from "mobx"
import { LoginPage } from './src/ui/LoginPage'

configure({ enforceActions: "never" })

const rootEl = document.getElementById("root") as HTMLElement
const reactRoot = ReactDOM.createRoot(rootEl)
reactRoot.render(<LoginPage />)
