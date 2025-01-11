/*
** MAIN JAVASCRIPT MODULE ALWAYS LOADED ON CONNECTION TO WEBSITE
*/

import { dropdown, login_dialog } from "./deploy_elements.min.js";

/*
** LOGIN DIALOG IS INCLUDED IN DOWNLOADED WEBSITE DOCUMENT
*/
login_dialog.querySelector("button.close").addEventListener("click", () => {
    login_dialog.close();
})

/*
** SET DROPDOWN ELEMENTS IF REFRESH TOKEN EXISTS
*/
if (localStorage.getItem("refresh")) {
    import("./deploy_menulist.min.js")
        .then((module) => {
            module.init("menulist/:ID");
        })
        .catch((error) => {
            console.error(error);
            console.error("Failed to load JS module deploy_menulist.");
        });
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