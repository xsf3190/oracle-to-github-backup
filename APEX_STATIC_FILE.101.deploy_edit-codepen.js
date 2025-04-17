/*
**  OPEN CURRENT PAGE IN CODEPEN EDITOR
*/
import { callAPI, handleError } from "./deploy_callAPI.min.js";

let endpoint;

export const init = (element) => {
    endpoint = element.dataset.endpoint;

    callAPI(endpoint, "GET")
        .then((data) => {
            const form = document.querySelector("[action='https://codepen.io/pen/define']");
            const formdata = {
                title: data.domain_name,
                html: data.html,
                css: data.css,
                js: data.js,
                editors: "110"
            };
            const input = form.querySelector("[name='data']");
            input.value = JSON.stringify(formdata);
            form.submit();
        })
        .catch((error) => {
            handleError(error);
        });
}