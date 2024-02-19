/*
** SETUP COLLECTION OF METRICS. 
*/
if (!sessionStorage.getItem("website_loaded")) {
    console.log("setting sessionStorage.website_loaded");
    sessionStorage.setItem("website_loaded",Math.round(Date.now()/1000));
}

let page_loaded = Date.now(),
    page_visit = 0;

const vitalsQueue = new Set(),
      mediaQueue = new Set();

const flushQueues = () => {
    /* Prevent error in codepen whch does not allow importing modules */
    /*if (!document.querySelector("[name='website_id']")) return;*/

    if (vitalsQueue.size === 0 && page_loaded === 0) return;

    const website_loaded = Number(sessionStorage.getItem("website_loaded"));
    /* This would happen if user manually clears sessionStorage for example */
    if (website_loaded === 0) return; 

    const json = {};
    json["website_id"] = gMetricWebsiteId;
    json["article_id"] = gMetricArticleId;
    json["website_loaded"] = Number(sessionStorage.getItem("website_loaded"));
    json["seq"] = page_visit;
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

        const agent = bowser.getParser(window.navigator.userAgent),
            browserName = agent.getBrowserName(),
            browserVersion = agent.getBrowserVersion().split(".");
        let browser = browserName + " " + browserVersion[0];
        if (browserVersion[1]!=="0") {
            browser+="."+browserVersion[1];
        }
        json["browser"] = browser;
        if (navigator.userAgentData) {
            json["mobile"] = navigator.userAgentData.mobile;
        }

        json["url"] = window.location.hostname;
        json["referrer"] = document.referrer;
    }

    const body = JSON.stringify(json);
    page_visit++;
    (navigator.sendBeacon && navigator.sendBeacon(gMetricVisitUrl, body)) || fetch(visit_url, {body, method: 'POST', keepalive: true});


    /* Send any media performance metrics */
    if (mediaQueue.size > 0) {    
        const body = JSON.stringify([...mediaQueue]);
        let url = gRestUrl + "media-performance";
        (navigator.sendBeacon && navigator.sendBeacon(url, body)) || fetch(url, {body, method: 'POST', keepalive: true});
        mediaQueue.clear();
    }
}

const addToVitalsQueue = (metric) => {
    console.log(metric.name,metric.value);
    vitalsQueue.add(metric);
};

addEventListener('visibilitychange', () => {
    console.log("visibilityState",document.visibilityState);
    if (document.visibilityState === "hidden") {
        flushQueues();
    } else {
        page_loaded = Date.now();
    }
}, { capture: true} );

if ('onpagehide' in self) {
    addEventListener('pagehide', () => {
        console.log("pagehide");
        flushQueues();
    }, { capture: true} );
}

/*
** IMAGE INTERSECTION OBSERVER
*/
const images = document.querySelectorAll('[data-src]');
const config = {rootMargin: '0px 0px 50px 0px',threshold: 0};

let observer = new IntersectionObserver(function (entries, self) {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      preloadImage(entry.target);
      // Stop watching and load the image
      self.unobserve(entry.target);
    }
  });
}, config);

images.forEach(image => {
  observer.observe(image);
});

const preloadImage = (img) => {
  const src = img.getAttribute('data-src');
  if (!src) {
    return; 
  }
  img.src = src;
};

/*
** DIALOG HANDLING
*/
document.querySelectorAll("a[data-dialog]").forEach((button) => {
    button.addEventListener("click", (e) => {
      e.preventDefault();
      document.querySelector("dialog."+e.target.dataset.dialog).showModal();
    });
});

document.querySelectorAll("dialog button.close").forEach((button) => {
    button.addEventListener("click", (e) => {
      e.target.closest("dialog").close();
    });
    /* Anomaly in CKEditor that removes button text */
    if (!button.textContent) button.textContent = "X";
});

/*
** COPY TEXT CONTENT OF BUTTON TO CLIPBOARD WHEN CLICKED 
*/
const copy_content = document.querySelector("button.copy-content");
if (copy_content) {
    copy_content.addEventListener("click", async () => {
        const text = copy_content.innerText;
        const result = copy_content.querySelector("span");
        try {
            await navigator.clipboard.writeText(text);
            result.textContent = "Copied";
            result.style.opacity = "1";
        } catch (error) {
            result.textContent = error.message;
        }
    });
}

/*
** CONTACT FORM SUBMISSION
*/
const form = document.querySelector("div.contact > form");
if (form) {
    form.addEventListener("submit", (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const submit = form.querySelector("button");
        const aws_gateway_url = submit.dataset.url;
        fetch(aws_gateway_url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            redirect: "follow",
            referrerPolicy: "no-referrer",
            body: JSON.stringify({
                name: formData.get("name"),
                email: formData.get("email"),
                message: formData.get("message"),
                contactEmail: formData.get("contactEmail"),
                signatureContactEmail: formData.get("signatureContactEmail")
            }),
        }).then((response) => {
            if (response.status) {
                console.log("submitted form");
                const formBtn = form.querySelector("button");
                formBtn.disabled = true;
                formBtn.style.cursor = "none";
                const front = formBtn.querySelector(".front");
                front.textContent = "Sent";
                front.style.background = "green";
                formBtn.querySelector(".edge").remove();
                formBtn.querySelector(".shadow").remove();
                form.querySelector(".result").style.opacity = "1";
                return;
            }
            throw new Error("Could not submit request");
        }).catch( (error) => {
            console.error(error);
            form.querySelector(".result").style.opacity = "1";
            form.querySelector(".result").textContent(error);
        });
    });
}