let gArticleId,
    gBrowser,
    gConnectionType,
    gFullImage,
    gRestUrl,
    gHomeUrl
    gExpiredSession = false;

const apex_app_id = document.querySelector("#pFlowId").value,
      apex_page_id = document.querySelector("#pFlowStepId").value,
      apex_session = document.querySelector("#pInstance").value,
      vitalsQueue = new Set(),
      mediaQueue = new Set(),
      cards = document.querySelector(".cards"),
      popup = document.querySelector("dialog.popup"),
      popupClose = popup.querySelector("button.close"),
      popupConfirm = popup.querySelector("button.confirm"),
      preview = document.querySelector("dialog.preview"),
      gallery = document.querySelector("dialog.gallery"),
      galleryInstruction = gallery.querySelector(".instruction"),
      galleryList = gallery.querySelector("ul"),
      galleryFull = gallery.querySelector(".gallery-overlay"),
      galleryFullImg = galleryFull.querySelector("img");
      galleryFullCounter = galleryFull.querySelector("span.counter"),
      galleryFullClose = galleryFull.querySelector("button.close-fullscreen"),
      galleryFullPrev = galleryFull.querySelector("button.prev"),
      galleryFullNext = galleryFull.querySelector("button.next"),
      galleryFullCloseFieldset = galleryFull.querySelector("button.close-fieldset"),
      galleryFullLegend = galleryFull.querySelector("legend > span"),
      galleryFullDimensions = galleryFull.querySelectorAll("fieldset button.dimensions"),
      listPerformance = gallery.querySelector(".list-performance"),      
      perftable = document.querySelector("dialog.perftable"),
      privacy = document.querySelector(".privacy");

/*
**  CLOSE ALL DIALOGS
*/
document.querySelectorAll("button.close").forEach((button) => {
    button.addEventListener("click", (e) => {
        e.stopPropagation();
        if (e.target.dataset.sqlcode) {
            if (Number(e.target.dataset.sqlcode) === -20000) {
                window.location.href = gHomeUrl;
            }
        }
        e.target.closest("dialog").close();
    });
});

const addToVitalsQueue = (metric) => {
    console.log(metric.name,metric.value);
    vitalsQueue.add(metric);
}

const flushQueues = () => {
    if (vitalsQueue.size > 0) {    
        const body =JSON.stringify( {session_id:apex_session, page_id: apex_page_id, cwv: [...vitalsQueue] });
        let url = gRestUrl + "web-vitals";
        (navigator.sendBeacon && navigator.sendBeacon(url, body)) || fetch(url, {body, method: 'POST', keepalive: true});
        vitalsQueue.clear();
    }
    if (mediaQueue.size > 0) {    
        const body = JSON.stringify([...mediaQueue]);
        let url = gRestUrl + "media-performance";
        (navigator.sendBeacon && navigator.sendBeacon(url, body)) || fetch(url, {body, method: 'POST', keepalive: true});
        mediaQueue.clear();
    }
}

const checkPerformance = () => {
    if (performance === undefined) {
        console.log("Performance API NOT supported");
        return false;
    }
    const entries = performance.getEntriesByType("resource");
    if (entries === undefined) {
        console.log("Performance.getEntriesByType NOT supported");
        return false;
    }
    let ok = false;
    entries.forEach((entry) => {
        if ("transferSize" in entry) {
            ok = true;
        }
    });
    if (ok) {
        console.log("Performance API supported for this application");
    } else {
        console.log("Performance API NOT supported for this application");
    }
    return ok;
}

window.addEventListener("DOMContentLoaded", (event) => {
    console.log("DOM fully loaded and parsed");
    
    console.log("apex_app_id",apex_app_id);
    console.log("apex_page_id",apex_page_id);
    console.log("apex_session",apex_session);

    const browser = bowser.getParser(window.navigator.userAgent),
          browserName = browser.getBrowserName(),
          browserVersion = browser.getBrowserVersion().split(".");

    gBrowser = browserName + " " + browserVersion[0];
    if (browserVersion[1]!=="0") {
        gBrowser+="."+browserVersion[1];
    }
    console.log("gBrowser",gBrowser);

    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (connection) {
        gConnectionType = connection.downlink + " Mb/s" + " -" + connection.effectiveType;
        console.log("gConnectionType",gConnectionType);
    }
    
    if (navigator.maxTouchPoints > 1) {
        cards.addEventListener("touchstart",cardHandler);
        galleryList.addEventListener("touchstart",showFullScreen);
    } else {
        cards.addEventListener("click",cardHandler);
        galleryList.addEventListener("click",showFullScreen);
    }

    if (checkPerformance()) {
        const observer = new PerformanceObserver(perfObserver);
        observer.observe({ type: "resource", buffered: true });
    }

    execProcess( "client-info", "POST", {"timezone": Intl.DateTimeFormat().resolvedOptions().timeZone, "maxtouchpoints": navigator.maxTouchPoints}).then( () => {
        console.log("Client Time Zone set for page",apex_page_id);
    });
    
    addEventListener('visibilitychange', () => {
        if (document.visibilityState === "hidden") {
            flushQueues();
        }
    }, { capture: true} );
    
    if ('onpagehide' in self) {
        addEventListener('pagehide', () => {
            flushQueues();
        }, { capture: true} );
    }
});

/*
**  BATCH PERFORMANCE ENTRIES IN ARRAY TO AVOID TOO MANY DATABASE PROCESS CALLS
*/
const perfObserver = (list) => {
    list.getEntries().forEach((entry) => {
        /* 
        ** Process network media transfers - ignore cache
        ** Safari does not publish transferSize so we handle that in the HEAD fetch
        ** Transfers <=300 are treated as cache transfers
        ** HEAD fetch retrieves content-type for all browsers as this is reported inaccurately for Cloudinary asset downloads
        */ 
 
        if (["img","video","audio"].indexOf(entry.initiatorType)===-1) return;

        if (entry.transferSize > 0 || gBrowser.startsWith("Safari")) {
            const duration = Math.round(entry.duration * 1) / 1;
            
            const parts = entry.name.split("/");
            let public_id = parts.pop();
            const resource_type = parts[4] === "video" ? 'video' : "image";

            const filetype = public_id.substring(public_id.lastIndexOf(".")+1);
            if (['png','jpg','webm','mp4','aac','ogg','mp3','wav'].indexOf(filetype)>=0) {
                public_id = public_id.substring(0,public_id.lastIndexOf("."));
            }

            // Get the media content-type with HEAD fetch. Wish I knew how Developer Tools do it.
            fetch(entry.name,{method:'HEAD', headers: {Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,video/webm,video/mp4,audio/aac,audio/ogg,audio/mp3,audio/wav",}})
                .then(response => {
                    const contentType = response.headers.get('Content-Type');
                    let transferSize = entry.transferSize;
                    if (gBrowser.startsWith("Safari")) {
                        transferSize = response.headers.get('Content-Length');
                    }
                    //gPerfObj.images.push(
                    mediaQueue.add(
                        {"session_id": apex_session, "cld_cloud_name": parts[3], "resource_type": resource_type, "public_id": public_id, "epoch": Math.round(Date.now()/1000),
                        "url": entry.name, "transfersize": transferSize, "duration": duration, "content_type":contentType,
                        "window_innerwidth": window.innerWidth, "browser":gBrowser, "connection_type": gConnectionType, "servertiming": entry.serverTiming}
                    );
                })
                .catch(error => {
                    console.error('Error fetching media content-type:', error);
                    popupOpen('Error fetching media content-type:', error);
                });
        };
        
    });
}

/* 
 ** CALLS AJAX PROCESS RETURNING DATA
 */
const execProcess = (template, method, input) => {
    return new Promise( async (resolve,reject) => {
        try {
            const url = gRestUrl + template,
                  session = apex_app_id + "," + apex_session + "," + apex_page_id;

            let response;
            
            if (method==="GET" || method==="DELETE") {
                response = await fetch(url, {method: method, headers: {"Apex-Session": session}});
            } else {
                response = await fetch(url, {method: method, headers: {"Apex-Session": session}, body: JSON.stringify(input)});
            }

            const data = await response.json();
            if (data.success) {
                resolve(data);
            } else {
                reject(data.sqlerrm);
                let heading, message;
                switch (data.sqlcode) {
                    case -20000: 
                        gExpiredSession = true;
                        popupClose.dataset.sqlcode = data.sqlcode;
                        heading = data.sqlerrm;
                        message = "ALL YOUR DATA IS SAVED. CLOSE THIS WINDOW TO LOGIN AGAIN."
                        break;
                    default:
                        heading = "FAILURE IN " + method + " HANDLER FOR " + template;
                        message = data.sqlerrm;
                }
                popupOpen(heading, message);
            }
        } catch (e) {
            console.error("execProcess",e);
        }
    });
}

const popupOpen = (heading, text) => {
    const parser = new DOMParser();
    popup.querySelector("h2").textContent = heading;
    popup.querySelector("p").textContent = parser.parseFromString('<!doctype html><body>' + text,"text/html").body.textContent;
    popupConfirm.style.display = "none";
    popup.showModal();
}

/* 
 ** GET CONTENT FOR PREVIEW DIALOG 
 */
const preview_article = (articleId,button) => {
    execProcess( "article/"+articleId,"GET").then( (data) => {
        const content = preview.querySelector(".content");
        content.innerHTML = data.content;
        const ele = content.firstElementChild;
        ele.insertAdjacentHTML("afterend", data.details);

        preview.showModal();
    });
}

/*
 ** OPEN GALLERY FOR SELECTED ARTICLE
 */
const show_gallery = (articleId) => {
    execProcess( "gallery/"+articleId,"GET").then( (data) => {
        gallery.showModal();
        galleryInstruction.replaceChildren();
        galleryInstruction.insertAdjacentHTML('afterbegin',data.instruction);
        galleryList.replaceChildren();
        galleryList.insertAdjacentHTML('afterbegin',data.content);
        gArticleId = articleId;
    });
};

/*
 ** MISERABLE PRIVACY POLICY
 */
if (privacy) {
    privacy.addEventListener("click", (e) => {
        const articleId = e.target.dataset.id,
            card = document.querySelector('[data-id="'+articleId+'"] h4');
        card.click();
    });
}

/*
 ** HANDLE OPENING / CLOSING DROPDOWN MENUS
 */
window.onclick = (e) => {
    let open = e.target.matches(".show-dropdown") && e.target.nextElementSibling.classList.contains("visible");

    document.querySelectorAll(".dropdown-items.visible").forEach((dropdown) => {
        dropdown.classList.toggle("visible",false);
    });
    
    if (!open && e.target.matches(".show-dropdown")) {
        e.target.nextElementSibling.classList.toggle("visible");
    }
}

/*
 ** CARD HANDLER FOR READ-ONLY ACTIONS 
 */
const cardHandler = (e) => {
    const card = e.srcElement.closest(".card");

    if (!card) return;

    const articleId = card.dataset.id;
    console.log("e.target",e.target);
    if (e.target.matches(".show-gallery")) {
        show_gallery(articleId);                     
    } else if (e.target.matches(".preview")) {
        preview_article(articleId, e.srcElement);                  
    }
}

/* ************************************************* 
 **
 **                 GALLERY CODE
 **
 * ************************************************/

/*
 *  Constant variables based on initial property settings
 */
const galleryWidth = Number(getComputedStyle(document.documentElement).getPropertyValue("--gallery-width").match(/(\d+)/)[1]);
const min_gallery_width = galleryWidth * .5,
      max_gallery_width = galleryWidth * 1.5;

const thumbs_minus = gallery.querySelector(".thumbs-minus");
const thumbs_plus = gallery.querySelector(".thumbs-plus");

thumbs_minus.addEventListener("click", () => {
    setGalleryWidth("down",thumbs_minus,thumbs_plus);
});
thumbs_plus.addEventListener("click", () => {
    setGalleryWidth("up",thumbs_minus,thumbs_plus);
});

/*
 **  Allow user to set Gallery thumbnail width up and down between 5rem and 15rem
 */
const setGalleryWidth = (sizing,thumbs_minus,thumbs_plus) => {
    const galleryWidth = getComputedStyle(document.documentElement).getPropertyValue(
        "--gallery-width"
    );
    let width = Number(galleryWidth.match(/(\d+)/)[1]);
    if (sizing === "up") {
        width++;
    } else {
        width--;
    }
    document.documentElement.style.setProperty("--gallery-width", width + "rem");
    thumbs_minus.disabled = width === min_gallery_width ? true : false;
    thumbs_plus.disabled = width === max_gallery_width ? true : false;
};

enableKeydown = (event) => {
    const keyName = event.key;
    if (keyName === "Escape") {
        galleryFullClose.click();
    } else if (keyName === "ArrowLeft") {
        galleryFullPrev.click();
    } else if (keyName === "ArrowRight") {
        galleryFullNext.click();
    }
}

/*
** CLICK THUMBNAIL SHOWS IMAGE IN FULLSCREEN
*/
const showFullScreen = (e) => {
    if (e.target.tagName !== "IMG") return;
    galleryFull.requestFullscreen().then(() => {
        gFullImage = e.target;
        setImgSrc(e.target);
        galleryFull.style.display = "grid";
        window.addEventListener("keydown", enableKeydown);
    })
}

/*
** GET COUNT OF CURRENT IMAGE IN GALLERY
*/
const counter = () => {
    let li = gFullImage.parentElement;
    let pos = 0;
    while (null != li) {
        li = li.previousElementSibling;
        pos++;
    }
    if (galleryList.childElementCount === 1) {
        galleryFullNext.style.display = "none";
        galleryFullPrev.style.display = "none";
    } else {
        galleryFullNext.style.display = "block";
        galleryFullPrev.style.display = "block";
    }
    return pos + "/" + galleryList.childElementCount;
};

/*
** SET FULLSCREEN IMAGE URL ACCORDING TO DEVICE WIDTH
*/
const setImgSrc = (img) => {
    galleryFullCounter.textContent = counter();
    galleryFullImg.style.width = "";
    galleryFullImg.src = img.src;

    const dimensions = img.dataset.dimensions.split(':'),
          widths = dimensions.map(dimension => dimension.substring(dimension,dimension.indexOf("x")));

    const closest = widths.reduce((prev, curr) => {
        return Math.abs(curr - window.innerWidth) < Math.abs(prev - window.innerWidth) ? curr : prev;
    });

    const urls = widths.map((width, index) => {
        return index === widths.length - 1 ? img.src.replace(/,w_\d+/,  "") : img.src.replace(/,w_\d+/,  ",w_" + width);
    });

    let url=img.src;
    if (closest === widths[widths.length - 1]) {
        url = url.replace(/,w_\d+/,  "");
    } else {
        url = url.replace(/,w_\d+/,  ",w_" + closest);
    }

    galleryFullLegend.textContent = "Closest resolution downloaded for window " + window.innerWidth + " x " + window.innerHeight;
    galleryFull.querySelectorAll("button.dimensions").forEach((button,index) => {
        button.textContent = dimensions[index];
        button.dataset.url = urls[index];
        if (widths[index] === closest) {
            button.style.backgroundColor = "var(--color-button)";
        } else {
            button.style.backgroundColor = "var(--color-pale)";
        }
    });

    galleryFull.querySelectorAll("button.copy-url").forEach((button,index) => {
        if (widths[index] === closest) {
            button.disabled = false;
            //button.style.backgroundColor = "var(--color-button)";
        } else {
            button.disabled = true;
            //button.style.backgroundColor = "var(--color-pale)";
        }
    });    

    if (url !== img.src) {
        galleryFullImg.src=url;
    }
};

galleryFull.addEventListener("fullscreenchange", (e) => {
    if (!document.fullscreenElement) {
        window.removeEventListener("keydown", enableKeydown);
        galleryFull.style.display = "none";
    }
});

/*
 **  CLOSE FULLSCREEN FIELDSET
 */
galleryFullCloseFieldset.addEventListener("click",  () => {
    galleryFull.querySelector("fieldset").style.display = "none";
});

/*
 **  CLOSE FULLSCREEN
 */
galleryFullClose.addEventListener("click",  () => {
    document.exitFullscreen();
    galleryFull.style.display = "none";
});

/*
 **  NEXT IMAGE
 */
galleryFullNext.addEventListener("click",  () => {
    if (gFullImage.parentElement.nextElementSibling) {
        gFullImage = gFullImage.parentElement.nextElementSibling.firstElementChild;
    } else {
        gFullImage = gFullImage.parentElement.parentElement.firstElementChild.firstElementChild;
    }
    if (gFullImage.tagName !== "IMG") {
        gFullImage = gFullImage.nextElementSibling;
    }
    setImgSrc(gFullImage);
});

/*
 **  PREVIOUS IMAGE
 */
galleryFullPrev.addEventListener("click",  () => {
    if (gFullImage.parentElement.previousElementSibling) {
        gFullImage = gFullImage.parentElement.previousElementSibling.firstElementChild;
    } else {
        gFullImage = gFullImage.parentElement.parentElement.lastElementChild.firstElementChild;
    }
    if (gFullImage.tagName !== "IMG") {
        gFullImage = gFullImage.nextElementSibling;
    }    
    setImgSrc(gFullImage);
});

/*
 **  COPY URL
 */
galleryFull.querySelectorAll("button.copy-url").forEach((button) => {
    button.addEventListener("click", async () => {
        try {
            await navigator.clipboard.writeText(galleryFullImg.src);
            popupOpen("Copied URL to clipboard",galleryFullImg.src);
        } catch (err) {
            popupOpen('Failed to copy URL!', err)
        }
    });
});

/*
**  CLICK DIMENSION BUTTONS
*/
galleryFull.querySelectorAll("button.dimensions").forEach((button) => {
    button.addEventListener("click", (e) => {
        const img = button.parentElement.previousElementSibling;
        const dimensions = button.textContent.split("x");
        img.style.width = dimensions[0]+"px";
        img.src=button.dataset.url;
        galleryFullLegend.textContent = "Image resolution downloaded for container " + window.innerWidth + " x " + window.innerHeight;
        e.target.style.backgroundColor = "var(--color-button)";
        let curr = e.target;
        let el = curr.nextElementSibling;
        el.disabled = false;
        el = el.nextElementSibling;
        
        while (el) {
            if (el.tagName === "BUTTON") {
                if (el.classList.contains("dimensions")) {
                    el.style.backgroundColor = "var(--color-pale)";
                } else {
                    el.disabled = true;
                }
            }
            el = el.nextElementSibling;
        }

        el = curr.previousElementSibling;
        while (el) {
            if (el.tagName === "BUTTON") {
                if (el.classList.contains("dimensions")) {
                    el.style.backgroundColor = "var(--color-pale)";
                } else {
                    el.disabled = true;
                }
            }
            el = el.previousElementSibling;
        }
    });
});

/*
 **  LIST PERFORMANCE METRICS
 */
listPerformance.addEventListener("click",  () => {
    execProcess("uploadPerformance",{p_clob_01: JSON.stringify(gPerfObj)}).then( () => {
        gPerfObj.images.length = 0;
        execProcess("getPerformance", {x01:gArticleId}).then((data) => {
            perftable.querySelector(".content").innerHTML = data.content;
            perftable.showModal();
        });
    });
});