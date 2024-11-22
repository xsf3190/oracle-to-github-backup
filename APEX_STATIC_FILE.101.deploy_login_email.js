/*
** LOGIN THROUGH EMAIL. PASSCODE AND MAGIC LINK SUPPORTED.
*/

const callAPI = async (endpoint, method = "GET", token, data) => {
    
    let url = bodydata.resturl + endpoint + "/" + bodydata.websiteid;
    if (method==="GET") {
      url+=data;
      console.log(url);
    }

    let headers = new Headers();
    headers.append("Content-Type", "application/json");
    if (token) {
        headers.append("Authorization","Bearer " + token);
    }

    let config = {method: method, headers: headers};
    if (method==="POST" || method==="PUT") {
        config["body"] = JSON.stringify(data);
    }

    const response = await fetch(url, config);

    if (!response.ok) {
        throw Error(`System Error: ${response.status} - ${response.message}}`);
    }

    const result = await response.json();
    if (!result.success) {
        if (result.sqlcode) {
            throw Error(`Database error: ${result.sqlcode} - ${result.sqlerrm}`);
        } else {
            throw Error(result.message);
        }
    }
    return(result);
}


const bodydata = document.body.dataset;
const login = document.querySelector(".login-btn");
const dialog = document.querySelector("dialog");
const form = dialog.querySelector("form");

/* CHECK IF USER ALREADY LOGGED IN. REFRESH TOKEN IF EXPIRED */

const token = sessionStorage.getItem("token") || localStorage.getItem("refresh");

/* Show user's email address if token exists */
if (token) {
    const arrayToken = token.split(".");
    const tokenPayload = JSON.parse(atob(arrayToken[1]));
    login.textContent = tokenPayload.sub;
} else {
    login.addEventListener("click", () => {
      dialog.showModal();
    });
}

const sendmail_magic = form.querySelector(".sendmail-magic"),
      sendmail_passcode = form.querySelector(".sendmail-passcode"),
      sendmail_msg = form.querySelector(".sendmail-result");

let gIntervalId;

sendmail_magic.addEventListener("click", (e) => {
    e.preventDefault();
    form.querySelector("[name='url']").value = window.location.hostname;
    form.querySelector("[name='request_type']").value = "magic";
    const formData = new FormData(form);
    callAPI("authenticate", "POST", null, Object.fromEntries(formData))
        .then((data) => {
            sendmail_msg.textContent = data.message;
            clearInterval(gIntervalId);
            gIntervalId = setInterval(checkAuthStatus,3000);
        })
        .catch((error) => {
            sendmail_msg.textContent = error;
            sendmail_msg.style.color = "red";
        });
});

const checkAuthStatus = () => {
    const formData = new FormData(form);
    callAPI("authenticate", "PUT", null, Object.fromEntries(formData))
        .then((data) => {
            if (data.token) {
              sessionStorage.setItem("token",data.token);
              localStorage.setItem("refresh",data.refresh);
              sendmail_msg.textContent = "Logged on!";
              sendmail_msg.style.color = "green";
              clearInterval(gIntervalId);
            } else if (data.expired) {
              sendmail_msg.textContent = "Expired";
              sendmail_msg.style.color = "red";
              clearInterval(gIntervalId);
            }
        })
        .catch((error) => {
            sendmail_msg.textContent = error;
            sendmail_msg.style.color = "red";
            clearInterval(gIntervalId);
        });
}

const validate_passcode =  form.querySelector(".validate-passcode"),
      validate_msg = form.querySelector(".passcode-result");

/* Submit email address - hide send email buttons and display elements to enter and validate passcode */
sendmail_passcode.addEventListener("click", (e) => {
    e.preventDefault();
    form.querySelector("[name='url']").value = window.location.hostname;
    form.querySelector("[name='request_type']").value = "passcode";
    const formData = new FormData(form);
    callAPI("authenticate", "POST", null, Object.fromEntries(formData))
        .then((data) => {
            sendmail_msg.textContent = data.message;
            sendmail_magic.classList.add("visually-hidden");
            sendmail_passcode.classList.add("visually-hidden");
            validate_passcode.dataset.userid = data.userid;
            form.querySelectorAll(".visually-hidden").forEach((ele) => {
                ele.classList.remove("visually-hidden");
            });
        })
        .catch((error) => {
            sendmail_msg.textContent = error;
            sendmail_msg.style.color = "red";
        });
});



validate_passcode.addEventListener("click", (e) => {
    callAPI("authenticate", "GET", null, "?request=passcode&user=" + e.target.dataset.userid + "&verify=" + form.querySelector("[name='passcode']").value)
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