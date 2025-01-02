/*
** MAIN JAVASCRIPT MODULE SENT ON CONNECTION TO WEBSITE
*/

import { login_btn, email, expires, dropdown, menulist } from "./deploy_elements.min.js";

/*
** SET DROPDOWN ELEMENTS IF REFRESH TOKEN EXISTS
*/
if (localStorage.getItem("refresh")) {
    const arrayToken = localStorage.getItem("refresh").split(".");
    const parsedToken = JSON.parse(atob(arrayToken[1]));
    email.textContent = parsedToken.sub;
    expires.textContent = new Date(parsedToken.exp*1000).toLocaleString();
    login_btn.textContent="Log Out";
    menulist.replaceChildren();
    if (localStorage.getItem("menulist")) {
        menulist.insertAdjacentHTML('afterbegin',localStorage.getItem("menulist"));
    } else {
        login_btn.click(); // Force logout
    }
}
            
/*
** CLICK HANDLER FOR ALL BUTTONS IN DYNAMIC DROPDOWN MENULIST
*/
dropdown.addEventListener("click", async (e) => {
    const module_name = e.target.dataset.endpoint;
    if (!module_name) return;
    import("./deploy_" + module_name.substring(0,module_name.indexOf("/")) + ".min.js")
        .then((module) => {
            module.init(e.target);
        });
})