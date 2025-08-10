/*
**  LEAVE A MESSAGE (MUST BE AUTHENTICATED)
*/
import { output_dialog } from "deploy_elements";
import { callAPI, handleError } from "deploy_callAPI";

const header = output_dialog.querySelector("header");
const article = output_dialog.querySelector("article");
const footer = output_dialog.querySelector("footer");

let messageInput, messageError, charcounter, maxchars;

let endpoint;

export const init = (element) => {
    endpoint = element.dataset.endpoint;

    callAPI(endpoint, "GET")
    .then((data) => {
        header.querySelector(":first-child").replaceChildren();
        header.insertAdjacentHTML('afterbegin',data.header);
        article.replaceChildren();
        article.insertAdjacentHTML('afterbegin',data.article);
        footer.replaceChildren();
        footer.insertAdjacentHTML('afterbegin',data.footer);

        /* SET VARIABLES FOR INTERACTIVE ELEMENTS REFERENCED IN EVENT HANDLERS */
        messageInput = article.querySelector("[name='message']");
        messageError = article.querySelector(".messageInput-result");
        charcounter = article.querySelector(".charcounter");
        maxchars = messageInput.getAttribute("maxlength");

        output_dialog.showModal();
    })
    .catch((error) => {
            handleError(error);
    });
}

article.addEventListener("input", () => {
    
    const charcounter = article.querySelector(".charcounter");
    const maxchars = messageInput.getAttribute("maxlength");

    let numOfEnteredChars = messageInput.value.length;
    charcounter.textContent = numOfEnteredChars + "/" + maxchars;

    if (numOfEnteredChars === Number(maxchars)) {
        charcounter.style.color = "red";
    } else {
        charcounter.style.color = "initial";
    }
});

footer.addEventListener("click", (e) => {
    if (!e.target.matches(".send")) return;
    
    if (messageInput.validity.valueMissing) {
        messageError.textContent = "Enter a message";
        messageError.style.color = "red";
        return;
    }
    
    const form = output_dialog.querySelector("form");

    const formData = new FormData(form);
    const formObj = Object.fromEntries(formData);
    callAPI(endpoint, 'POST', formObj)
        .then(() => {
            const sendresult = footer.querySelector(".send-result");
            sendresult.textContent = "Successfully Sent";
            sendresult.style.color = "green";
            e.target.disabled = true;
        })
        .catch((error) => {
            handleError(error);
        });
});