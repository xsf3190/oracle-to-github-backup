/*
** RETRIEVE CURRENT MENULIST FOR USER
*/

import { login_btn, email, expires, menulist } from "./deploy_elements.min.js";
import { callAPI, handleError } from "./deploy_callAPI.min.js";

export const init = (endpoint) => {
    const arrayToken = localStorage.getItem("refresh").split(".");
    const parsedToken = JSON.parse(atob(arrayToken[1]));
    email.textContent = parsedToken.sub;
    expires.textContent = new Date(parsedToken.exp*1000).toLocaleString();
    login_btn.textContent="Log Out";

    if (sessionStorage.getItem("menulist")) {
        menulist.replaceChildren();
        menulist.insertAdjacentHTML('afterbegin',sessionStorage.getItem("menulist"));
        document.body.insertAdjacentHTML('beforeend',sessionStorage.getItem("dialogs"));
        closeBtnEvents();
        return;
    }
    
    callAPI(endpoint, "GET")
        .then((data) => {
            sessionStorage.setItem("menulist",data.menulist);
            sessionStorage.setItem("dialogs",data.dialogs);
            menulist.replaceChildren();
            menulist.insertAdjacentHTML('afterbegin',data.menulist);
            document.body.insertAdjacentHTML('beforeend',data.dialogs);
            closeBtnEvents();
        })
        .catch((error) => {
            handleError(error);
        });
}

/*
** CLOSE DIALOGS BY CLICKING X BUTTON
*/
const closeBtnEvents = () => {
    document.querySelectorAll("dialog button.close").forEach((button) => {
        button.addEventListener("click", (e) => {
        e.target.closest("dialog").close();
        });
    });
}