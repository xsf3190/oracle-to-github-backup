/* ************************************************************** */
/* LOGIN HANDLER - AUTHENTICATION BY EMAIL UDING LINK OR PASSCODE */
/* ************************************************************** */

import { login_dialog, login_btn, email, expires, menulist, bodydata } from "./deploy_elements.min.js";

const form = login_dialog.querySelector("form");
const emailInput = form.querySelector("[name='email']");
const emailError = form.querySelector("#emailInput + span");
const sendmail_magic = form.querySelector(".sendmail-magic");
const sendmail_passcode = form.querySelector(".sendmail-passcode");
const sendmail_msg = form.querySelector(".sendmail-result");
const passcodeInput = form.querySelector("[name='passcode']");
const passcodeError = form.querySelector("#passcodeInput + span");
const validate_passcode =  form.querySelector(".validate-passcode");
const validate_msg = form.querySelector(".passcode-result");

let endpoint, intervalId;

export const init = (element) => {
    if (element.textContent==="Log Out") {
        sessionStorage.clear();
        localStorage.clear();
        email.classList.add("visually-hidden");
        expires.classList.add("visually-hidden");
        menulist.replaceChildren();
        login_btn.textContent = "Log In";
        return;
    }
    endpoint = element.dataset.endpoint;
    login_dialog.showModal();
}

/*
** CALL authenticate ENDPOINT
*/
const callAuthAPI = async (method, data) => {
    let url = bodydata.resturl + endpoint.replace(":ID",bodydata.websiteid);
  
    // Append any query parameters to url for GET requests
    if (method==="GET" && data) {
      url+=data;
    }

    let headers = new Headers();
    headers.append("Content-Type", "application/json");
    headers.append("url", window.location.hostname);
    headers.append("email", email.textContent);
    
    let config = {method: method, headers: headers};
    if (method==="POST" || method==="PUT") {
        config["body"] = JSON.stringify(data);
    }

    const response = await fetch(url, config);
    const result = await response.json();
  
    if (response.ok && result.success) {
        return(result);
    }
  
    // Error handling
  
    if (result.cause) {
      throw new Error(`${response.status} - ${result.cause}`);
    }

    if (result.sqlcode) {
      throw new Error(`${response.status} - ${result.sqlerrm}`);
    } else {
      throw new Error(`${result.message}`);
    }
}

/*
** VALIDATE EMAIL INPUT BY USER
*/
emailInput.addEventListener("input", (event) => {
  if (emailInput.validity.valid) {
    emailError.textContent = ""; // Remove the message content
  } else {
    // If there is still an error, show the correct error
    showError();
  }
});

/*
** VALIDATE PASSCODE INPUT BY USER
*/
passcodeInput.addEventListener("input", (event) => {
  if (passcodeInput.validity.valid) {
    passcodeInput.textContent = ""; // Remove the message content
  } else {
    // If there is still an error, show the correct error
    showError();
  }
});


const showError = () => {
    let errors = false;
    if (emailInput.validity.valueMissing) {
        emailError.textContent = "You need to enter an email address.";
        errors = true;
    } else if (emailInput.validity.typeMismatch) {
        emailError.textContent = "Entered value needs to be an email address.";
        errors = true;
    }

    emailError.style.color = errors ? "red" : "green";
  
    errors = false;
      
    if (passcodeInput.validity.patternMismatch) {
        passcodeError.textContent = "Passcode is 6-digits.";
        errors = true;
    }
    
    passcodeError.style.color = errors ? "red" : "green";
}

/*
** USER REQUESTS MAGIC LINK TO BE EMAILED TO THEIR INBOX.
** WHEN USER CLICKS MAGIC LINK THEIR USER RECORD IN DATABASE IS UPDATED
** WE POLL DATABASE FOR SUCCESSFUL AUTHENTICATION
*/
sendmail_magic.addEventListener("click", (e) => {
    if (!emailInput.validity.valid) {
        showError();
        return;
    }
    form.querySelector("[name='url']").value = window.location.hostname;
    form.querySelector("[name='request_type']").value = "magic";
    const formData = new FormData(form);
    const formObj = Object.fromEntries(formData);
    callAuthAPI("POST", formObj)
        .then((data) => {
            sendmail_msg.textContent = data.message;
            sendmail_msg.style.color = "green";
            clearInterval(intervalId);
            intervalId = setInterval(checkAuthStatus,3000, formObj);
        })
        .catch((error) => {
            sendmail_msg.textContent = error;
            sendmail_msg.style.color = "red";
        });
});

/* 
** SET NEW TOKENS IN STORAGE AND MEMORY. UPDATE DROPDOWN MENULIST
*/
const setTokens = (data) => {
    sessionStorage.setItem("token",data.token);
    localStorage.setItem("refresh",data.refresh);
  
    sessionStorage.setItem("menulist",data.menulist);
    sessionStorage.setItem("dialogs",data.dialogs);
    menulist.replaceChildren();
    menulist.insertAdjacentHTML('afterbegin',data.menulist);
  
    const arrayToken = data.refresh.split(".");
    const parsedToken = JSON.parse(atob(arrayToken[1]));
    email.textContent = parsedToken.sub;
    expires.textContent = new Date(parsedToken.exp*1000).toLocaleString();
  
    login_btn.textContent = "Log Out";
    email.classList.remove("visually-hidden");
    expires.classList.remove("visually-hidden");
}

/* 
** WAIT FOR USER TO CLICK MAGIC LINK SENT TO THEIR INBOX
*/
const checkAuthStatus = (formObj) => {
    callAuthAPI("PUT", formObj)
        .then((data) => {
            if (data.token) {
              setTokens(data);
              sendmail_msg.textContent = "Logged on!";
              sendmail_msg.style.color = "green";
              clearInterval(intervalId);
              sendmail_magic.classList.add("visually-hidden");
              sendmail_passcode.classList.add("visually-hidden");
            } else if (data.expired) {
              sendmail_msg.textContent = "Expired";
              sendmail_msg.style.color = "red";
              clearInterval(intervalId);
            }
        })
        .catch((error) => {
            sendmail_msg.textContent = error;
            sendmail_msg.style.color = "red";
            clearInterval(intervalId);
        });
}

/* 
**  USER REQUESTS 6-DIGIT PASSCODE TO BE SENT TO THEIR iNBOX
*/
sendmail_passcode.addEventListener("click", (e) => {
    if (!emailInput.validity.valid) {
        showError();
        return;
    }
    form.querySelector("[name='url']").value = window.location.hostname;
    form.querySelector("[name='request_type']").value = "passcode";
    const formData = new FormData(form);
    callAuthAPI("POST", Object.fromEntries(formData))
        .then((data) => {
            sendmail_msg.textContent = data.message;
            sendmail_msg.style.color = "green";
            form.querySelectorAll(".visually-hidden").forEach((ele) => {
                ele.classList.remove("visually-hidden");
            });
            sendmail_magic.classList.add("visually-hidden");
            sendmail_passcode.classList.add("visually-hidden");
            validate_passcode.dataset.userid = data.userid;
        })
        .catch((error) => {
            sendmail_msg.textContent = error;
            sendmail_msg.style.color = "red";
        });
});

/* 
**  CHECK PASSCODE ENTERED BY USER MATCHES PASSCODE SENT TO THEIR INBOX
*/
validate_passcode.addEventListener("click", (e) => {
    if (!emailInput.validity.valid || !passcodeInput.validity.valid) {
        showError();
        return;
    }
  
    const query = "?request=passcode&user=" + e.target.dataset.userid 
                  + "&verify=" + form.querySelector("[name='passcode']").value;
    callAuthAPI("GET", query)
        .then((data) => {
            setTokens(data);
            validate_msg.textContent = "Logged In!";
            validate_msg.style.color = "green";
            validate_passcode.classList.add("visually-hidden");
        })
        .catch((error) => {
            validate_msg.textContent = error;
            validate_msg.style.color = "red";
        });
});