/*
** VISIT REPORTS
*/

import { output_dialog } from "deploy_elements";
import { callAPI, handleError } from "deploy_callAPI";

const header = output_dialog.querySelector("header");
const article = output_dialog.querySelector("article");
const footer = output_dialog.querySelector("footer");

let endpoint;

export const init = (element) => {
    endpoint = element.dataset.endpoint;

    callAPI(endpoint, "GET", "?report=list&offset=0")
    .then((data) => {
        header.querySelector(":first-child").replaceChildren();
        header.insertAdjacentHTML('afterbegin',data.header);
        article.replaceChildren();
        article.insertAdjacentHTML('afterbegin',data.article);
        footer.replaceChildren();
        footer.insertAdjacentHTML('afterbegin',data.footer);
        output_dialog.showModal();
    })
    .catch((error) => {
            handleError(error);
    });
}

const getReport = async (report, reportType, offset) => {
    const showmore = footer.querySelector(".show-more");
    const status = footer.querySelector("footer>*:first-child");

    const query = "?report=" + report + "&offset=" + offset;
    callAPI(endpoint, "GET", query)
    .then((data) => {
        if (reportType==="graph") {
            article.replaceChildren();
            article.insertAdjacentHTML('afterbegin',data.article);
            showmore.classList.add("visually-hidden");
            status.classList.add("visually-hidden");
            return;
        }

        /* TABLE reports always show counts and may have "show more" button */
        
        status.classList.remove("visually-hidden");

        if (offset===0) {
            article.replaceChildren();
            article.insertAdjacentHTML('afterbegin',data.article);
            showmore.dataset.report = report;
            showmore.dataset.reportType = reportType;
        } else if (data.article) {
            article.querySelector("tbody").insertAdjacentHTML('beforeend',data.article);
        }

        const tbody = article.querySelector("tbody");
        status.textContent = tbody.childElementCount + " / " + data.count;

        if (data.count > tbody.childElementCount ) {
            showmore.classList.remove("visually-hidden");
            showmore.dataset.offset = data.offset;
            showmore.disabled = false;
        } else {
            showmore.disabled = true;
            showmore.classList.add("visually-hidden");
        }
    })
    .catch((error) => {
            handleError(error);
    });
}

/*
** COMMON ENTRY POINT FOR HANDLING REPORTS
*/
header.addEventListener("click", (e) => {
    if (e.target.dataset.report) {
        getReport(e.target.dataset.report, e.target.dataset.reportType, 0);
    }
})

/*
** "SHOW MORE" REPORT BUTTON. PREVENT DOUBLE CLICKS
*/
footer.addEventListener("click", (e) => {
    if (e.detail===1) {
        if (e.target.dataset.report) {
            getReport(e.target.dataset.report, e.target.dataset.reportType, e.target.dataset.offset);
        }
    }
})