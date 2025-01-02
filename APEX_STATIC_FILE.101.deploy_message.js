/*
**  LEAVE A MESSAGE
*/
import { message_dialog } from "./deploy_elements.min.js";
import { callAPI } from "./deploy_callAPI.min.js";

const form = message_dialog.querySelector("form");
const messageInput = form.querySelector("[name='message']");
const messageError = form.querySelector(".messageInput-result");
const sendmessage = form.querySelector(".send");
const sendresult = form.querySelector(".send-result");
const charcounter = form.querySelector(".charcounter");
const maxchars = messageInput.getAttribute("maxlength");

let endpoint, method;

export const init = (element) => {
    endpoint = element.dataset.endpoint;
    method = element.dataset.method;
    message_dialog.showModal();
}

messageInput.addEventListener("input", (e) => {
    let numOfEnteredChars = messageInput.value.length;
    charcounter.textContent = numOfEnteredChars + "/" + maxchars;

    if (numOfEnteredChars === Number(maxchars)) {
        charcounter.style.color = "red";
    } else {
        charcounter.style.color = "initial";
    }
});

sendmessage.addEventListener("click", (event) => {
    if (messageInput.validity.valueMissing) {
        messageError.textContent = "You need to enter a message.";
        messageError.style.color = "red";
        return;
    }
    const formData = new FormData(form);
    const formObj = Object.fromEntries(formData);
    callAPI(endpoint, method, formObj)
        .then(() => {
            sendresult.textContent = "Successfully Sent";
            sendresult.style.color = "green";
            sendmessage.disabled = true;
        })
        .catch((error) => {
            messageError.textContent = error;
            messageError.style.color = "red";
        });
});