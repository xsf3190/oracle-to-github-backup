/*
** CREATE NETLIFY DNS ZONE FOR WEBSITE OR GET DNS SERVER NAMES TO BE CHANGED IN WEBSITE'S DOMAIN REGISTRAR
*/
import { output_dialog } from "deploy_elements";
import { callAPI, handleError } from "deploy_callAPI";

let endpoint;

const form = output_dialog.querySelector("form");
const header = form.querySelector("header");
const article = form.querySelector("article");
const footer = form.querySelector("footer");

export const init = (element) => {
    endpoint = element.dataset.endpoint;

    form.reset();
    
    callAPI(endpoint, "GET")
        .then((data) => {
            header.querySelector(":first-child").replaceChildren();
            header.insertAdjacentHTML('afterbegin',data.header);

            updateForm(data.article, data.footer);

            footer.querySelector(".create-dns")?.addEventListener("click", createDNS);
            
            output_dialog.showModal();
        })
        .catch((error) => {
            handleError(error);
        });
}

const createDNS = () => {
    const domain = article.querySelector("[name='domain_name_custom']");
    const result = article.querySelector(".result");
    if (domain.validity.valueMissing) {
        result.textContent = "Enter registered Domain name";
        result.style.color = "red";
        return;
    }

    const formData = new FormData(form);
    const formObj = Object.fromEntries(formData);
    const loader = form.querySelector(".loader");
    loader.classList.remove("visually-hidden");
    callAPI(endpoint, "POST", formObj)
        .then((data) => {
            loader.classList.add("visually-hidden");
            if (data.error) {
                handleError(data.error);
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