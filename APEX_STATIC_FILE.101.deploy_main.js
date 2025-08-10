const bodydata = document.body.dataset;
const dropdown = document.querySelector("#menulist");
const login_btn = dropdown.querySelector(".login-btn");
const email = dropdown.querySelector(".email");

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

let myTTFB = 0;
let myFCP = 0;
let myLCP = 0; 
let myCLS = 0;
let myINP = 0;

let myLCPattr = "";
let myCLSattr = "";
let myINPattr = "";

const page_weight = () => {
  const total = metrics.reduce((accumulator,currentValue) => {
    return accumulator + currentValue.transferSize;
  },0);
  return total;
}

const total_requests = () => {
    return metrics.length;
}

/* UPDATE UI TABLE FOR MMETRICS */
const setCWV = (cwv, value, good, improve, json) => {
    console.log(cwv,value);

    if (json===undefined) {
        const el = dropdown.querySelector("." + cwv);
        if (cwv==="CLS") {
            el.textContent = value.toFixed(2);
        } else {
            el.textContent = (value/1000).toFixed(2) + "s";
        }
        
        if (value<=good) {
            el.classList.add("good");
        } else if (value<=improve) {
            el.classList.add("needs-improvement");
        } else {
            el.classList.add("poor");
        }
        return;
    }

    json[cwv] = value;
    if (value<=good) {
        json[cwv + "_rating"] = "good";
    } else if (value<=improve) {
        json[cwv + "_rating"] = "needs-improvement";
    } else {
        json[cwv + "_rating"] = "poor";
    }
    
}

dropdown.addEventListener("toggle", (e) => {
    if (e.newState==="open") {
        const k = 1024;
        const i = Math.floor(Math.log(page_weight()) / Math.log(k));
        dropdown.querySelector(".page-weight").textContent =`${parseFloat((page_weight() / Math.pow(k, i)).toFixed(0))}KB`;

        setCWV("TTFB", myTTFB, 800, 1800);
        setCWV("FCP", myFCP, 900, 3000);
        if (myLCP>0) {
            setCWV("LCP", myLCP, 2500, 4000);
            setCWV("CLS", myCLS, .1, .25);
            setCWV("INP", myINP, 200, 500);
        }

        console.log("myLCPattr",myLCPattr);
        console.log("myINPattr",myINPattr);
        if (myCLS>0) debugCLS();
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
    }

    setCWV("TTFB", myTTFB, 800, 1800, json);
    setCWV("FCP", myFCP, 900, 3000, json);
    setCWV("LCP", myLCP, 2500, 4000, json);
    setCWV("CLS", myCLS, .1, .25, json);
    setCWV("INP", myINP, 200, 500, json);

    const body = JSON.stringify(json);
    page_visit++;

    if (navigator.webdriver) return;

    (navigator.sendBeacon && navigator.sendBeacon(bodydata.resturl+"page-visit", body)) || fetch(visit_url, {body, method: 'POST', keepalive: true});
}



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
** PERFORMANCE OBSERVERS
*/

/* TRANSFER SIZE AND TTFB */
const observer = new PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
        if (!metrics.some( ({name}) => name===entry.name)) {
            metrics.push({entryType: entry.entryType, name:entry.name, transferSize:entry.transferSize, contentType: entry.contentType});
            if (entry.entryType==="navigation") {
                myTTFB = entry.responseStart;
            }
        }
    })
});
observer.observe({ type: "resource", buffered: true });
observer.observe({ type: "navigation", buffered: true });

/* FCP */
new PerformanceObserver((list) => {
    const fcp = list.getEntries().find(({name}) => name==="first-contentful-paint");
    myFCP = fcp.startTime;
}).observe({ type: "paint", buffered: true });

/* LCP */
new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const lastEntry = entries[entries.length - 1];
    myLCP = lastEntry.startTime;
    myLCPattr = lastEntry.url; // lastEntry.id  FIX THIS
}).observe({ type: "largest-contentful-paint", buffered: true });

/* CLS */
// const pageCLS = [];
const CLSobserver = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    entries.forEach((entry) => {
        if (!entry.hadRecentInput) {
            myCLS+=entry.value;
            // pageCLS.push(entry);
        };
    });
});
CLSobserver.observe({ type: "layout-shift", buffered: true });

const debugCLS = () => {
    const largestCLS = CLSobserver.takeRecords().reduce((a, b) => {
        return a && a.value > b.value ? a : b;
    },0);

    if (largestCLS && largestCLS.sources && largestCLS.sources.length) {
        const largestSource = largestCLS.sources.reduce((a, b) => {
            return a.node && a.previousRect.width * a.previousRect.height >
                b.previousRect.width * b.previousRect.height ? a : b;
        });
        if (largestSource) {
            myCLSattr = largestSource.node;
        }
    }
}

/* INP */
new PerformanceObserver((list) => {
    const entries = list.getEntries();
    entries.forEach((entry) => {
        if (entry.duration > myINP) {
            myINP = entry.duration;
            myINPattr = entry.target;
        }
    });
}).observe({ type: "event", buffered: true });