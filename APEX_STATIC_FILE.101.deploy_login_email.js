/*
** LOGIN THROUGH EMAIL. REQUESTS FOR PASSCODE AND MAGIC LINK SUPPORTED.
*/

/* SECURE ACCESS IS HANDLED USING JWT TOKENS */
let access_token = sessionStorage.getItem("token");
let refresh_token = localStorage.getItem("refresh");

const bodydata = document.body.dataset;
const dialog = document.querySelector("dialog.login-email");
const output = document.querySelector("dialog.output");
const showmore = output.querySelector(".show-more");
const form = dialog.querySelector("form");
const email = document.querySelector(".login .email");
const expires = document.querySelector(".login .expires");
const login = document.querySelector(".dropdown button.log-in");


const callAPI = async (endpoint, method = "GET", token, data) => {    
    let url = bodydata.resturl + endpoint + "/" + bodydata.websiteid;
    // Append any query parameters to url for GET requests
    if (method==="GET" && data) {
      url+=data;
    }

    let headers = new Headers();
    headers.append("Content-Type", "application/json");
    headers.append("url", window.location.hostname);
    headers.append("timezone", Intl.DateTimeFormat().resolvedOptions().timeZone);
    headers.append("email", email.textContent);
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

/* CLOSE ALL DIALOGS CONSISTENTLY */
document.querySelectorAll("dialog button.close").forEach((button) => {
    button.addEventListener("click", (e) => {
        e.target.closest("dialog").close();
    });
});

/* CHECK IF TOKEN EXPIRED */
const expiredToken = (token) => {
    if (!token) {
        return true;
    }
    const now = Math.floor(new Date().getTime() / 1000);
    const arrayToken = token.split(".");
    const parsedToken = JSON.parse(atob(arrayToken[1]));
    return parsedToken.exp <= now;
}

/* 
** REPLACE NEW TOKENS IN STORAGE AND MEMORY. UPDATE UI
*/
const replaceTokens = (data) => {
    sessionStorage.setItem("token",data.token);
    access_token = data.token;
    localStorage.setItem("refresh",data.refresh);
    refresh_token = data.refresh;
  
    const arrayToken = refresh_token.split(".");
    const parsedToken = JSON.parse(atob(arrayToken[1]));
    email.textContent = parsedToken.sub;
    expires.textContent = new Date(parsedToken.exp*1000).toLocaleString();
  
    if (login) {
        login.classList.toggle("log-in");
        login.classList.toggle("log-out");
        login.textContent = "Log Out";
    }
}

/* 
** CHECK IF TOKEN HAS EXPIRED
*/
const checkToken = async () => {
    if (!expiredToken(access_token)) {
        return;
    }
  
    if (expiredToken(refresh_token)) {
        document.querySelector(".log-out").click();
        return;
    }

    await callAPI("refresh-token", "GET", refresh_token, null)
    .then((data) => {
        replaceTokens(data);
    })
    .catch((error) => {
        content.replaceChildren();
        content.insertAdjacentHTML('afterbegin',error);
        content.style.color = "red";
        output.showModal();
    });
}

/* 
** DROPDOWN MENU LOGIN / LOGOUT EVENT HANDLERS
*/
document.querySelectorAll(".dropdown-content button:not([data-endpoint])").forEach((button) => {
  button.addEventListener("click", async (e) => {
      if (e.target.matches(".log-in")) {
            dialog.showModal();
      } else if (e.target.matches(".log-out")) {
            sessionStorage.removeItem("token");
            localStorage.removeItem("refresh");
            email.textContent = "";
            expires.textContent = "";
            e.target.classList.toggle("log-in");
            e.target.classList.toggle("log-out");
            e.target.textContent = "Log In";
      }
      e.target.closest("details").removeAttribute("open");
    });
})

/*
** EACH REPORT RETURNS TOTAL ROWS INTO THIS VARIABLE WHEN offset=0
*/
let gCount;
let gEndpoint;
let gReport;
let gParentId;

const getReport = async (e, offset) => {
    await checkToken();

    const header = output.querySelector("header>*:first-child");
    const article = output.querySelector("article");
    const status = output.querySelector("footer>*:first-child");

    const query = "?report=" + gReport + "&offset=" + offset + "&parentid=" + gParentId;
    
    callAPI(gEndpoint, "GET", access_token, query)
    .then((data) => {
        if (offset===0) {
            gCount = data.count;
            header.insertAdjacentHTML('afterbegin',data.header);
            article.insertAdjacentHTML('afterbegin',data.article);
            output.showModal();
        } else if (data.article) {            
            article.querySelector("tbody").insertAdjacentHTML('beforeend',data.article);
        }

        const tbody = article.querySelector("tbody");
        if (gCount===tbody.childElementCount) {
            showmore.classList.add("visually-hidden");
        } else {
            showmore.dataset.offset = data.offset;
        }
        status.textContent = tbody.childElementCount + "/" + gCount;
    })
    .catch((error) => {
        header.replaceChildren();
        header.insertAdjacentHTML('afterbegin',error);
        header.style.color = "red";
        output.showModal();
    });
}

/* 
** RESPOND TO DROPDOWN MENU REPORT REQUESTS
*/
document.querySelectorAll(".dropdown-content button[data-endpoint]").forEach((button) => {
    button.addEventListener("click", (e) => {
        if (login.matches(".log-in")) {
            dialog.showModal();
            return;
        }
        gEndpoint = e.target.dataset.endpoint;
        gReport = e.target.dataset.report;
        gParentId = e.target.dataset.parentid ? e.target.dataset.parentid : 0;
        getReport(e, 0);
        e.target.closest("details").removeAttribute("open");
    });
})

/*
** "SHOW MORE" REPORT BUTTON
*/
output.querySelector("button.show-more").addEventListener("click", (e) => {
    getReport(e, showmore.dataset.offset);
})

/*
** VALIDATE EMAIL INPUT BY USER
*/
const sendmail_magic = form.querySelector(".sendmail-magic"),
      sendmail_passcode = form.querySelector(".sendmail-passcode"),
      sendmail_msg = form.querySelector(".sendmail-result");

let gIntervalId;

const emailInput = document.getElementById("emailInput");
const emailError = document.querySelector("#emailInput + span");

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
const passcodeInput = document.getElementById("passcodeInput");
const passcodeError = document.querySelector("#passcodeInput + span");

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
    callAPI("authenticate", "POST", null, formObj)
        .then((data) => {
            sendmail_msg.textContent = data.message;
            sendmail_msg.style.color = "green";
            clearInterval(gIntervalId);
            gIntervalId = setInterval(checkAuthStatus,3000, formObj);
        })
        .catch((error) => {
            sendmail_msg.textContent = error;
            sendmail_msg.style.color = "red";
        });
});

const checkAuthStatus = (formObj) => {
    callAPI("authenticate", "PUT", null, formObj)
        .then((data) => {
            if (data.token) {
              replaceTokens(data);
              sendmail_msg.textContent = "Logged on!";
              sendmail_msg.style.color = "green";
              clearInterval(gIntervalId);
              sendmail_magic.classList.add("visually-hidden");
              sendmail_passcode.classList.add("visually-hidden");
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

/* 
**  USER REQUESTS 6-DIGIT PASSCODE TO BE SENT TO THEIR iNBOX
*/
const validate_passcode =  form.querySelector(".validate-passcode"),
      validate_msg = form.querySelector(".passcode-result");

sendmail_passcode.addEventListener("click", (e) => {
    if (!emailInput.validity.valid) {
        showError();
        return;
    }
    form.querySelector("[name='url']").value = window.location.hostname;
    form.querySelector("[name='request_type']").value = "passcode";
    const formData = new FormData(form);
    callAPI("authenticate", "POST", null, Object.fromEntries(formData))
        .then((data) => {
            sendmail_msg.textContent = data.message;
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
  
    const query = "?request=passcode&user=" + e.target.dataset.userid + "&verify=" + form.querySelector("[name='passcode']").value;
    callAPI("authenticate", "GET", null, query)
        .then((data) => {
            replaceTokens(data);
            validate_msg.textContent = "Logged In!";
            validate_msg.style.color = "green";
            validate_passcode.classList.add("visually-hidden");
        })
        .catch((error) => {
            validate_msg.textContent = error;
            validate_msg.style.color = "red";
        });
});

/* 
** CHECK REFRESH TOKEN ON PAGE LOAD
*/
if (expiredToken(refresh_token)) {
    console.log("Not logged in or Refresh Token expired");
} else {
    const arrayToken = refresh_token.split(".");
    const parsedToken = JSON.parse(atob(arrayToken[1]));
    email.textContent = parsedToken.sub;
    expires.textContent = new Date(parsedToken.exp*1000).toLocaleString();
    login.classList.toggle("log-in");
    login.classList.toggle("log-out");
    login.textContent = "Log Out";
}