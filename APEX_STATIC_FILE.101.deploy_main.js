import "./deploy_metric.min.js";

import { dropdown, login_btn } from "./deploy_elements.min.js";


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
            console.error("Failed to load deploy_menulist.min.js");
        });
}

/*
** CLICK HANDLER FOR ALL BUTTONS IN DYNAMIC DROPDOWN MENULIST
*/
dropdown.addEventListener("click", async (e) => {
    let module_name = e.target.dataset.endpoint;
    if (!module_name) return;
    module_name = "./deploy_" + module_name.substring(0,module_name.indexOf("/")) + ".min.js";
    import(module_name)
        .then((module) => {
            module.init(e.target);
        })
        .catch((error) => {
            console.error(error);
            console.error("Failed to load " + module_name);
        });
})

/*
** SOMEONE CLICKS PROMOTION BUTTON - LOG IN 
*/
document.querySelector(".promotion").addEventListener("click", () => {
    login_btn.dataset.promotion = true;
    login_btn.click();
})