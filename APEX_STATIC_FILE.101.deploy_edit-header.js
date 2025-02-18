/*
**  EDIT WEBSITE HEADER
*/
import { header, dropdown_details } from "./deploy_elements.min.js";
import { callAPI } from "./deploy_callAPI.min.js";

const editor = header.previousElementSibling;

let endpoint;

export const init = (element) => {
    endpoint = element.dataset.endpoint;
    
    const eyedropper = window.EyeDropper ? true : false;
    const query = "?eyedropper="+eyedropper;

    callAPI(endpoint,'GET', query)
        .then((data) => {
            editor.insertAdjacentHTML('afterbegin',data.html);
            dropdown_details.removeAttribute("open");
        })
        .catch((error) => {
            header.insertAdjacentHTML('beforebegin','<div style="color:red">' + error + '</div>');
        });
}

editor.addEventListener("input", (e) => {
    if (e.target.matches("[type='text']")) {
        let numOfEnteredChars = e.target.value.length;
        const charcounter = e.target.parentElement.querySelector(".charcounter");
        const maxchars = e.target.getAttribute("maxlength");
        charcounter.textContent = numOfEnteredChars + "/" + maxchars;

        if (numOfEnteredChars === Number(maxchars)) {
            charcounter.style.color = "red";
        } else {
            charcounter.style.color = "initial";
        }
    }
    if (e.target.matches("[type='color']")) {
        header.style.backgroundColor = e.target.value;
    }
});

const hexToRGB = (hex) => {
    var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, function(m, r, g, b) {
        return r + r + g + g + b + b;
    });
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    };
}

const luminance = (r, g, b) => {
    const a = [r, g, b].map(function (v) {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow( (v + 0.055) / 1.055, 2.4 );
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

editor.addEventListener("change", (e) => {
    console.log(e.target.dataset.column, e.target.value);
    if (e.target.dataset.column==="website.color_primary") {
        const whiteRGB = hexToRGB("#ffffff");
        const colorRGB = hexToRGB(e.target.value);
        const whiteluminance = luminance(whiteRGB.r, whiteRGB.g, whiteRGB.b);
        const colorluminance = luminance(colorRGB.r, colorRGB.g, colorRGB.b);
        const ratio = whiteluminance > colorluminance 
                ? ((colorluminance + 0.05) / (whiteluminance + 0.05))
                : ((whiteluminance + 0.05) / (colorluminance + 0.05));
        let rating;
        if (ratio < 1/7) {
            rating = "AAA PASS";
        } 
        else if (ratio < 1/4.5) {
            rating = "AA PASS";
        } else {
            rating = "CONTRAST FAIL";
        }
        console.log("ratio",ratio,rating);
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

editor.addEventListener("click", async (e) => {
    if (e.target.matches(".cancel-changes")) {
        window.location.reload();
        return;
    }

    const colorInput = editor.querySelector(".background-color");

    if (e.target.matches(".eyedropper")) {
        const abortController = new AbortController();
        const newColor = await selectColorFromScreen(abortController);
        colorInput.value = newColor;
        header.style.backgroundColor = newColor;
        colorInput.dispatchEvent(new Event('change', { 'bubbles': true }));
    }

    if (e.target.matches(".publish-changes")) {
        console.log("publish-changes");
    }
});