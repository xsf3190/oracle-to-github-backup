const bodydata = document.body.dataset;
const dropdown = document.querySelector("#menulist");
const login_btn = dropdown.querySelector(".login-btn");
const email = dropdown.querySelector(".email");
const vitalsQueue = new Set();
const narrow_viewport = window.matchMedia("(width <= 600px)");

if (narrow_viewport.matches) {
    const nav = document.querySelector("nav");
    if (nav.classList.contains("can-shrink")) {
        const ul = nav.querySelector("ul");
        menulist.prepend(nav);
        ul.style.flexDirection="column";
        ul.style.alignItems="start";
        ul.style.paddingBlockEnd="1rem";
    }
}

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
** TRACK PAGES VISITED IN SESSION 
*/
let pages_visited = JSON.parse(sessionStorage.getItem("pages_visited"));
const page_id = Number(document.body.dataset.articleid);
const pages_set = new Set(pages_visited);
pages_set.add(page_id);
sessionStorage.setItem("pages_visited",JSON.stringify(Array.from(pages_set)));

/*
** DIALOG CLOSE BUTTON HANDLERS
*/
document.querySelectorAll("dialog button.close").forEach((button) => {
    button.addEventListener("click", (e) => {
        e.target.closest("dialog").close();
    });
});

/*
** SET DROPDOWN ELEMENTS IF LOGGED IN
*/
let aud = "";
const jwt = localStorage.getItem("refresh");
if (jwt) {
    console.log("Refresh token exists. User is logged in");
    dropdown.insertAdjacentHTML('beforeend',localStorage.getItem("menulist"));
    login_btn.textContent = "Log Out";
    const array = jwt.split(".");
    const parse = JSON.parse(atob(array[1]));
    email.textContent = parse.sub;
    aud = parse.aud;
}

/*
** INJECT IMPORTMAP IF USER WANTS TO PERFORM AUTHENTICATED ACTION
*/
const importmap = async () => {
    console.log("Create importmap");
    const response = await fetch("/javascript/importmap.json");
    const data = await response.json();
    const im = document.createElement('script');
    im.type = 'importmap';
    im.textContent = JSON.stringify(data);
    document.head.appendChild(im);
}

/*
** CLICK HANDLER FOR ALL BUTTONS IN DROPDOWN MENULIST
*/
dropdown.addEventListener("click", async (e) => {
    let module_name = e.target.dataset.endpoint;
    if (!module_name) return;

    if (!document.querySelector("head > [type='importmap']")) {
        await importmap();
    }
    
    module_name = "deploy_" + module_name.substring(0,module_name.indexOf("/"));
    const module = await import(module_name)
    .catch((error) => {
        console.error(error);
        console.error("Failed to load " + module_name);
    });
    module.init(e.target);
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
let website_loaded = Number(sessionStorage.getItem("website_loaded"));
if (!website_loaded) {
    console.log("setting sessionStorage.website_loaded");
    website_loaded = Math.round(Date.now()/1000);
    sessionStorage.setItem("website_loaded",website_loaded);
}

let page_loaded = Date.now(),
    page_visit = 0;

const metrics = [];

const page_weight = () => {
  const total = metrics.reduce((accumulator,currentValue) => {
    return accumulator + currentValue.transferSize;
  },0);
  return total;
}

const page_weight_kb = () => {
    const k = 1024;
    const i = Math.floor(Math.log(page_weight()) / Math.log(k));
    return `${parseFloat((page_weight() / Math.pow(k, i)).toFixed(0))}KB`;
}

const total_requests = () => {
    return metrics.length;
}

/*
** UPDATE METRICS IN DROPDOWN WHEN USER OPENS POPUP
*/
dropdown.addEventListener("toggle", (e) => {
    if (e.newState==="open") {
        dropdown.querySelector(".page-weight").textContent = page_weight_kb();
    }
})
/*
** SEND PAGE VISIT METRICS TO DATABASE SERVER UNLESS LOGGED IN AS "ADMIN" OR "OWNER"
*/
const flushQueues = () => {
    //const aud = getJWTClaim("aud");
    //if (aud === "admin" || aud === "owner") return;

    if (page_loaded === 0) return;

    // const website_loaded = Number(sessionStorage.getItem("website_loaded"));
    /* This would happen if user manually clears sessionStorage for example */
    // if (website_loaded === 0) return; 

    const json = {};
    json["website_id"] = bodydata.websiteid;
    json["article_id"] = bodydata.articleid;
    json["website_loaded"] = website_loaded;
    json["seq"] = page_visit;
    json["webdriver"] = navigator.webdriver;
    json["aud"] = aud;
    if (page_loaded !== 0) {
        json["duration_visible"] =  Math.round((Date.now() - page_loaded)/1000);
        page_loaded = 0;
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

        json["page_weight"] = page_weight();
        json["total_requests"] = total_requests();
        json['pages_visited'] = Array.from(pages_set).toString();

        vitalsQueue.add({name:"page_weight",value:page_weight()});
        vitalsQueue.add({name:"total_requests",value:total_requests()});
    }

    if (vitalsQueue.size > 0) {
        for (const item of vitalsQueue.values()) {
            json[item.name] = item.value;
            json[item.name+"_rating"] = item.rating;
        }
        vitalsQueue.clear();
    }

    const body = JSON.stringify(json);
    page_visit++;

    if (navigator.webdriver) return;

    (navigator.sendBeacon && navigator.sendBeacon(bodydata.resturl+"page-visit", body)) || fetch(visit_url, {body, method: 'POST', keepalive: true});
}


/*
** REPORT GATHERED PAGE STATISTICS WHEN PAGE VISIBILITY CHANGES
*/
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
** INITIALIZE EDITOR IF PAGE PREVIOUSLY EDITED IN THE SESSION
*/
const pages_edited = JSON.parse(sessionStorage.getItem("pages_edited"));
const pages_edited_set = new Set(pages_edited);
if (pages_edited_set.has(Number(document.body.dataset.articleid))) {
    dropdown.querySelector(".edit-content").click();
}


/*
** TRACK RESOURCE TRANSFER SIZE  
*/
let metric_count = 0;
const metrics_popover_anchor = document.querySelector("[popovertarget='metrics']");
const metrics_details = document.querySelector("#metrics tbody");
const observer = new PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
        if (!metrics.some( ({name}) => name===entry.name)) {
            metrics.push({entryType: entry.entryType, name:entry.name, transferSize:entry.transferSize, contentType: entry.contentType});
            let type;
            if (entry.entryType === "navigation") {
                type = "HTML";
            } else if (entry.contentType === "text/css") {
                type = "CSS";
            } else if (entry.contentType === "text/javascript") {
                type = "JAVASCRIPT";
            } else if (entry.contentType === "text/json") {
                type = "JSON";
            } else if (entry.name.split(".").pop() === "woff2") {
                type = "FONT";
            } else if (entry.initiatorType === "img") {
                type = "IMAGE";
            } else {
                type = entry.initiatorType.toUpperCase();
            }
            metric_count++;
            let button = '<button type="button" popovertarget="metric-popover-' + metric_count + '" style="anchor-name: --metric-' + metric_count + '">' + type + '</button>';
            const popover = '<div id="metric-popover-' + metric_count + '" popover class="popover-right" style="font-size:70%;white-space:nowrap;position-anchor: --metric-' + metric_count + '">' + entry.name + '</div>';
            const tr = "<tr><td>" + button + popover + "</td><td>" + entry.startTime.toFixed(0) + "</td><td>" + entry.responseEnd.toFixed(0) + "</td><td>" + (entry.responseEnd - entry.startTime).toFixed(0) + "</td><td>" + entry.transferSize + "</td></tr>";
            metrics_details.insertAdjacentHTML("beforeend",tr);
        }
        metrics_popover_anchor.textContent = page_weight_kb();
        
    })
});
observer.observe({ type: "resource", buffered: true });
observer.observe({ type: "navigation", buffered: true });

/*
** ADD CWV METRIC TO QUEUE WHEN EMITTED
*/
const addToVitalsQueue = ({name,value,rating}) => {
    console.log(name,value);
    vitalsQueue.add({name:name,value:value,rating:rating});
    
    const el = dropdown.querySelector("."+name);  
    const valueRnd = name==="CLS" ? value.toFixed(2) : (value/1000).toFixed(2);
    const units = name==="CLS" ? "" : "s";
    el.textContent = valueRnd + units;
    el.classList.add(rating);
};

/*
** START CORE WEB VITALS COLLECTION
*/
import { onTTFB, onFCP, onLCP, onCLS, onINP } from "/javascript/deploy_web_vitals5.min.js";
onTTFB(addToVitalsQueue);
onFCP(addToVitalsQueue);
onLCP(addToVitalsQueue);
onCLS(addToVitalsQueue);
onINP(addToVitalsQueue);

/*
** GET WEB-vitAls TO EMIT
*/
document.body.click();