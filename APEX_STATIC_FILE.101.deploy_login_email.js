/*
** LOGIN THROUGH EMAIL. REQUESTS FOR PASSCODE AND MAGIC LINK SUPPORTED.
*/

const callAPI = async (endpoint, method = "GET", token, data) => {
    
    let url = bodydata.resturl + endpoint + "/" + bodydata.websiteid;
    if (method==="GET" && data) {
      url+=data;
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
const login = document.querySelector(".login");
const dialog = document.querySelector("dialog.login-email");
const output = document.querySelector("dialog.output");
const form = dialog.querySelector("form");


const toggleVisibility = () => {
  login.querySelector("section.dropdown").classList.toggle("visually-hidden");
  login.querySelector("button").classList.toggle("visually-hidden");
}

login.querySelector("button").addEventListener("click", () => {
  dialog.showModal();
});


/* CHECK IF USER ALREADY LOGGED IN. REFRESH TOKEN IF EXPIRED */

const token = sessionStorage.getItem("token") || localStorage.getItem("refresh");
if (token) {
    const arrayToken = token.split(".");
    const tokenPayload = JSON.parse(atob(arrayToken[1]));
    login.querySelector("span").textContent = tokenPayload.sub;
    toggleVisibility();
}

/* RESPOND TO MENU REQUESTS */

document.querySelectorAll(".dropdown-content button").forEach((button) => {
  button.addEventListener("click", (e) => {
      if (e.target.matches(".log-out")) {
        sessionStorage.removeItem("token");
        localStorage.removeItem("refresh");
        toggleVisibility();
      } else {
        const content = output.querySelector("article");
        callAPI(e.target.dataset.endpoint, "GET", token, null)
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
    const query = "?request=passcode&user=" + e.target.dataset.userid + "&verify=" + form.querySelector("[name='passcode']").value;
    callAPI("authenticate", "GET", null, query)
        .then((data) => {
            sessionStorage.setItem("token",data.token);
            localStorage.setItem("refresh",data.refresh);
            validate_msg.textContent = data.message;
            validate_msg.style.color = "green";
        })
        .catch((error) => {
            validate_msg.textContent = error;
            validate_msg.style.color = "red";
        });
});

