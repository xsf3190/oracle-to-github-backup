/*
** MAIN JAVASCRIPT MODULE SENT ON CONNECTION TO WEBSITE
*/

import { login_btn, login_dialog, email, expires, menulist, message_dialog } from "./deploy_elements.min.js";

/*
** SET DROPDOWN ELEMENTS IF REFRESH TOKEN EXISTS
*/
if (localStorage.getItem("refresh")) {
    const arrayToken = localStorage.getItem("refresh").split(".");
    const parsedToken = JSON.parse(atob(arrayToken[1]));
    email.textContent = parsedToken.sub;
    expires.textContent = new Date(parsedToken.exp*1000).toLocaleString();
    menulist.replaceChildren();
    login_btn.textContent="Log Out";
    if (localStorage.getItem("menulist")) {
        menulist.insertAdjacentHTML('afterbegin',localStorage.getItem("menulist"));
    } else {
        login_btn.click(); // Force logout
    }
}

/*
** CLICK HANDLER FOR LOGIN BUTTON
*/
login_btn.addEventListener("click", async () => {
    if (login_btn.textContent==="Log In") {
        import("./deploy_login_email.min.js").then(()=>{
            login_dialog.showModal();
        });
    } else if (login_btn.textContent==="Log Out") {
        sessionStorage.clear();
        localStorage.clear();
        email.classList.add("visually-hidden");
        expires.classList.add("visually-hidden");
        menulist.replaceChildren();
        login_btn.textContent = "Log In";
    } else {
        console.error("Invalid login button text", e.target.textContent); 
    }
});
            
/*
** CLICK HANDLER FOR ALL BUTTONS IN DYNAMIC DROPDOWN MENULIST
*/
menulist.addEventListener("click", async (e) => {
    console.log(e.target);
    if (e.target.dataset.endpoint.startsWith("message")) {
        import("./deploy_leave_message.min.js").then(()=>{
            message_dialog.showModal();
        });
    }
})