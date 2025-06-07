/*
** RETRIEVE CURRENT MENULIST FOR USER
*/

import { login_btn, email, expires, dropdown, getJWTClaim } from "deploy_elements";
import { callAPI, handleError } from "deploy_callAPI";

export const init = (endpoint) => {
    email.textContent = getJWTClaim("sub") + " (" + getJWTClaim("aud") + ")";
    expires.textContent = getJWTClaim("exp")
    login_btn.textContent="Log Out";

    if (sessionStorage.getItem("menulist")) {
        dropdown.querySelectorAll("li:nth-child(n+4)").forEach((item) => {
            item.remove();
        });
        dropdown.insertAdjacentHTML('beforeend',sessionStorage.getItem("menulist"));
        document.body.insertAdjacentHTML('beforeend',sessionStorage.getItem("dialogs"));
        closeBtnEvents();
        return;
    }
    
    callAPI(endpoint, "GET")
        .then((data) => {
            sessionStorage.setItem("menulist",data.menulist);
            sessionStorage.setItem("dialogs",data.dialogs);
            dropdown.querySelectorAll("li:nth-child(n+4)").forEach((item) => {
                item.remove();
            });
            dropdown.insertAdjacentHTML('beforeend',data.menulist);
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