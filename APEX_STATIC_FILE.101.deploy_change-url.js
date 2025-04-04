/*
**  CHANGE SUBDOMAIN OF EDiTOR SITE
*/
import { callAPI } from "./deploy_callAPI.min.js";

const url_dialog = document.querySelector("dialog.url");
const form = url_dialog.querySelector("form");
const urlInput = form.querySelector("[name='subdomain']");
const urlError = form.querySelector(".urlInput-result");
const action = form.querySelector(".action");
const actionresult = form.querySelector(".result");
const charcounter = form.querySelector(".charcounter");
const maxchars = urlInput.getAttribute("maxlength");

let endpoint, method;

export const init = (element) => {
    endpoint = element.dataset.endpoint;
    method = element.dataset.method;
    form.reset();
    urlError.textContent = "";
    actionresult.textContent = "";
    url_dialog.showModal();
}

urlInput.addEventListener("input", () => {
    let numOfEnteredChars = urlInput.value.length;
    charcounter.textContent = numOfEnteredChars + "/" + maxchars;

    if (numOfEnteredChars === Number(maxchars)) {
        charcounter.style.color = "red";
    } else {
        charcounter.style.color = "initial";
    }
});

action.addEventListener("click", () => {
    if (urlInput.validity.valueMissing) {
        urlError.textContent = "You need to enter a message.";
        urlError.style.color = "red";
        return;
    }
    const formData = new FormData(form);
    const formObj = Object.fromEntries(formData);
    callAPI(endpoint, method, formObj)
        .then((data) => {
            urlError.textContent = "";
            actionresult.textContent = data.message;
            actionresult.style.color = "green";
            action.disabled = true;
        })
        .catch((error) => {
            urlError.textContent = error;
            urlError.style.color = "red";
        });
});