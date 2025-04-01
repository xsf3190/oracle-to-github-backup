/* ************************************************************** */
/* LOGIN HANDLER - AUTHENTICATION BY EMAIL USING LINK OR PASSCODE */
/* ALSO USED TO CREATE A NEW WEBSITE                              */
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
const domainInput = form.querySelector("[name='domain']");
const domainError = form.querySelector("#domainInput + span");
const loader = form.querySelector(".loader");

let endpoint, intervalId;
let domain = false;

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
    if (login_btn.dataset.promotion) {
        domain = true;
        login_dialog.querySelector("h2").textContent = "Create My Website";
        login_dialog.querySelector("div:has([name='domain'])").classList.remove("visually-hidden");
        delete login_btn.dataset.promotion;
    }
    endpoint = element.dataset.endpoint;
    form.reset();
    emailError.textContent = "";
    sendmail_msg.textContent = ""; 
    passcodeError.textContent = ""; 
    validate_msg.textContent = ""; 
    domainError.textContent = ""; 
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
emailInput.addEventListener("input", () => {
  if (emailInput.validity.valid) {
    emailError.textContent = "";
  } else {
    showError();
  }
});

/*
** VALIDATE PASSCODE INPUT BY USER
*/
passcodeInput.addEventListener("input", () => {
  if (passcodeInput.validity.valid) {
    passcodeError.textContent = "";
  } else {
    showError();
  }
});

/*
** VALIDATE DOMAIN NAME INPUT BY USER
*/
domainInput.addEventListener("input", () => {
  if (domainInput.validity.valid) {
    domainError.textContent = "";
  } else {
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

    errors = false;
      
    if (domainInput.validity.patternMismatch) {
        domainError.textContent = "Domain is alphanumeric, period and hyphen";
        errors = true;
    }
    
    domainError.style.color = errors ? "red" : "green";
}

/*
** USER REQUESTS MAGIC LINK TO BE EMAILED TO THEIR INBOX.
** WHEN USER CLICKS MAGIC LINK THEIR USER RECORD IN DATABASE IS UPDATED
** IF NORMAL LOGIN - POLL DATABASE FOR SUCCESSFUL AUTHENTICATION
** IF REQUEST FOR WEBSITE
*/
sendmail_magic.addEventListener("click", () => {
    console.log("emailInput.validity.valid",emailInput.validity.valid);
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
            if (!domain) {
                clearInterval(intervalId);
                intervalId = setInterval(checkAuthStatus,3000, formObj);
            }
        })
        .catch((error) => {
            sendmail_msg.textContent = error;
            sendmail_msg.style.color = "red";
        });
});

/* 
** SET NEW TOKENS IN STORAGE AND MEMORY. UPDATE DROPDOWN MENULIST. "URL" SENT FROM SERVER IS FOR A REQUESTED WEBSITE
*/
const setTokens = (data) => {
    
    localStorage.setItem("refresh",data.refresh);
  
    sessionStorage.setItem("token",data.token);
    sessionStorage.setItem("menulist",data.menulist);
    sessionStorage.setItem("dialogs",data.dialogs);

    menulist.replaceChildren();
    menulist.insertAdjacentHTML('afterbegin',data.menulist);
    
    const nb_dialogs = document.querySelectorAll("dialog").length;
    if (nb_dialogs===1) {
        document.body.insertAdjacentHTML('beforeend',data.dialogs);
        document.querySelectorAll("dialog button.close").forEach((button) => {
            button.addEventListener("click", (e) => {
            e.target.closest("dialog").close();
            });
        });
    }
  
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
              sendmail_magic.classList.add("visually-hidden");
              sendmail_passcode.classList.add("visually-hidden");
              clearInterval(intervalId);
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
            form.querySelector("#passcodeInput").parentElement.classList.remove("visually-hidden");
            form.querySelector(".validate-passcode").classList.remove("visually-hidden");
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
    if (!emailInput.validity.valid) {
        showError();
        return;
    }
  
    const query = "?request=passcode&user=" + e.target.dataset.userid 
                  + "&verify=" + form.querySelector("[name='passcode']").value;
    if (domain) {
        loader.classList.remove("visually-hidden");
    }
    callAuthAPI("GET", query)
        .then((data) => {
            /* data.url is the requested editor website */
            if (data.url) {
                window.location.replace(data.url);
            } else {
                setTokens(data);
                validate_msg.textContent = "Logged In!";
                validate_msg.style.color = "green";
                validate_passcode.classList.add("visually-hidden");
            }
        })
        .catch((error) => {
            if (domain) {
                loader.classList.add("visually-hidden");
            }
            validate_msg.textContent = error;
            validate_msg.style.color = "red";
        });
});