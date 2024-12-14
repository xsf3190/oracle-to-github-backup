/*
** LOGIN THROUGH EMAIL. REQUESTS FOR PASSCODE AND MAGIC LINK SUPPORTED.
** ACCESS CONTROLLED USING REFRESH AND ACCESS TOKENS (JWT)
*/

let access_token = sessionStorage.getItem("token");
let refresh_token = localStorage.getItem("refresh");

const body = document.body;
const bodydata = document.body.dataset;
const main = document.querySelector("main");
const menulist = document.querySelector(".dropdown .menulist");
const dialog = document.querySelector("dialog.login-email");
const output = document.querySelector("dialog.output");
const reportlist = output.querySelector("header > ul");
const showmore = output.querySelector(".show-more");
const form = dialog.querySelector("form");
const email = document.querySelector(".login .email");
const expires = document.querySelector(".login .expires");
const login = document.querySelector(".dropdown button.log-in");

/* 
** CHECK IF TOKEN EXPIRED 
*/
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
    console.log("tokens refreshed");
  
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
** CALL API FOR RESOURCES WITH ACCESS TOKEN
*/
const callAPI = async (endpoint, method, data) => {
    let url;

    if (expiredToken(access_token)) {
      if (expiredToken(refresh_token)) {
        document.querySelector(".log-out").click();
        return;
      }
      url = bodydata.resturl + "refresh-token/" + bodydata.websiteid;
      let refresh_headers = new Headers();
      refresh_headers.append("Content-Type", "application/json");
      refresh_headers.append("Authorization","Bearer " + refresh_token);
      refresh_headers.append("email", email.textContent);
      const refresh_config = {method: "GET", headers: refresh_headers};
      const refresh_response = await fetch(url, refresh_config);
      const refresh_result = await refresh_response.json();
      replaceTokens(refresh_result);
    }
      
    const path = endpoint.replace(":ID",bodydata.websiteid)
                         .replace(":PAGE",bodydata.articleid);
    
    url = bodydata.resturl + path;
  
    // Append any query parameters to url for GET requests
    if (method==="GET" && data) {
      url+=data;
    }
    
    let headers = new Headers();
    headers.append("Content-Type", "application/json");
    headers.append("url", window.location.hostname);
    headers.append("timezone", Intl.DateTimeFormat().resolvedOptions().timeZone);
    headers.append("Authorization","Bearer " + access_token);
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
      throw Error(`${response.status} - ${result.cause}`);
    }

    if (result.sqlcode) {
      throw Error(`${response.status} - ${result.sqlerrm}`);
    } else {
      throw Error(`${response.status} - ${result.message}`);
    }
}

/* CLOSE ALL DIALOGS CONSISTENTLY */
document.querySelectorAll("dialog button.close").forEach((button) => {
    button.addEventListener("click", (e) => {
        e.target.closest("dialog").close();
    });
});

/* 
** DROPDOWN MENU LOGIN / LOGOUT EVENT HANDLERS
*/
document.querySelectorAll(".dropdown-content button:not([data-endpoint])").forEach((button) => {
  button.addEventListener("click", async (e) => {
      if (e.target.matches(".log-in")) {
            dialog.showModal();
      } else if (e.target.matches(".log-out")) {
            access_token = null;
            refresh_token = null;
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
** RUN SELECTED REPORT AND SHOW DETAILS
*/
const getReport = async (endpoint, report, offset) => {

    const article = output.querySelector("article");
    const status = output.querySelector("footer>*:first-child");

    const query = "?report=" + report + "&offset=" + offset;
    
    callAPI(endpoint, "GET", query)
    .then((data) => {
        const count = showmore.dataset.count ? showmore.dataset.count : data.count;
        if (offset===0) {
            article.replaceChildren();
            article.insertAdjacentHTML('afterbegin',data.article);
            showmore.dataset.endpoint = endpoint;
            showmore.dataset.report = report;
            showmore.dataset.count = data.count;
        } else if (data.article) {            
            article.querySelector("tbody").insertAdjacentHTML('beforeend',data.article);
        }

        const tbody = article.querySelector("tbody");
        if (tbody.childElementCount >= showmore.dataset.count) {
            showmore.classList.add("visually-hidden");
            showmore.disabled = true;
        } else {
            showmore.dataset.offset = data.offset;
        }
        status.textContent = tbody.childElementCount + " / " + count;
    })
    .catch((error) => {
        article.replaceChildren();
        article.insertAdjacentHTML('afterbegin',error);
        article.style.color = "red";
    });
}

/*
** USER CLICKS ACTION BUTTON IN MAIN DROPDOWN
*/
menulist.addEventListener("click", (e) => {
    const endpoint = e.target.dataset.endpoint;
    const method = e.target.dataset.method;
  
    if (endpoint==="visits/:ID") {
        process_report(endpoint, e.target.dataset.reports.split(";")); } else 
    if (endpoint==="edit-content/:ID/:PAGE") {
        process_edit_content(endpoint, method);
    }
    
})

/*
** COMMON ENTRY POINT FOR HANDLING REPORTS
*/
const process_report = (endpoint,reports) => {
    let buttons="";
    for (let i = 0; i < reports.length; i++) {
        const elements = reports[i].split("|");
        buttons += `<button class="button" type="button" data-report="${elements[0]}" data-endpoint="${endpoint}" data-button-variant="small">${elements[1]}</button>`;
    }
    reportlist.replaceChildren();
    reportlist.insertAdjacentHTML('afterbegin',buttons);
    output.showModal();
    //reportlist.querySelector("button:first-of-type").click();
}

reportlist.addEventListener("click", (e) => {
    const endpoint = e.target.dataset.endpoint;
    const report = e.target.dataset.report;
    getReport(endpoint, report, 0);
})

/*
** "SHOW MORE" REPORT BUTTON. PREEVENT DOUBLE CLICKS
*/
output.querySelector("button.show-more").addEventListener("click", (e) => {
    if (e.detail===1) {
        getReport(showmore.dataset.endpoint, showmore.dataset.report, showmore.dataset.offset);
    }
})

/*
** SET <main> CONTENTEDITABLE, ADD SAVE BUTTON TO UI
*/
const process_edit_content = (endpoint,method) => {
    main.setAttribute("contenteditable",true);
    //main.style.outline = "1em solid red";
    const button = `<button type="button" class="button save-content" data-endpoint="${endpoint}" data-method="${method}">SAVE CONTENT</button>`;
    document.querySelector(".editor-button").insertAdjacentHTML('afterbegin',button);
}

document.querySelector(".editor-button").addEventListener("click", async (e) => {
    if (e.detail!==1) return;
    if (e.target.matches(".save-content")) {
        
        const article = output.querySelector("article");
        callAPI(e.target.dataset.endpoint, e.target.dataset.method, {main:main.innerHTML})
            .then((data) => {
                console.log(data)
            })
            .catch((error) => {
                article.replaceChildren();
                article.insertAdjacentHTML('afterbegin',error);
                article.style.color = "red";
                output.showModal();
            });
    }
})

/* ************************************************************** */

const callAuthAPI = async (method, data) => {

    let url = bodydata.resturl + "authenticate/" + bodydata.websiteid;
  
    // Append any query parameters to url for GET requests
    if (method==="GET" && data) {
      url+=data;
    }
    

    let headers = new Headers();
    headers.append("Content-Type", "application/json");
    headers.append("url", window.location.hostname);
    headers.append("timezone", Intl.DateTimeFormat().resolvedOptions().timeZone);
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
      throw Error(`${response.status} - ${result.cause}`);
    }

    if (result.sqlcode) {
      throw Error(`${response.status} - ${result.sqlerrm}`);
    } else {
      throw Error(`${response.status} - ${result.message}`);
    }
}

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
    callAuthAPI("POST", formObj)
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
    callAuthAPI("PUT", formObj)
        .then((data) => {
            if (data.token) {
              replaceTokens(data);
              localStorage.setItem("menulist",data.menulist);
              
              menulist.replaceChildren();
              menulist.insertAdjacentHTML('afterbegin',data.menulist);
              
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
    callAuthAPI("POST", Object.fromEntries(formData))
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
    callAuthAPI("GET", query)
        .then((data) => {
            replaceTokens(data);
            localStorage.setItem("menulist",data.menulist);
              
            menulist.replaceChildren();
            menulist.insertAdjacentHTML('afterbegin',data.menulist);
      
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
** PAGE LOAD
** - SHOW EMAIL ADDRESS AND EXPIRY DATE IF PREVIOUSLY LOGGED IN
** - OTHERWSIE GET USER'S AUTHORIZED ENDPOINTS AND BUILD DROP DOWN BUTTONS
*/
if (!expiredToken(refresh_token)) {
    const arrayToken = refresh_token.split(".");
    const parsedToken = JSON.parse(atob(arrayToken[1]));
    email.textContent = parsedToken.sub;
    expires.textContent = new Date(parsedToken.exp*1000).toLocaleString();
    login.classList.toggle("log-in");
    login.classList.toggle("log-out");
    login.textContent = "Log Out";
    menulist.replaceChildren();
    menulist.insertAdjacentHTML('afterbegin',localStorage.getItem("menulist"));
}