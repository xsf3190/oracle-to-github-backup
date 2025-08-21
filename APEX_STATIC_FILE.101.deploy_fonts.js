import { dialog_article, dialog_footer } from "deploy_elements";
import { callAPI, handleError } from "deploy_callAPI";

export const init = () => {
    dialog_article.addEventListener("change", (e) => {
    
        const name = e.target.getAttribute("name");
        const context = name.split("_")[0];

        /* 
        ** USER SELECTS FONT CATEGORY - UPDATE ADJACENT SELECT WITH NEW FAMILY OPTIONS 
        */
        if (name.includes("font_category")) {
            const query = "?category=" + e.target.value + "&font=0&context=" + context;
            callAPI('fonts/:ID','GET', query)
                .then((data) => {
                    const family = e.target.parentElement.querySelector("select:last-of-type");
                    let index = family.options.length;
                    while (index--) {
                        family.remove(index);
                    }
                    family.insertAdjacentHTML('beforeend',data.content);
                })
                .catch((error) => {
                    handleError(error);
                });
        /* 
        ** USER SELECTS FONT FAMILY - LOAD SELECTED FONT AND SET CSS ROOT PROPERTY
        */
        } else if (name.includes("font_family")) {
            if (!e.target.value) {
                return;
            }
            const loader = dialog_article.querySelector(".loader");
            loader.style.opacity=1;
            const query = "?category=&font=" + e.target.value;
            callAPI('fonts/:ID','GET', query)
                .then((data) => {
                    /*
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
                    */
                    const font_family = e.target.options[e.target.selectedIndex].text;
                    const fontFile = new FontFace(font_family,data.url);
                    document.fonts.add(fontFile);
                    fontFile.load();
                    document.fonts.ready.then(()=>{
                        console.log(`Loaded ${font_family}`);
                        document.documentElement.style.setProperty('--font-family-' + name.split("_")[0], font_family); 
                        loader.style.opacity=0;
                    });
                })
                .catch((error) => {
                    loader.style.opacity=0;
                    handleError(error);
                });
        }

    });

    dialog_footer.addEventListener("click", async (e) => {
        if (e.target.contains("confirm")) {
            console.log("confirm");
            const formData = new FormData(dialog_article);
            const formObj = Object.fromEntries(formData);
            await callAPI("fonts/:ID",'PUT', formObj)
                .then(() => {
                    set_alert(editor.querySelector("[role='alert']"));
                })
                .catch((error) => {
                    handleError(error);
                });
        }
    });
}