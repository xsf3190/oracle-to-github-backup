import { bodydata, menulist, login_btn, info_dialog } from "./deploy_elements.min.js";

let access_token = sessionStorage.getItem("token");
let refresh_token = localStorage.getItem("refresh");

const handleError = (error) => {
    const article = info_dialog.querySelector("article");
    article.replaceChildren();
    article.insertAdjacentHTML('afterbegin',error);
    error_dialog.showModal();
}

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
    sessionStorage.clear();
    localStorage.clear();
    menulist.replaceChildren();
    login_btn.textContent = "Log In";
}

/* 
** COMMON ERROR HANDLER FOR API CALLS
*/
const responseok = (response, result) => {
    if (response.ok && result.success) {
        return(true);
    }
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

export { handleError, callAPI };