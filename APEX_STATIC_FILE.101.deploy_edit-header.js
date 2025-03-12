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
            handle_error(error);
        });
}

editor.addEventListener("input", (e) => {
    const name = e.target.getAttribute("name");
    const type = e.target.getAttribute("type");

    const target = header.querySelector("." + name.split("_")[0]);

    switch (type) {
        case "text":
            target.style.display = "block";
            target.textContent = e.target.value;
            let numOfEnteredChars = e.target.value.length;
            const charcounter = e.target.parentElement.querySelector(".charcounter");
            const maxchars = e.target.getAttribute("maxlength");
            charcounter.textContent = numOfEnteredChars + "/" + maxchars;

            if (numOfEnteredChars === Number(maxchars)) {
                charcounter.style.color = "red";
            } else {
                charcounter.style.color = "initial";
            }
            break;;
        case "color":
            header.style.backgroundColor = e.target.value;
            break;;
        case "range":
            if (name.includes("font_size")) {
                target.style.fontSize = "var(--step-" + e.target.value + ")";
            } else if (name.includes("letter_spacing")) {
                target.style.letterSpacing = e.target.value + "em";
                target.style.marginRight = "-" + e.target.value + "em";
            } else if (name.includes("font_wght")) {
                target.style.fontWeight = e.target.value;
            } else if (name.includes("font_wdth")) {
                target.style.fontStretch = e.target.value + "%";
            } else if (name.includes("font_opsz")) {
                target.style.fontVariationSettings = '"opsz"' + e.target.value;
            } else if (name.includes("font_slnt")) {
                target.style.fontVariationSettings = '"slnt"' + e.target.value;
            }
            break;;
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
    if (e.target.dataset.column==="website.color_primary") {
        const whiteRGB = hexToRGB("#ffffff");
        const colorRGB = hexToRGB(e.target.value);
        const whiteluminance = luminance(whiteRGB.r, whiteRGB.g, whiteRGB.b);
        const colorluminance = luminance(colorRGB.r, colorRGB.g, colorRGB.b);
        const ratio = whiteluminance > colorluminance 
                ? ((colorluminance + 0.05) / (whiteluminance + 0.05))
                : ((whiteluminance + 0.05) / (colorluminance + 0.05));

        header.style.backgroundColor = e.target.value;
        if (ratio < 1/4.5) {
            header.style.color = "#ffffff";
        } else {
            header.style.color = "#000000";
        }
    }

    const name = e.target.getAttribute("name");
    const target = header.querySelector("." + name.split("_")[0]);
    
    if (name.includes("font_ital")) {
        if (e.targetvalue==='on') {
            target.style.fontStyle = "italic";
        } else {
            target.style.fontStyle = "normal";
        }
    } else if (name.includes("font_category")) {
        const query = "?category=" + e.target.value + "&font=0";
        callAPI('fonts/:ID','GET', query)
            .then((data) => {
                const family = e.target.parentElement.nextSibling.querySelector("select");
                let index = family.options.length;
                while (index--) {
                    family.remove(index);
                }
                family.insertAdjacentHTML('beforeend',data.content);
                const controls=e.target.closest("fieldset").querySelector(":last-child");
                
            })
            .catch((error) => {
                handle_error(error);
            });
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

    if (e.target.matches(".eyedropper")) {
        const abortController = new AbortController();
        const newColor = await selectColorFromScreen(abortController);
        const colorInput = editor.querySelector(".background-color");
        colorInput.value = newColor;
        colorInput.dispatchEvent(new Event('change', { 'bubbles': true }));
    }

    if (e.target.matches(".publish-changes")) {
        console.log("publish-changes");
    }

    if (e.target.matches(".save-changes")) {
        const formData = new FormData(editor);
        const formObj = Object.fromEntries(formData);
        console.log("formObj",formObj);
        callAPI(endpoint,'PUT', formObj)
            .then(() => {
                console.log("saved");
            })
            .catch((error) => {
                handle_error(error);
            });
    }

});

const handle_error = (error) => {
    const result = editor.querySelector(".result");
    result.textContent = error;
    result.style.color = "red";
}