import { dropdown, login_btn, bodydata, getJWTClaim } from "deploy_elements";
import {onLCP, onINP, onCLS, onFCP, onTTFB} from 'deploy_web_vitals';



/*
** NEW WEBSITE URL INCLUDES OWNER'S JWT TOKENS - SAVE THESE IN STORAGE AND REMOVE FROM URL
*/
const url = new URL(window.location.href);
if (url.searchParams.has("refresh")) {
    localStorage.setItem("refresh", url.searchParams.get("refresh"));
    sessionStorage.setItem("token", url.searchParams.get("token"));
    url.searchParams.delete('token');
    url.searchParams.delete('refresh');
    history.replaceState(history.state, '', url.href);
}

/*
** CLOSE DIALOGS BY CLICKING X BUTTON
*/
const closeBtnEvents = () => {
    document.querySelectorAll("dialog button.close").forEach((button) => {
        button.addEventListener("click", (e) => {
            e.target.closest("dialog").close();
        });
    });
}

/*
** SET DROPDOWN ELEMENTS IF REFRESH TOKEN EXISTS
*/
if (sessionStorage.getItem("menulist")) {
    dropdown.insertAdjacentHTML('beforeend',sessionStorage.getItem("menulist"));
    document.body.insertAdjacentHTML('beforeend',sessionStorage.getItem("dialogs"));
    login_btn.textContent = "Log Out";
    closeBtnEvents();
} else if (localStorage.getItem("menulist")) {
    dropdown.insertAdjacentHTML('beforeend',localStorage.getItem("menulist"));
    document.body.insertAdjacentHTML('beforeend',localStorage.getItem("dialogs"));
    sessionStorage.setItem("menulist",localStorage.getItem("menulist"));
    sessionStorage.setItem("dialogs",localStorage.getItem("dialogs"));
    login_btn.textContent = "Log Out";
    closeBtnEvents();
}

/*
** CLICK HANDLER FOR ALL BUTTONS IN DYNAMIC DROPDOWN MENULIST
*/
dropdown.addEventListener("click", async (e) => {
    let module_name = e.target.dataset.endpoint;
    if (!module_name) return;
    module_name = "deploy_" + module_name.substring(0,module_name.indexOf("/"));
    import(module_name)
        .then((module) => {
            module.init(e.target);
        })
        .catch((error) => {
            console.error(error);
            console.error("Failed to load " + module_name);
        });
})

/*
** PROMOTION BUTTON IS FOR VISITOR TO CREATE THEIR OWN WEBSITE - SIMULATE  LOG IN WITH DOMAIN NAME PROMPT
*/
document.querySelector(".promotion")?.addEventListener("click", () => {
    login_btn.dataset.promotion = true;
    login_btn.click();
})

/*
** SETUP COLLECTION OF METRICS. 
*/
if (!sessionStorage.getItem("website_loaded")) {
    console.log("setting sessionStorage.website_loaded");
    sessionStorage.setItem("website_loaded",Math.round(Date.now()/1000));
}

let page_loaded = Date.now(),
    page_visit = 0,
    transfer_size = 0;

const vitalsQueue = new Set();

const flushQueues = () => {

    const aud = getJWTClaim("aud");
    if (aud === "admin" || aud === "owner") return;

    if (vitalsQueue.size === 0 && page_loaded === 0) return;

    const website_loaded = Number(sessionStorage.getItem("website_loaded"));
    /* This would happen if user manually clears sessionStorage for example */
    if (website_loaded === 0) return; 

    const json = {};
    json["website_id"] = bodydata.websiteid;
    json["article_id"] = bodydata.articleid;
    json["website_loaded"] = Number(sessionStorage.getItem("website_loaded"));
    json["seq"] = page_visit;
    json["webdriver"] = navigator.webdriver;
    if (page_loaded !== 0) {
        json["duration_visible"] =  Math.round((Date.now() - page_loaded)/1000);
        page_loaded = 0;
    }

    if (vitalsQueue.size > 0) {
        for (const item of vitalsQueue.values()) {
            json[item.name] = item.name === "CLS" ? item.value.toFixed(2) : item.value.toFixed();
            json[item.name+"_rating"] = item.rating;
        }
        vitalsQueue.clear();
    }

    /* Send full details only on first page visit to save network cost */
    if (page_visit === 0) {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (connection) {
            json["connection"] = connection.downlink + " Mb/s" + " -" + connection.effectiveType;
        }
        if (navigator.userAgentData) {
            json["mobile"] = navigator.userAgentData.mobile;
        }
        json["url"] = window.location.hostname;
        json["referrer"] = document.referrer;
        json["transfer_size"] = transfer_size;
    }

    const body = JSON.stringify(json);
    page_visit++;
    (navigator.sendBeacon && navigator.sendBeacon(bodydata.resturl+"page-visit", body)) || fetch(visit_url, {body, method: 'POST', keepalive: true});
}

const addToVitalsQueue = (metric) => {
    console.log(metric.name,metric.value);
    vitalsQueue.add(metric);
};

addEventListener('visibilitychange', () => {
    if (document.visibilityState === "hidden") {
        flushQueues();
    } else {
        page_loaded = Date.now();
    }
}, { capture: true} );

if ('onpagehide' in self) {
    addEventListener('pagehide', () => {
        flushQueues();
    }, { capture: true} );
}

/*
** PERFORMANCE OBSERVER FOR LOADED RESOURCE TRANSFER SIZE
*/
const observer = new PerformanceObserver((list) => {
  list.getEntries().forEach((entry) => {
    console.log(entry.name,entry.transferSize);
    transfer_size+=entry.transferSize;
  });
});

observer.observe({ type: "resource", buffered: true });

onCLS(addToVitalsQueue);
onLCP(addToVitalsQueue);
onINP(addToVitalsQueue);
onFCP(addToVitalsQueue);
onTTFB(addToVitalsQueue);