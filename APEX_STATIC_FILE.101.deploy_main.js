import "./deploy_metric.min.js";

import { dropdown, login_btn, login_dialog } from "./deploy_elements.min.js";


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
    const module_name = e.target.dataset.endpoint;
    if (!module_name) return;
    const import_module_name = "./deploy_" + module_name.substring(0,module_name.indexOf("/")) + ".min.js";
    import(import_module_name)
        .then((module) => {
            module.init(e.target);
        })
        .catch((error) => {
            console.error(error);
            console.error("Failed to load " + import_module_name);
        });
})

document.querySelector(".promotion").addEventListener("click", () => {
    login_btn.dataset.promotion = true;
    login_btn.click();
})