/*
**  ADD / CHANGE / DELETE PAGES
*/
import { callAPI } from "./deploy_callAPI.min.js";

const page_dialog = document.querySelector("dialog.page");
const form = page_dialog.querySelector("form");
const pageInput = form.querySelector("[name='navigation_label']");
const pageResult = form.querySelector(".pageInput-result");
const footer = form.querySelector("footer");
const charcounter = form.querySelector(".charcounter");
const maxchars = pageInput.getAttribute("maxlength");
const loader = form.querySelector(".loader");

let endpoint;
let currentPage;

export const init = (element) => {
    endpoint = element.dataset.endpoint;
    form.reset();
    currentPage = document.querySelector("[aria-current='page']");
    if (currentPage) {
        pageInput.value = currentPage.textContent;
    }
    
    pageResult.textContent = "";
    page_dialog.showModal();
}

pageInput.addEventListener("input", () => {
    let numOfEnteredChars = pageInput.value.length;
    charcounter.textContent = numOfEnteredChars + "/" + maxchars;
    if (numOfEnteredChars === Number(maxchars)) {
        charcounter.style.color = "red";
    } else {
        charcounter.style.color = "initial";
    }
});

footer.addEventListener("click", (e) => {
    if (pageInput.validity.valueMissing) {
        pageResult.textContent = "You need to enter a page label";
        pageResult.style.color = "red";
        return;
    }
    loader.style.display = "block";
    const formData = new FormData(form);
    const formObj = Object.fromEntries(formData);
    callAPI(endpoint, e.target.dataset.method, formObj)
        .then((data) => {
            window.location.replace(data.href);
        })
        .catch((error) => {
            loader.style.display = "none";
            pageResult.textContent = error;
            pageResult.style.color = "red";
        });
});