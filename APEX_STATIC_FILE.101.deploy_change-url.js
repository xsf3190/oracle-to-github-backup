/*
**  CHANGE SUBDOMAIN OF EDiTOR SITE
*/
import { callAPI, handleError } from "deploy_callAPI";

const info_dialog = document.querySelector("dialog.info");
const form = info_dialog.querySelector("form");
const header = form.querySelector("h4");
const article = form.querySelector("article");
const footer = form.querySelector("footer");

let endpoint;

export const init = (element) => {
    endpoint = element.dataset.endpoint;
    form.reset();

    callAPI(endpoint, "GET")
        .then((data) => {
            
            header.textContent = "Change URL";

            article.replaceChildren();
            article.insertAdjacentHTML("afterbegin", data.article);

            const result = article.querySelector(".result");
            article.querySelector("[name='subdomain']").addEventListener("input", (e) => {
                result.textContent = e.target.value + ".netlify.app";
            });

            footer.replaceChildren();
            footer.insertAdjacentHTML("afterbegin", data.footer);

            footer.querySelector(".change-url")?.addEventListener("click", changeURL);

            form.style.inlineSize="37ch";
            
            info_dialog.showModal();
        })
        .catch((error) => {
            handleError(error);
        });
}

const changeURL = () => {
    const formData = new FormData(form);
    const formObj = Object.fromEntries(formData);
    const loader = form.querySelector(".loader");
    loader.classList.remove("visually-hidden");
    const button = footer.querySelector(".change-url");
    button.disabled = true;
    callAPI(endpoint, "PUT", formObj)
        .then((data) => {
            const result = article.querySelector(".result");
            result.textContent = data.message;
            if (data.valid) {
                window.location.replace(data.url);
            }
            button.disabled = false;
            result.style.color = "red";
            loader.classList.add("visually-hidden");
        })
        .catch((error) => {
            loader.classList.add("visually-hidden");
            handleError(error);
        });
}