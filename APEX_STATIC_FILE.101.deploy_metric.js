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

    const data = document.body.dataset;
    const json = {};
    json["website_id"] = data.websiteid;
    json["article_id"] = data.articleid;
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
        if (navigator.userAgentData) {
            json["mobile"] = navigator.userAgentData.mobile;
        }
        json["url"] = window.location.hostname;
        json["referrer"] = document.referrer;
    }

    const body = JSON.stringify(json);
    page_visit++;
    (navigator.sendBeacon && navigator.sendBeacon(data.resturl+"page-visit", body)) || fetch(visit_url, {body, method: 'POST', keepalive: true});


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
** IMPORT OUR PRIVATELY HOSTED CWV MODULE
*/
import {onLCP, onINP, onCLS} from '/web-vitals.js';
onCLS(addToVitalsQueue);
onLCP(addToVitalsQueue);
onINP(addToVitalsQueue);
