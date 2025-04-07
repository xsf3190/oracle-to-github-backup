/*
**  EDIT WEBSITE FOOTER
*/
import { footer, dropdown_details } from "./deploy_elements.min.js";
import { callAPI } from "./deploy_callAPI.min.js";

const editor = footer.previousElementSibling;

let endpoint;

export const init = (element) => {
    endpoint = element.dataset.endpoint;

    callAPI(endpoint,'GET')
        .then((data) => {
            editor.insertAdjacentHTML('afterbegin',data.html);
            dropdown_details.removeAttribute("open");
            editor.scrollIntoView();
            footer.replaceChildren();
            footer.insertAdjacentHTML('afterbegin',data.footer);
        })
        .catch((error) => {
            handle_error(error);
        });
}

/*
**  REFLECT USER INPUT DIRECTLY IN FOOTER ELEMENTS
*/
editor.addEventListener("input", (e) => {
    const name = e.target.getAttribute("name");
    const target = footer.querySelector("[data-" + name + "]");
    /*
    ** target is <a href=""><svg></svg><span></span></a>
    */
    switch (name) {
        case "linkedin_name":
            target.childNodes[1].textContent = "Let's Connect";
            break;
        case "instagram_name":
            target.childNodes[1].textContent = "Connect Instagram";
            break;
        default:
            target.childNodes[1].textContent = e.target.value;
    }
});

/*
**  UPDATE HREF IN CASE USER TESTS
*/
editor.addEventListener("change", (e) => {
    const name = e.target.getAttribute("name");
    const target = footer.querySelector("[data-" + name + "]");

    target.target = "_blank";

    switch (name) {
        case "contact_email":
            target.href = "mailto:" + e.target.value;
            break;
        case "telephone_number":
            target.href = "tel:" + e.target.value;
            break;
        case "mobile_number":
            target.href = "tel:" + e.target.value;
            break;
        case "linkedin_name":
            target.href = "https://linkedin.com/in/" + e.target.value;
            break;
        case "instagram_name":
            target.href = "https://instagram.com//" + e.target.value;
            break;
        default:
            console.error("footer element not supported");
    }
});

editor.addEventListener("click", async (e) => {
    if (e.target.matches(".cancel-changes")) {
        window.location.reload();
        return;
    }

    if (e.target.matches(".save-changes")) {
        const formData = new FormData(editor);
        const formObj = Object.fromEntries(formData);
        await callAPI(endpoint,'PUT', formObj)
            .then(() => {
                const result = editor.querySelector(".result");
                result.textContent = 'Changes Saved';
                result.style.color = "green";
            })
            .catch((error) => {
                handle_error(error);
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
                handle_error(error);
            });

        const import_module_name = "./deploy_publish-website.min.js";
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