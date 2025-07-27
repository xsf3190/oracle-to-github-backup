/*
** VISIT REPORTS
*/

import { dropdown_details } from "deploy_elements";
import { callAPI, handleError } from "deploy_callAPI";

//const content = output_dialog.querySelector("article");
const output_dialog = document.querySelector("dialog.output");
const reportlist = output_dialog.querySelector("header > ul");
const showmore = output_dialog.querySelector(".show-more");
const article = output_dialog.querySelector("article");
const status = output_dialog.querySelector("footer>*:first-child");

let html = "<h4>Real User Monitoring</h4>";
html += "<p>Whenever a website page is downloaded to a visitor's device a background process captures details about their experience, one of the most important being how long they had to wait before being able to view the content.</p>";
html += "<p>An equally important metric is how long they engaged with the content.</p>";
html += "<p>Was this the first time they visited the page? How many pages did they view? How were they referred to the site? How much data was downloaded? Was the content stable? How responsive was the page to interactions? What was their connection speed and where did they connect from?</p>";
html += "<p>Real User Monitoring is about collecting these details so website owners can measure how their site performs in the field and thereby make informed decisions to improve it</p>";

let endpoint;

export const init = (element) => {
    endpoint = element.dataset.endpoint;

    dropdown_details.removeAttribute("open");

    const reports = element.dataset.reports.split(";");
    let buttons="";
    for (let i = 0; i < reports.length; i++) {
        const elements = reports[i].split("|");
        const buttonText = elements[0].charAt(0).toUpperCase() + elements[0].slice(1);
        buttons += `<li><button class="button" type="button" data-report="${elements[0]}" data-report-type="${elements[1]}" data-button-variant="small">${buttonText}</button></li>`;
    }
    reportlist.replaceChildren();
    reportlist.insertAdjacentHTML('afterbegin',buttons);
    article.replaceChildren();
    article.insertAdjacentHTML('afterbegin',html);

    output_dialog.showModal();
}

const getReport = async (report, reportType, offset) => {
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
reportlist.addEventListener("click", (e) => {
    if (e.target.dataset.report) {
        getReport(e.target.dataset.report, e.target.dataset.reportType, 0);
    }
})

/*
** "SHOW MORE" REPORT BUTTON. PREVENT DOUBLE CLICKS
*/
showmore.addEventListener("click", (e) => {
    if (e.detail===1) {
        getReport(showmore.dataset.report, showmore.dataset.reportType, showmore.dataset.offset);
    }
})