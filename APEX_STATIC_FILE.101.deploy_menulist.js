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
        return;
    }
    console.log("endpoint",endpoint);
    
    callAPI(endpoint, "GET")
        .then((data) => {
            sessionStorage.setItem("menulist",data.menulist);
            sessionStorage.setItem("dialogs",data.dialogs);
            menulist.replaceChildren();
            menulist.insertAdjacentHTML('afterbegin',data.menulist);
            document.body.insertAdjacentHTML('beforeend',data.dialogs);
        })
        .catch((error) => {
            handleError(error);
        });
}