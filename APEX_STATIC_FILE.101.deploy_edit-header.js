/*
**  EDIT WEBSITE HEADER
*/
import { header, dropdown_details, menulist, set_alert } from "./deploy_elements.min.js";
import { callAPI, handleError } from "./deploy_callAPI.min.js";
import { show_media } from  "./deploy_edit-content.min.js";

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
            editor.scrollIntoView();
        })
        .catch((error) => {
            handleError(error);
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
            headerTextColor(e.target.value);
            break;;
        case "range":
            if (name.includes("font_size")) {
                target.style.fontSize = e.target.value + "cqi";
            } else if (name.includes("underline")) {
                if (e.target.value==="0") {
                    target.style.textDecoration = "none";
                } else {
                    target.style.textDecoration = "underline";
                    target.style.textUnderlineOffset = e.target.value + "%";
                    target.style.textDecorationThickness = e.target.value + "%";
                }
            } else if (name.includes("font_wght")) {
                target.style.fontWeight = e.target.value;
            } else if (name.includes("font_wdth")) {
                target.style.fontStretch = e.target.value + "%";
            } else if (name.includes("font_opsz")) {
                target.style.fontVariationSettings = '"opsz" ' + e.target.value;
            } else if (name.includes("font_slnt")) {
                target.style.fontVariationSettings = '"slnt" ' + e.target.value;
            } else if (name.includes("font_ital")) {
                target.style.fontStyle = e.target.value==="0" ? "normal" : "italic";
            }
            break;;
    }
});

const headerTextColor = (color) => {
    const whiteRGB = hexToRGB("#ffffff");
    const colorRGB = hexToRGB(color);
    const whiteluminance = luminance(whiteRGB.r, whiteRGB.g, whiteRGB.b);
    const colorluminance = luminance(colorRGB.r, colorRGB.g, colorRGB.b);
    const ratio = whiteluminance > colorluminance 
            ? ((colorluminance + 0.05) / (whiteluminance + 0.05))
            : ((whiteluminance + 0.05) / (colorluminance + 0.05));

    //header.style.backgroundColor = e.target.value;
    const root = document.documentElement;
    root.style.setProperty('--color-primary', color);
    const header_text_color = editor.querySelector("[name='header_text_color']");
    if (ratio < 1/4.5) {
        root.style.setProperty('--header-text-color',"#ffffff");
        header_text_color.value = "#ffffff";
    } else {
        root.style.setProperty('--header-text-color',"#000000");
        header_text_color.value = "#000000";
    }
}

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
    
    const name = e.target.getAttribute("name");
    const target = header.querySelector("." + name.split("_")[0]);
    
    if (name.includes("font_category")) {
        const query = "?category=" + e.target.value + "&font=0";
        callAPI('fonts/:ID','GET', query)
            .then((data) => {
                const family = e.target.parentElement.nextSibling.querySelector("select");
                let index = family.options.length;
                while (index--) {
                    family.remove(index);
                }
                family.insertAdjacentHTML('beforeend',data.content);
                
            })
            .catch((error) => {
                handleError(error);
            });
    } else if (name.includes("font_family")) {
        if (!e.target.value) {
            return;
        }
        const query = "?category=&font=" + e.target.value;
        callAPI('fonts/:ID','GET', query)
            .then((data) => {
                data.axes.forEach((axis) => {
                    const label = e.target.closest("fieldset").querySelector("[for$='"+axis.name+"']");
                    const input = label.querySelector("input");
                    if (axis.max) {
                        label.classList.remove("visually-hidden");
                        input.disabled = false;
                        input.setAttribute("min",axis.min);
                        input.setAttribute("max",axis.max);
                        input.value = axis.name==="ital" ? 0 : Math.round(axis.min+((axis.max-axis.min)/2));
                    } else {
                        label.classList.add("visually-hidden");
                        input.disabled = true;
                    }
                })
                const font_family = e.target.options[e.target.selectedIndex].text;
                const fontFile = new FontFace(font_family,data.url);
                document.fonts.add(fontFile);
                fontFile.load();
                document.fonts.ready.then(()=>{
                    console.log(`Loaded ${font_family}`);
                    target.style.fontFamily = font_family;
                    document.documentElement.style.setProperty('--font-family-' + name.split("_")[0], font_family); 
                });
            })
            .catch((error) => {
                handleError(error);
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
        header.style.backgroundColor = newColor;
        headerTextColor(newColor);
    }

    if (e.target.matches(".background-image")) {
        show_media("hero");
    }

    if (e.target.matches(".delete-image")) {
        const img = header.querySelector("img");
        if (img) {
            callAPI("edit-header/:ID","DELETE",{})
                .then( () => {
                    img.remove();
                })
                .catch((error) => {
                    handleError(error);
                })
        }
    }

    if (e.target.matches(".save-changes")) {
        const formData = new FormData(editor);
        const formObj = Object.fromEntries(formData);
        await callAPI(endpoint,'PUT', formObj)
            .then(() => {
                set_alert(editor.querySelector("[role='alert']"));
            })
            .catch((error) => {
                handleError(error);
            });
    }

    if (e.target.matches(".publish-changes")) {
        const formData = new FormData(editor);
        const formObj = Object.fromEntries(formData);
        await callAPI(endpoint,'PUT', formObj)
            .then(() => {
                console.log("Form changes saved");
            })
            .catch((error) => {
                handleError(error);
            });

        const module_name = e.target.dataset.endpoint;
        const import_module_name = "./deploy_" + module_name.substring(0,module_name.indexOf("/")) + ".min.js";
        await import(import_module_name)
            .then((module) => {
                module.init(e.target);
            })
            .catch((error) => {
                handleError(error);
            });
    }

});