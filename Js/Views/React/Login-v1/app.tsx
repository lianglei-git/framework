import ReactDOM from "react-dom/client";
import { configure, reaction } from "mobx";
import { Login } from './Login'
configure({
    enforceActions: "never",
});
const rootEl = document.getElementById("root") as HTMLElement;

const reactRoot = ReactDOM.createRoot(rootEl);



window.onload = () => {
    reactRoot.render(<Login />)
}
