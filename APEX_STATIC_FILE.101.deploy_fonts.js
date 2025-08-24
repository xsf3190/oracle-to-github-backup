import { dialog_header, dialog_article } from "deploy_elements";
import { callAPI, handleError } from "deploy_callAPI";

export const init = (fontfaces) => {

   for (const fontface of fontfaces) {
        const fontFile = new FontFace(fontface.family,fontface.url);
        document.fonts.add(fontFile);
        fontFile.load();
    };
    

    dialog_header.addEventListener("click", async (e) => {
        if (!e.target.matches(".variable")) return;

        const svg = e.target.querySelector("svg");
        svg.classList.toggle("visually-hidden");

        const variable = svg.classList.contains("visually-hidden") ? 0 : 1;
        
        const categories = dialog_article.querySelectorAll("[id$='category']");
        categories.forEach((category) => {
            const selected = category.options[category.selectedIndex].value;
            const context = category.getAttribute("name").split("_")[0];
            const query = "?category=" + selected + "&font=0&context=" + context + "&variable=" + variable;

            callAPI('fonts/:ID','GET', query)
                .then((data) => {
                    const family = category.parentElement.querySelector("select:last-of-type");
                    let index = family.options.length;
                    while (index--) {
                        family.remove(index);
                    }
                    family.insertAdjacentHTML('beforeend',data.content);
                })
                .catch((error) => {
                    handleError(error);
                });
        });
    });

    dialog_article.addEventListener("change", (e) => {
        const name = e.target.getAttribute("name");
        const context = name.split("_")[0];
        const icon = dialog_header.querySelector(".variable>.icon");
        const variable = icon.classList.contains("visually-hidden") ? 0 : 1;

        /* 
        ** USER SELECTS FONT CATEGORY - UPDATE ADJACENT SELECT WITH NEW FAMILY OPTIONS 
        */
        if (name.includes("font_category")) {
            const query = "?category=" + e.target.value + "&font=0&context=" + context + "&variable=" + variable;
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
             const loader = e.target.closest("fieldset").querySelector(".loader");
            loader.style.opacity=1;
            const query = "?category=&font=" + e.target.value + "&variable=" + variable;
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
}