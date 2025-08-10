/*
**  EDIT WEBSITE HEADER
*/
import { header, dropdown, set_alert, selectColorFromScreen } from "deploy_elements";
import { callAPI, handleError } from "deploy_callAPI";

const editor = header.previousElementSibling;

let endpoint;

export const init = (element) => {
    endpoint = element.dataset.endpoint;
    
    const eyedropper = window.EyeDropper ? true : false;
    const query = "?eyedropper="+eyedropper;

    callAPI(endpoint,'GET', query)
        .then((data) => {
            editor.insertAdjacentHTML('afterbegin',data.html);
            editor.scrollIntoView({ behavior: 'smooth', block: 'end' });
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
            if (name === "color_primary") {
                setBackgroundColor(e.target.value);
            } else if (name.includes("color")) {
                target.style.color = e.target.value;
            }
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
            } else if (name.includes("margin")) {
                target.style.marginBlock = e.target.value + "vh";
            } else if (name.includes("font_wght")) {
                target.style.fontWeight = e.target.value;
            } else if (name.includes("font_wdth")) {
                target.style.fontStretch = e.target.value + "%";
            } else if (name.includes("font_opsz")) {
                target.style.fontVariationSettings = '"opsz" ' + e.target.value;
            } else if (name.includes("font_slnt")) {
                target.style.fontStyle = "oblique " + e.target.value + "deg";
            } else if (name.includes("font_ital")) {
                target.style.fontStyle = e.target.value==="0" ? "normal" : "italic";
            }
            break;;
    }
});

editor.addEventListener("change", (e) => {
    
    const name = e.target.getAttribute("name");
    const context = name.split("_")[0];
    const target = header.querySelector("." + context);
    
    if (name.includes("font_category")) {
        const query = "?category=" + e.target.value + "&font=0&context=" + context;
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
                        // input.value = axis.name==="ital" ? 0 : Math.round(axis.min+((axis.max-axis.min)/2));
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
        setBackgroundColor(newColor);

    }

    /*
    if (e.target.matches(".background-image")) {
        show_media("hero");
    }
    */

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
                dropdown.querySelector("button.publish-website").click();
            })
            .catch((error) => {
                handleError(error);
            });
    }
});

/*
** SET BACKGROUND COLOR OF ALL RELEVANT ELEMENTS
*/
const setBackgroundColor = (color) => {
    header.style.backgroundColor = color;
    document.querySelectorAll(".curve").forEach ((curve) => {
        curve.style.fill = color;
    });
}