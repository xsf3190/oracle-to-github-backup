
/*
**  LEAVE A MESSAGE DIALOG
*/
export const process_message = (endpoint,method) => {
  
    const messageInput = document.getElementById("messageInput");
    const messageError = document.querySelector(".messageInput-result");
    const message = document.querySelector("dialog.message");
    const sendmessage = message.querySelector(".send");
    const charcounter = message.querySelector(".charcounter");
    const maxchars = messageInput.getAttribute("maxlength");

    message.showModal();
  
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
        const formData = new FormData(message.querySelector("form"));
        const formObj = Object.fromEntries(formData);
        callAPI(endpoint, method, formObj)
            .then(() => {
                const sendresult = message.querySelector(".send-result");
                sendresult.textContent = "Successfully Sent";
                sendresult.style.color = "green";
                sendmessage.disabled = true;
            })
            .catch((error) => {
                messageError.textContent = error;
                messageError.style.color = "red";
            });
    });
}