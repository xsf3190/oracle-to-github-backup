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
            headerTextColor(e.target.value);
            break;;
        case "range":
            if (name.includes("font_size")) {
                target.style.fontSize = e.target.value + "cqi";
            } else if (name.includes("underline")) {
                target.style.textDecoration = "underline";
                target.style.textDecorationOffset = e.target.value + "%";
                target.style.textDecorationThickness = e.target.value + "%";
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

    if (name.includes("color_primary")) {
        headerTextColor(e.target.value);
    }

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
                handle_error(error);
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
                });
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
        const formData = new FormData(editor);
        const formObj = Object.fromEntries(formData);
        console.log("formObj",formObj);
        await callAPI(endpoint,'PUT', formObj)
            .then(() => {
                console.log("Form changes saved");
            })
            .catch((error) => {
                handle_error(error);
            });

        const module_name = e.target.dataset.endpoint;
        const import_module_name = "./deploy_" + module_name.substring(0,module_name.indexOf("/")) + ".min.js";
        await import(import_module_name)
            .then((module) => {
                module.init(e.target);
            })
            .catch((error) => {
                console.error(error);
                console.error("Failed to load " + import_module_name);
            });
    }

});

const handle_error = (error) => {
    const result = editor.querySelector(".result");
    result.textContent = error;
    result.style.color = "red";
}