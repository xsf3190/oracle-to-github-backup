/*
** LOGIN THROUGH EMAIL. REQUESTS FOR PASSCODE AND MAGIC LINK SUPPORTED.
*/

const callAPI = async (endpoint, method = "GET", token, data) => {
    
    let url = bodydata.resturl + endpoint + "/" + bodydata.websiteid;
    if (endpoint==="authenticate" && method==="GET" && data) {
      url+=data;
    }

    let headers = new Headers();
    headers.append("Content-Type", "application/json");
    headers.append("url", window.location.hostname);
    headers.append("timezone", Intl.DateTimeFormat().resolvedOptions().timeZone);
    headers.append("email", login.querySelector("span.email").textContent);
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
const login = document.querySelector(".login");
const dialog = document.querySelector("dialog.login-email");
const output = document.querySelector("dialog.output");
const form = dialog.querySelector("form");

/* SHOW LOGIN BUTTON OR EMAIL AND DROPDOWN */
const toggleVisibility = () => {
  login.querySelector("section.dropdown").classList.toggle("visually-hidden");
  login.querySelector("button").classList.toggle("visually-hidden");
}

/* SHOW LOGIN FORM IF BUTTON CLICKED */
login.querySelector("button").addEventListener("click", () => {
  dialog.showModal();
});

/* CLOSE ALL DIALOGS CONSISTENTLY */
document.querySelectorAll("dialog button.close").forEach((button) => {
    button.addEventListener("click", (e) => {
        e.target.closest("dialog").close();
    });
});

/* CHECK IF TOKEN EXPIRED */
const expiredToken = (token) => {
    const now = Math.floor(new Date().getTime() / 1000);
    const arrayToken = token.split(".");
    const parsedToken = JSON.parse(atob(arrayToken[1]));
    if (parsedToken.exp > now) {
        login.querySelector("span.email").textContent = parsedToken.sub;
        login.querySelector("span.expires").textContent = new Date(parsedToken.exp*1000).toLocaleString();
    }
    return parsedToken.exp <= now;
}


/* SET VARIABLES WITH ACCESS AND REFRESH TOKENS ON PAGE LOAD */
let access_token = sessionStorage.getItem("token");
let refresh_token = localStorage.getItem("refresh");

if (refresh_token) {
    if (expiredToken(refresh_token)) {
        sessionStorage.removeItem("token");
        localStorage.removeItem("refresh");
    } else {
        toggleVisibility();
    }
}

const replaceTokens = (data) => {
    sessionStorage.setItem("token",data.token);
    access_token = data.token;
    localStorage.setItem("refresh",data.refresh);
    refresh_token = data.refresh;
}

/* REFRESH TOKENS IF SESSION TOKEN HAS EXPIRED OR NOT YET SET
** FORCE LOG OUT IF REFRESH TOKEN HAS ALSO EXPIRED 
*/
const checkToken = async () => {
    let doRefresh = false;
    if (access_token) {
        if (expiredToken(access_token)) {
            doRefresh = true;
        }
    } else {
        doRefresh = true;
    }
    if (!doRefresh) {
        return;
    }
  
    if (expiredToken(refresh_token)) {
        sessionStorage.removeItem("token");
        localStorage.removeItem("refresh");
        toggleVisibility();
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

/* RESPOND TO MENU REQUESTS */
document.querySelectorAll(".dropdown-content button").forEach((button) => {
  button.addEventListener("click", async (e) => {
      if (e.target.matches(".log-out")) {
        sessionStorage.removeItem("token");
        localStorage.removeItem("refresh");
        toggleVisibility();
      } else {
        await checkToken();
        const content = output.querySelector("article");
        callAPI(e.target.dataset.endpoint, "GET", access_token, null)
        .then((data) => {
            content.replaceChildren();
            content.insertAdjacentHTML('afterbegin',data.content);
            output.showModal();
        })
        .catch((error) => {
            content.replaceChildren();
            content.insertAdjacentHTML('afterbegin',error);
            content.style.color = "red";
            output.showModal();
        });
      }
      e.target.closest("details").removeAttribute("open");
    });
})

const sendmail_magic = form.querySelector(".sendmail-magic"),
      sendmail_passcode = form.querySelector(".sendmail-passcode"),
      sendmail_msg = form.querySelector(".sendmail-result");

let gIntervalId;

/*
** USER REQUESTS MAGIC LINK TO BE EMAILED. 
** WHEN USER CLICKS MAGIC LINK THEIR USER RECORD IN DATABASE IS UPDATED
** POLL DATABASE FOR SUCCESSFUL AUTHENTICATION
*/
sendmail_magic.addEventListener("click", (e) => {
    e.preventDefault();
    form.querySelector("[name='url']").value = window.location.hostname;
    form.querySelector("[name='request_type']").value = "magic";
    const formData = new FormData(form);
    callAPI("authenticate", "POST", null, Object.fromEntries(formData))
        .then((data) => {
            sendmail_msg.textContent = data.message;
            sendmail_msg.style.color = "green";
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
              replaceTokens(data);
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
    const query = "?request=passcode&user=" + e.target.dataset.userid + "&verify=" + form.querySelector("[name='passcode']").value;
    callAPI("authenticate", "GET", null, query)
        .then((data) => {
            replaceTokens(data);
            validate_msg.textContent = data.message;
            validate_msg.style.color = "green";
        })
        .catch((error) => {
            validate_msg.textContent = error;
            validate_msg.style.color = "red";
        });
});