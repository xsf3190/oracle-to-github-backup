/*
** LOGIN THROUGH EMAIL. REQUESTS FOR PASSCODE AND MAGIC LINK SUPPORTED.
** ACCESS CONTROLLED USING REFRESH AND ACCESS TOKENS (JWT)
*/
//import "https://codepen.io/xsf3190/pen/ByBQrGV.js"

let access_token = sessionStorage.getItem("token");
let refresh_token = localStorage.getItem("refresh");

const bodydata = document.body.dataset;
const menulist = document.querySelector(".dropdown .menulist");
const output = document.querySelector("dialog.output");
const reportlist = output.querySelector("header > ul");
const showmore = output.querySelector(".show-more");

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
}

/* 
** FORCE LOG OUT WHEN REFRESH TOKEN EXPIRED
*/
const forceLogout = () => {
    sessionStorage.removeItem("token");
    localStorage.removeItem("refresh");
    localStorage.removeItem("menulist");
    menulist.replaceChildren();
    document.querySelector(".login-btn").textContent = "Log In";
}

/* 
** COMMON ERROR HANDLER FOR API CALLS
*/
const responseok = (response, result) => {
    if (response.ok && result.success) {
        return(true);
    }
    if (result.cause) {
      throw Error(`${response.status} - ${result.cause}`);
    }
    if (result.sqlcode) {
      throw Error(`${response.status} - ${result.sqlerrm}`);
    } else {
      throw Error(`${result.message}`);
    }
}

/* 
** CALL API FOR RESOURCES WITH ACCESS TOKEN
*/
const callAPI = async (endpoint, method, data) => {
    let url;

    if (!access_token) {
        access_token = localStorage.getItem("token");
    }
    if (!refresh_token) {
        refresh_token = localStorage.getItem("refresh");
    }

    if (expiredToken(access_token)) {
      if (expiredToken(refresh_token)) {
        forceLogout();
        return;
      }
      url = bodydata.resturl + "refresh-token/" + bodydata.websiteid;
      let refresh_headers = new Headers();
      refresh_headers.append("Content-Type", "application/json");
      refresh_headers.append("Authorization","Bearer " + refresh_token);
      const refresh_config = {method: "GET", headers: refresh_headers};
      const refresh_response = await fetch(url, refresh_config);
      const refresh_result = await refresh_response.json();
      if (responseok(refresh_response, refresh_result)) {
          replaceTokens(refresh_result);
      }
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
    
    let config = {method: method, headers: headers};
    if (method==="POST" || method==="PUT") {
        config["body"] = JSON.stringify(data);
    }

    const response = await fetch(url, config);
    const result = await response.json();
  
    if (responseok(response, result)) {
        return(result);
    }
}

/* CLOSE ALL DIALOGS CONSISTENTLY */
document.querySelectorAll("dialog button.close").forEach((button) => {
    button.addEventListener("click", (e) => {
        e.target.closest("dialog").close();
    });
});

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
**  GO TO CMS EDITOR - SHOW MESSAGE WHILST IN PROGRESS
*/
const process_edit_content = (endpoint,method) => {
    reportlist.replaceChildren();
    reportlist.insertAdjacentHTML('afterbegin','<span>UPCOMING FEATURE - EDIT CONTENT</span>');
    const article = output.querySelector("article");
    article.replaceChildren();
    article.insertAdjacentHTML('afterbegin','This will open the current page in the CMS Editor allowing you to edit the content and re-deploy the website.');
    output.showModal();
}