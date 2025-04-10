/*
** CREATE NETLIFY DNS ZONE FOR WEBSITE OR GET DNS SERVER NAMES TO BE CHANGED IN WEBSITE'S DOMAIN REGISTRAR
*/

import { callAPI, handleError } from "./deploy_callAPI.min.js";

let endpoint;


const info_dialog = document.querySelector("dialog.info");
const form = info_dialog.querySelector("form");
const article = form.querySelector("article");
const footer = form.querySelector("footer");

export const init = (element) => {
    endpoint = element.dataset.endpoint;
    form.reset();
    
    callAPI(endpoint, "GET")
        .then((data) => {
            const header = info_dialog.querySelector("h4");
            header.textContent = "DNS Name Servers";

            updateForm(data.article, data.footer);

            footer.querySelector(".create-dns")?.addEventListener("click", createDNS);
            
            info_dialog.showModal();
        })
        .catch((error) => {
            handleError(error);
        });
}

const createDNS = () => {
    const formData = new FormData(form);
    const formObj = Object.fromEntries(formData);
    const loader = form.querySelector(".loader");
    loader.classList.remove("visually-hidden");
    callAPI(endpoint, "POST", formObj)
        .then((data) => {
            loader.classList.add("visually-hidden");
            if (data.error) {
                const result = article.querySelector(".result");
                result.textContent = data.error;
                result.style.color = "red";
                return;
            }
            updateForm(data.article, data.footer);
        })
        .catch((error) => {
            loader.classList.add("visually-hidden");
            handleError(error);
        });
}

const updateForm = (pArticle, pFooter) => {
    article.replaceChildren();
    article.insertAdjacentHTML("afterbegin",pArticle);
    
    footer.replaceChildren();
    footer.insertAdjacentHTML("afterbegin",pFooter);
}