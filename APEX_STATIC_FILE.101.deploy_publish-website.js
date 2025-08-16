/*
** USER CLICKS DEPLOY BUTTON
*/

import { callAPI, handleError } from "deploy_callAPI";
import { output_dialog } from "deploy_elements";

const header = output_dialog.querySelector("header");
const content = output_dialog.querySelector("article");
const footer = output_dialog.querySelector("footer");

let endpoint;
let intervalId;

export const init = (element) => {
    
    endpoint = element.dataset.endpoint;

    sessionStorage.removeItem("pages_edited");

    callAPI(endpoint,"POST",{})
        .then( (data) => {
            content.replaceChildren();
            content.insertAdjacentHTML('afterbegin',data.content);
            header.querySelector(":first-child").replaceChildren();
            footer.replaceChildren();
            output_dialog.showModal();
            if (data.stop) return;
            if (intervalId) {
                clearInterval(intervalId);
            }
            output_dialog.addEventListener("close", () => {
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
                const tbody = content.querySelector("tbody");
                tbody.insertAdjacentHTML('beforeend',data.content);
                tbody.querySelector(":last-child").scrollIntoView();
            }
            if (data.completed) {
                clearInterval(intervalId);
            }
        })
        .catch((error) => {
            handleError(error);
        })
}