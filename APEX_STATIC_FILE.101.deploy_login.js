window.isAuthenticated = false;
window.identity = {};
window.token = '';

function handleCredentialResponse(response) {
    console.log("start handleCredentialResponse")
    window.token = response.credential;
    window.identity = parseJwt(response.credential);
    window.isAuthenticated = true;
    showAuthInfo();
}

function showAuthInfo() {
    console.log("window.isAuthenticated",window.isAuthenticated)
    if (window.isAuthenticated) { 
        var keys = Object.keys(window.identity);
        var j = 0;
        for (var i = 1; i < keys.length; i++) {
            console.log(keys[j],  window.identity[keys[j]] );
            j++;
        }
    }
}

window.onload = function () {
    window.isAuthenticated = false;
    showAuthInfo();
    google.accounts.id.initialize({
        client_id: "172908669052-u3neamoi7j07i4vo7dmjmjlifj22spsr.apps.googleusercontent.com",
        callback: handleCredentialResponse,
        auto_select: true,
    });
    google.accounts.id.renderButton(
        document.getElementById("g_login"),
        { theme: "outline", size: "large" }  // customization attributes
    );
    google.accounts.id.prompt(); // also display the One Tap dialog
}

let b64DecodeUnicode = str =>
  decodeURIComponent(
    Array.prototype.map.call(atob(str), c =>
      '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    ).join(''))

let parseJwt = token =>
  JSON.parse(
    b64DecodeUnicode(
      token.split('.')[1].replace('-', '+').replace('_', '/')
    )
  )