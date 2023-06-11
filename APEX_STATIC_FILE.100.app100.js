let gArticleId,
    gBrowser,
    gConnectionType,
    gFullImage,
    perfObj = {images: []};

const cards = document.querySelector(".cards"),
      galleryList = document.querySelector(".gallery-container > ul"),
      galleryFull = document.querySelector(".gallery-container > div");
      galleryFullClose = galleryFull.querySelector("button.close");
      galleryFullPrev = galleryFull.querySelector("button.prev");
      galleryFullNext = galleryFull.querySelector("button.next");
      listPerformance = document.querySelector(".list-performance")
      popup = document.querySelector("dialog.popup"),
      popupClose = popup.querySelector("button.close"),
      popupConfirm = popup.querySelector("button.confirm"),
      preview = document.querySelector("dialog.preview"),
      previewClose = preview.querySelector("button.close")
      perftable = document.querySelector("dialog.perftable"),
      perftableClose = perftable.querySelector("button.close");

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
    console.log("APP_USER",apex.env.APP_USER);

    let browser = bowser.getParser(window.navigator.userAgent),
        browserName = browser.getBrowserName(),
        browserVersion = browser.getBrowserVersion();

    gBrowser = browserName + "," + browserVersion;
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
    
    execProcess( "setClientTZ", {x01: Intl.DateTimeFormat().resolvedOptions().timeZone}).then( () => {
        console.log("Client Time Zone set for APP_PAGE_ID",apex.env.APP_PAGE_ID);
    });

    if ('onpagehide' in self) {
        addEventListener('pagehide', sendBeacon, { capture: true} );
    }

    addEventListener('visibilitychange', () => {
        console.log("visibilitychange")
        if (document.visibilityState === 'hidden') {
            sendBeacon();
        }
    }, { capture: true} );

});

const sendBeacon = () => {
    if (perfObj.images.length) {
        execProcess("uploadPerformance",{p_clob_01: JSON.stringify(perfObj)}).then( () => {
            perfObj.images.length = 0;
        });
    }
}

/*
**  BATCH PERFORMANCE ENTRIES IN ARRAY TO AVOID TOO MANY DATABASE PROCESS CALLS
*/
const perfObserver = (list) => {
    list.getEntries().forEach((entry) => {
        if (gBrowser.startsWith("Safari") && entry.initiatorType === "img") {
            console.log("decodedBodySize",entry.decodedBodySize);
            console.log("transferSize",entry.transferSize);
            console.log("duration",entry.duration);
        }
        /* Process network media transfers. Note that transferSize=300 for the HEAD fetch that retrieves content-type  */
        if (entry.transferSize > 300 && (entry.initiatorType === "img" || entry.initiatorType === "video" || entry.initiatorType === "audio")) {
            const duration = Math.round(entry.duration * 1) / 1;
            const parts = entry.name.split("/");
            let public_id = parts.pop(),
                resource_type = "image";

            if (parts[4] === "video") {
                resource_type = "video";
            }
            // Cloudinary video and audio thumbnail URLs include file type, which we remove in order to allow database upload into target table
            if (resource_type === "video" && entry.initiatorType === "img") {
                public_id = public_id.substring(0,public_id.lastIndexOf("."));
            }

            // Get the media content-type with HEAD fetch. Wish I knew how Developer Tools do it.
            fetch(entry.name,{method:'HEAD', headers: {Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*"}})
                .then(response => {
                    const contentType = response.headers.get('Content-Type');
                    perfObj.images.push(
                        {"cld_cloud_name": parts[3], "resource_type": resource_type, "public_id": public_id, "epoch": Math.round(Date.now()/1000),
                        "url": entry.name, "transfersize": entry.transferSize, "duration": duration, "content_type":contentType,
                        "window_innerwidth": window.innerWidth, "browser":gBrowser, "connection_type": gConnectionType, "servertiming": entry.serverTiming}
                    );
                })
                .catch(error => {
                    console.error('Error fetching image content-type:', error);
                });
        };
        
    });
}

/* 
 ** CALLS AJAX PROCESS RETURNING DATA
 */
const execProcess = (processName, input, options) => {
    return new Promise( resolve => {
        const result = apex.server.process( processName, input, options);
        result.done( function( data ) {
            if (data.success) {
                resolve(data);
            } else {
                popupOpen("FAILURE IN ORACLE SERVER PROCESS", data.sqlerrm);
            }
        });
        result.fail(function( jqXHR ) {
            popupOpen("FAILURE CALLING AJAX PROCESS "+processName, jqXHR.responseText);
        });
    });
}

const popupOpen = (heading, text) => {
    const parser = new DOMParser();
    popup.querySelector("h2").textContent = heading;
    popup.querySelector("p").textContent = parser.parseFromString('<!doctype html><body>' + text,"text/html").body.textContent;
    popupConfirm.style.display = "none";
    popup.showModal();
}

popupClose.addEventListener("click",  () => {
    popup.close();
});


/* 
 ** GET CONTENT FOR PREVIEW DIALOG 
 */
const preview_article = (articleId,button) => {
    execProcess( "getContentHTML", {x01: articleId}, {loadingIndicator:button}).then( (data) => {
        const content = preview.querySelector(".content");
        content.innerHTML = data.content;
        const ele = content.firstElementChild;
        ele.insertAdjacentHTML("afterend", data.details);

        preview.showModal();
    });
}

previewClose.addEventListener("click",  () => {
    preview.close();
});

/*
 ** OPEN GALLERY FOR SELECTED ARTICLE
 */
const show_gallery = (articleId) => {
    execProcess( "getThumbnails", {x01: articleId}).then( (data) => {
        apex.theme.openRegion("gallery");

        galleryList.replaceChildren();
        galleryList.insertAdjacentHTML('afterbegin',data.content);
        gArticleId = articleId;

        const title = document.querySelector("[data-id='" + articleId + "'] .title");
        
        if (title) {
            document.querySelector("#ui-id-" + apex.env.APP_PAGE_ID).textContent = title.textContent;
        } else {
            document.querySelector("#ui-id-" + apex.env.APP_PAGE_ID).textContent = "Gallery";
        }
    });
};

/*
 ** CARD HANDLER FOR READ-ONLY ACTIONS 
 */
const cardHandler = (e) => {
    const card = e.srcElement.closest(".card");
    if (!card) return;

    const articleId = card.dataset.id;

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

const thumbs_minus = document.querySelector("#gallery .thumbs-minus");
const thumbs_plus = document.querySelector("#gallery .thumbs-plus");

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

/*
** CLICK THUMBNAIL TO SHOW FULLSCREEN 
*/
const showFullScreen = (e) => {
    galleryFull.requestFullscreen();
    gFullImage = e.srcElement;
    setImgSrc(e.srcElement);
}

/*
** SET FULLSCREEN IMAGE URL ACCORDING TO DEVICE WIDTH
*/
const setImgSrc = (img) => {
    const fullscreenImg = galleryFull.querySelector("img");
    fullscreenImg.src = img.src;

    const dimensions = img.dataset.dimensions.split(':'),
          widths = dimensions.map(dimension => dimension.substring(dimension,dimension.indexOf("x")));
    
    const closest = widths.reduce((prev, curr) => {
        return Math.abs(curr - window.innerWidth) < Math.abs(prev - window.innerWidth) ? curr : prev;
    });                              

    let url=img.src;
    if (closest === widths[widths.length - 1]) {
        url = url.replace(/,w_\d+/,  "");
    } else {
        url = url.replace(/,w_\d+/,  ",w_" + closest);
    }
    const span = galleryFull.querySelector("span");
    span.textContent ="";
    if (url !== img.src) {
        span.textContent = "Downloading image width " + closest + "px";
        fullscreenImg.src=url;
    }
};

/*
 **  CLOSE FULLSCREEN
 */
galleryFullClose.addEventListener("click",  () => {
    document.exitFullscreen();
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
    setImgSrc(gFullImage);
});

/*
 **  LIST PERFORMANCE METRICS
 */
listPerformance.addEventListener("click",  () => {
    execProcess("uploadPerformance",{p_clob_01: JSON.stringify(perfObj)}).then( () => {
        perfObj.images.length = 0;
        execProcess("getPerformance", {x01:gArticleId}).then((data) => {
            perftable.querySelector(".content").innerHTML = data.content;
            perftable.showModal();
        });
    });
});

perftable.addEventListener("click",  () => {
    perftable.close();
});

window.addEventListener(
  "touchstart",
  function touched() {
    document.body.classList.add("touch");
    window.removeEventListener("touchstart", touched, false);
  },
  false
);