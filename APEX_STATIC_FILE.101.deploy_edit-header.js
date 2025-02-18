/*
**  EDIT WEBSITE HEADER
*/
import { header, dropdown_details } from "./deploy_elements.min.js";
import { callAPI } from "./deploy_callAPI.min.js";


let endpoint;

export const init = (element) => {
    endpoint = element.dataset.endpoint;
    
    // CONVERT STATIC ELEMENTS TO INPUT ELEMENTS
    const container = header.querySelector("div");
    const eyedropper = window.EyeDropper ? true : false;
    const query = "?eyedropper="+eyedropper;

    callAPI(endpoint,'GET', query)
        .then((data) => {
            container.replaceChildren();
            container.insertAdjacentHTML('afterbegin',data.html);
            dropdown_details.removeAttribute("open");
        })
        .catch((error) => {
            container.textContent = error;
            container.style.color = "red";
        });
}

header.addEventListener("input", (e) => {
    let numOfEnteredChars = e.target.value.length;
    const charcounter = e.target.parentElement.querySelector(".charcounter");
    const maxchars = e.target.getAttribute("maxlength");
    charcounter.textContent = numOfEnteredChars + "/" + maxchars;

    if (numOfEnteredChars === Number(maxchars)) {
        charcounter.style.color = "red";
    }
});

const selectColorFromScreen = async (abortController) => {
  const eyeDropper = new EyeDropper();
  try {
    const result = await eyeDropper.open({ signal: abortController.signal });
    return result.sRGBHex;
  } catch (e) {
    return null;
  }
}

header.addEventListener("click", async (e) => {
    if (e.target.matches(".cancel-changes")) {
        window.location.reload();
        return;
    }

    const colorInput = header.querySelector(".background-color");

    if (e.target.matches(".eyedropper")) {
        const abortController = new AbortController();
        const newColor = await selectColorFromScreen(abortController);
        colorInput.value = newColor;
    }

    if (e.target.matches(".publish-changes")) {
        const formData = new FormData(header.querySelector("form"));
        callAPI(endpoint,'PUT', Object.fromEntries(formData))
            .then(() => {
                result.style.opacity = "1";
                console.log("ok");
            })
            .catch((error) => {
                result.textContent = error;
                result.style.color = "red";
            });
    }
});