/*
** LOGIN WITH EMAIL FORM SUBMISSION
*/
const showMessage = (result, message, color) => {
    result.textContent = message;
}

const sendEmailAddress = async (e) => {
    const formData = new FormData(form);

    const response = await fetch(
        bodydata.resturl + "authenticate/"+bodydata.websiteid, {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(formData))
    });

    const result = form.querySelector(".sendmail-result");

    if (!response.ok) {
        const message = `An error has occured: ${response.status} - ${response.message}`;
        showMessage(result, message, 'red');
        return;
    }

    const data = await response.json();

    if (!data.success) {
        const message = `An error has occured: ${data.sqlerrm}`;
        showMessage(result, message, 'red');
    }
    return(data);
}

const sendAuthCode = async () => {
    const formData = new FormData(form);
    
    const response = await fetch(
        bodydata.resturl + "authenticate/"+bodydata.websiteid, {
        method: "PUT",
        body: JSON.stringify(Object.fromEntries(formData))
    });

    const result = form.querySelector(".sendcode-result");

    if (!response.ok) {
        const message = `An error has occured: ${response.status} - ${response.message}`;
        showMessage(result, message, 'red');
        return;
    }

    const data = await response.json();

    if (!data.success) {
        const message = `An error has occured: ${data.sqlerrm}`;
        showMessage(result, message, 'red');
        return;
    }
    
    sessionStorage.setItem("token",data.token);
    showMessage(result, "Check your inbox for passcode", 'green');
}

const bodydata = document.body.dataset;
const form = document.querySelector("form.login");
const sendmail_btn = form.querySelector("button.sendmail"),
      sendmail_msg = form.querySelector(".sendmail-result"),
      sendcode_btn = form.querySelector("button.sendcode"),
      sendcode_msg = form.querySelector(".sendcode-result");

form.querySelector("[name='url']").value = window.location.hostname; /* includes website in submission */

sendmail_btn.addEventListener("click", () => {
    callAPI("POST", sendmail_msg);
    showMessage(sendmail_msg, "Check your inbox for passcode", 'green');
    sendmail_btn.style.display = "none";
    form.querySelectorAll(".sendcode").forEach((ele) => {
        ele.style.display = "block";
    });
});

sendcode_btn.addEventListener("click", () => {
        sendAuthCode();
});

/* sendcode elements hidden until code has been emailed */
form.querySelectorAll(".sendcode").forEach((ele) => {
    ele.style.display = "none";
});