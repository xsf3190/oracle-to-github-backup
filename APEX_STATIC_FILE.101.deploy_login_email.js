/*
** LOGIN WITH EMAIL FORM SUBMISSION
*/

const callAPI = async (endpoint, method, token) => {
    
    const url = bodydata.resturl + endpoint + "/" +bodydata.websiteid;

    let headers = new Headers();
    if (token) {
        headers.append("Authorization","Bearer " + token);
    }

    let config = {method: method, headers: headers};
    if (method==="POST" || method==="PUT") {
        const formData = new FormData(form);
        config["body"] = JSON.stringify(Object.fromEntries(formData));
    }

    const response = await fetch(url, config);

    if (!response.ok) {
        throw Error(`System Error: ${response.status} - ${response.message}}`);
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
const login = document.querySelector(".login-btn");
const dialog = document.querySelector("dialog");
const form = dialog.querySelector("form.login");

/* CHECK IF USER ALREADY LOGGED IN. REFRESH TOKEN IF EXPIRED */

const token = sessionStorage.getItem("token") || localStorage.getItem("refresh");

/* Show user's email address if token exists */
if (token) {
    const arrayToken = token.split(".");
    const tokenPayload = JSON.parse(atob(arrayToken[1]));
    login.textContent = tokenPayload.sub;
}

login.addEventListener("click", () => {
    dialog.showModal();
});

const sendmail_magic = form.querySelector(".sendmail-magic"),
      sendmail_passcode = form.querySelector(".sendmail-passcode"),
      sendmail_msg = form.querySelector(".sendmail-result");

const validate_passcode =  form.querySelector(".validate-passcode"),
      validate_msg = form.querySelector(".sendcode-result");

/* Include website url in submitted form data */
form.querySelector("[name='url']").value = window.location.hostname; 

sendmail_magic.addEventListener("click", () => {
    callAPI("authenticate-magic", "POST")
        .then((data) => {
            sendmail_msg.textContent = data.message;
            sendmail_passcode.classList.add("hide");
            sendmail_magic.classList.add("hide");
        })
        .catch((error) => {
            sendmail_msg.textContent = error;
            sendmail_msg.style.color = "red";
        });
});

/* Submit email address - hide send email buttons and display elements to enter and validate passcode */
sendmail_passcode.addEventListener("click", () => {
    callAPI("authenticate", "POST")
        .then((data) => {
            sendmail_msg.textContent = data.message;
            sendmail_passcode.classList.add("hide");
            sendmail_magic.classList.add("hide");
        })
        .catch((error) => {
            sendmail_msg.textContent = error;
            sendmail_msg.style.color = "red";
        });
});

validate_passcode.addEventListener("click", () => {
    callAPI("authenticate", "PUT")
        .then((data) => {
            sessionStorage.setItem("token",data.token);
            localStorage.setItem("refresh",data.refresh);
            validate_msg.textContent = data.message;
            validate_msg.style.color = "green";
            sendcode_btn.style.display = "none";
        })
        .catch((error) => {
            validate_msg.textContent = error;
            validate_msg.style.color = "red";
        });
});