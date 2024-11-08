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

const b64DecodeUnicode = str =>
  decodeURIComponent(
    Array.prototype.map.call(atob(str), c =>
      '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    ).join(''))

const parseJwt = token =>
  JSON.parse(
    b64DecodeUnicode(
      token.split('.')[1].replace('-', '+').replace('_', '/')
    )
  )



const bodydata = document.body.dataset;
const form = document.querySelector("form.login");

/* sendcode elements hidden until code has been emailed */
form.querySelectorAll(".sendcode").forEach((ele) => {
    ele.style.display = "none";
});

/* CHECK IF USER ALREADY LOGGED IN. REFRESH TOKEN IF EXPIRED */
let html="";
let token_type="";

let token = sessionStorage.getItem("token");

if (token) {
    token_type="AT";
    html+="<table><caption>Access Token</caption>";
} else {
    token = localStorage.getItem("refresh");
    if (token) {
        token_type="RT"; /* Means user previously logged and is revisiting website - need to get Access token */
        html+="<table><caption>Refresh Token</caption>";
    }
}
/* Show token values if exists */
if (token) {
    const token_obj = parseJwt(token)
    const keys = Object.keys(token_obj);
    let value, utc;
    let j = 0;
    for (let i = 1; i < keys.length; i++) {
        if (keys[j]==="iat" || keys[j]==="exp") {
            utc = new Date(Number(token_obj[keys[j]])*1000);
            value = utc.toUTCString();
            console.log(token_obj[keys[j]])
        } else {
            value = token_obj[keys[j]];
        }
        html+="<tr><td>" + keys[j] + "</td><td>" + value + "</td></tr>"
        j++;
    }
    html+="</table>";
}


if (token) {
    form.style.display = "none";
    const article = document.querySelector("article:first-of-type");
    article.replaceChildren();
    article.insertAdjacentHTML('beforeend',html);
  
    switch (token_type) {
      case "AT":

          callAPI("authenticate", "GET", token)
              .then((data) => {
                  if (data.message==="expired") {
                      article.insertAdjacentHTML('beforeend',"<p>token expired - get new access token using refresh token</p>");
                      return callAPI("authenticate-refresh", "POST", localStorage.getItem("refresh"));
                  }
                  article.insertAdjacentHTML('beforeend',"<p>Access Token used</p>");
                  return Promise.resolve();
              })
              .then((data) => {
                  if (!data) return;
                  if (data.message==="login") {
                      article.insertAdjacentHTML('beforeend',"<p>Refresh token has expired. Have to login again.</p>");
                      sessionStorage.removeItem("token");
                      localStorage.removeItem("refresh");
                  } else {
                      article.insertAdjacentHTML('beforeend',"<p>Refresh token used to get new Access / Refresh token pair</p>");
                      sessionStorage.setItem("token",data.token);
                      localStorage.setItem("refresh",data.refresh);
                  }
              })
              .catch((error) => {
                  article.insertAdjacentHTML('beforeend',"<p>" + error + "</p>");
              });
          break;
            
      case "RT":
          callAPI("authenticate-refresh", "POST", token)
              .then((data) => {
                  article.insertAdjacentHTML('beforeend',"<p>Refresh token used to get new Access / Refresh token pair</p>");
                  sessionStorage.setItem("token",data.token);
                  localStorage.setItem("refresh",data.refresh);
              })
              .catch((error) => {
                  article.insertAdjacentHTML('beforeend',"<p>" + error + "</p>");
              });
          break;
     }          
           
} else {


const sendmail_btn = form.querySelector("button.sendmail"),
      sendmail_msg = form.querySelector(".sendmail-result"),
      sendcode_btn = form.querySelector("button.sendcode"),
      sendcode_msg = form.querySelector(".sendcode-result");

/* Include website url in submitted form data */
form.querySelector("[name='url']").value = window.location.hostname; 

/* Submit email address - hide send button and display elements to process passcode */
sendmail_btn.addEventListener("click", () => {
    callAPI("authenticate", "POST")
        .then((data) => {
            sendmail_msg.textContent = data.message;
            sendmail_btn.style.display = "none";
            form.querySelectorAll(".sendcode").forEach((ele) => {
                ele.style.display = "block";
            });
        })
        .catch((error) => {
            sendmail_msg.textContent = error;
            sendmail_msg.style.color = "red";
        });
    });

sendcode_btn.addEventListener("click", () => {
    callAPI("authenticate", "PUT")
        .then((data) => {
            sessionStorage.setItem("token",data.token);
            localStorage.setItem("refresh",data.refresh);
            sendcode_msg.textContent = data.message;
            sendcode_msg.style.color = "green";
            sendcode_btn.style.display = "none";
        })
        .catch((error) => {
            sendcode_msg.textContent = error;
            sendcode_msg.style.color = "red";
        });
    });
}