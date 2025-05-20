export const bodydata = document.body.dataset;

export const dropdown_details = document.querySelector(".dropdown details");
export const dropdown = document.querySelector(".dropdown-content");
export const email = dropdown.querySelector(".email");
export const expires = dropdown.querySelector(".expires");
export const login_btn = dropdown.querySelector(".login-btn");
export const menulist = dropdown.querySelector(".menulist");
export const login_dialog = document.querySelector("dialog.login-email");

export const nav = document.querySelector(".topnav");
export const header = document.querySelector("body>header");
export const main = document.querySelector("main");
export const footer = document.querySelector("body>footer");

export const set_alert = (alert) => {
    alert.textContent = "SAVED";
    alert.style.background="green";
    setTimeout(() => {
        alert.textContent = "";
        alert.style.background="rebeccapurple";
    }, 1500);
}

export const selectColorFromScreen = async (abortController) => {
  const eyeDropper = new EyeDropper();
  try {
    const result = await eyeDropper.open({ signal: abortController.signal });
    return result.sRGBHex;
  } catch (e) {
    return null;
  }
}

login_dialog.querySelector("button.close").addEventListener("click", () => {
    login_dialog.close();
})