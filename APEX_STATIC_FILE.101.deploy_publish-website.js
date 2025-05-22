/*
** USER CLICKS DEPLOY BUTTON
*/

import { callAPI, handleError } from "deploy_callAPI";
import { dropdown_details } from "deploy_elements";

const info_dialog = document.querySelector("dialog.info");

let endpoint;
let intervalId;

export const init = (element) => {
    if (dropdown_details.open) {
        dropdown_details.removeAttribute("open");
    }
    
    endpoint = element.dataset.endpoint;
    
    
    const content = info_dialog.querySelector("article");
    
    callAPI(endpoint,"POST",{})
        .then( (data) => {
            content.replaceChildren();
            content.insertAdjacentHTML('afterbegin',data.content);
            info_dialog.querySelector("h4").textContent = "";
            info_dialog.querySelector("footer").replaceChildren();
            info_dialog.showModal();
            if (data.stop) return;
            if (intervalId) {
                clearInterval(intervalId);
            }
            info_dialog.addEventListener("close", () => {
                window.location.reload();
            })
            intervalId = setInterval(getDeploymentStatus,2000);
        })
        .catch((error) => {
            handleError(error);
        });;
}

/*
** SHOW NETLIFY DEPLOYMENT PROGRESS
*/
const getDeploymentStatus = () => {
    callAPI(endpoint,"GET")
        .then( (data) => {
            if (data.content) {
                info_dialog.querySelector(".deploy").insertAdjacentHTML('beforeend',data.content);
                info_dialog.querySelector(".deploy>li:last-child").scrollIntoView();
            }
            if (data.completed) {
                clearInterval(intervalId);
            }
        })
        .catch((error) => {
            handleError(error);
        })
}