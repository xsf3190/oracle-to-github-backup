/*
**  EDIT WEBSITE FOOTER
*/
import { footer, dropdown_details } from "./deploy_elements.min.js";
import { callAPI } from "./deploy_callAPI.min.js";

const editor = footer.previousElementSibling;

let endpoint;

export const init = (element) => {
    endpoint = element.dataset.endpoint;

    if (!document.querySelector("head > link[href='/website_edit.css']")) {
        const link_edit = document.createElement('link');
        link_edit.setAttribute('rel', 'stylesheet');
        link_edit.setAttribute('href', '/website_edit.css');
        document.head.appendChild(link_edit);
    }

    callAPI(endpoint,'GET')
        .then((data) => {
            editor.insertAdjacentHTML('afterbegin',data.html);
            dropdown_details.removeAttribute("open");
            editor.scrollIntoView();
        })
        .catch((error) => {
            handle_error(error);
        });
}


editor.addEventListener("click", async (e) => {
    if (e.target.matches(".cancel-changes")) {
        window.location.reload();
        return;
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