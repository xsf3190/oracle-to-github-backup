/*
**  EDIT WEBSITE FOOTER
*/
import { footer, dropdown, set_alert, selectColorFromScreen } from "deploy_elements";
import { callAPI, handleError } from "deploy_callAPI";

const editor = footer.previousElementSibling;

let endpoint;

export const init = (element) => {
    endpoint = element.dataset.endpoint;

    const eyedropper = window.EyeDropper ? true : false;
    const query = "?eyedropper="+eyedropper;

    callAPI(endpoint,'GET',query)
        .then((data) => {
            editor.insertAdjacentHTML('afterbegin',data.html);
            editor.scrollIntoView({ behavior: 'smooth', block: 'end' });
            footer.replaceChildren();
            footer.insertAdjacentHTML('afterbegin',data.footer);
        })
        .catch((error) => {
            handleError(error);
        });
}

/*
**  REFLECT USER INPUT DIRECTLY IN FOOTER ELEMENTS
*/
editor.addEventListener("input", (e) => {
    const name = e.target.getAttribute("name");

    if (name==="footer_background_color") {
        footer.style.backgroundColor = e.target.value;
        return;
    }

    if (name==="footer_color") {
        footer.style.color = e.target.value;
        return;
    }

    const target = footer.querySelector("[data-" + name + "]");
    /*
    ** target is <a href=""><svg></svg><span></span></a>
    */
    switch (name) {
        case "linkedin_name":
            target.childNodes[1].textContent = e.target.value.length ? "Let's Connect" : "";
            break;
        case "instagram_name":
            target.childNodes[1].textContent = e.target.value.length ? "Connect Instagram" : "";
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

    if (e.target.matches(".eyedropper")) {
        const abortController = new AbortController();
        const newColor = await selectColorFromScreen(abortController);
        const colorInput = editor.querySelector("[name='footer_background_color']");
        colorInput.value = newColor;
        footer.style.backgroundColor = newColor;
        return;
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