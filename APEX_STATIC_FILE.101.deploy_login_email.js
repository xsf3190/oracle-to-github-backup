/*
** LOGIN WITH EMAIL FORM SUBMISSION
*/

const callAPI = async (url, method) => {
    const formData = new FormData(form);

    const response = await fetch(url, {
        method: method,
        body: JSON.stringify(Object.fromEntries(formData))
    });

    if (!response.ok) {
        throw Error(`System Error: ${response.status} - ${response.message}`);
    }

    const data = await response.json();
    if (!data.success) {
        if (data.sqlcode) {
            throw Error(`Database error: ${data.sqlcode} - ${data.sqlerrm}`);
        } else {
            throw Error(data.message);
        }
    }
    return(data);
}

const bodydata = document.body.dataset;
const url = bodydata.resturl + "authenticate/" +bodydata.websiteid;
const form = document.querySelector("form.login");
const sendmail_btn = form.querySelector("button.sendmail"),
      sendmail_msg = form.querySelector(".sendmail-result"),
      sendcode_btn = form.querySelector("button.sendcode"),
      sendcode_msg = form.querySelector(".sendcode-result");

/* Include website url in submitted form data */
form.querySelector("[name='url']").value = window.location.hostname; 

/* sendcode elements hidden until code has been emailed */
form.querySelectorAll(".sendcode").forEach((ele) => {
    ele.style.display = "none";
});

form.addEventListener("submit", (e) => {
    e.preventDefault();
});

/* Submit email address - hide send button and display elements to process passcode */
sendmail_btn.addEventListener("click", () => {
    callAPI(url,"POST").then((data) => {
        sendmail_msg.textContent = data.message;
        sendmail_btn.style.display = "none";
        form.querySelectorAll(".sendcode").forEach((ele) => {
            ele.style.display = "block";
        });
    }).catch((error) => {
        sendmail_msg.textContent = error;
        sendmail_msg.style.color = "red";
    });
});

sendcode_btn.addEventListener("click", () => {
    callAPI(url,"PUT").then((data) => {
        sessionStorage.setItem("token",data.token);
        sendcode_msg.textContent = data.message;
        sendcode_msg.style.color = "green";
        sendcode_btn.style.display = "none";
    }).catch((error) => {
        sendcode_msg.textContent = error;
        sendcode_msg.style.color = "red";
    });
});
