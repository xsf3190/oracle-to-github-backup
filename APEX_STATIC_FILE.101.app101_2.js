let gArticleId,
    gBrowser,
    gConnectionType,
    gFullImage,
    gIntervalId,
    gExpiredSession = false;

const apex_app_id = document.querySelector("#pFlowId").value,
      apex_page_id = document.querySelector("#pFlowStepId").value,
      apex_session = document.querySelector("#pInstance").value,
      vitalsQueue = new Set(),
      mediaQueue = new Set(),
      container = document.querySelector(".container"),
      newWebsite = document.querySelector(".new-website"),
      editWebsite = document.querySelector(".edit-website"),
      website = document.querySelector("form"),
      deployWebsite = website.querySelector(".deploy-website"),
      addWebsite = website.querySelector(".add-website"),
      listBtn = document.querySelector(".list-view"),
      articleList = document.querySelector(".article-list"),
      cards = document.querySelector(".cards"),
      popup = document.querySelector("dialog.popup"),
      popupClose = popup.querySelector("button.close"),
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
      perftable = document.querySelector("dialog.perftable");

/*
**  TEXT INPUT COMPONENT
*/
const inputHandler = (e) => {
    if (e.target.tagName !== "TEXTAREA") return;

    const maxchars = e.target.getAttribute("maxlength");
    const counter = e.target.nextElementSibling.querySelector(".charcounter");
    let numOfEnteredChars = e.target.value.length;
    counter.textContent = numOfEnteredChars + "/" + maxchars;
    if (numOfEnteredChars === Number(maxchars)) {
        counter.style.color = "red";
    } else {
        counter.style.color = "initial";
    }
}

const focusHandler = (e) => {
    let result;
    if (e.target.tagName == "TEXTAREA") {
        result = e.target.nextElementSibling.querySelector(".result");
    } else if (e.target.tagName == "INPUT" && e.target.type == "radio") {
        result = e.target.closest("fieldset").nextElementSibling.querySelector(".result");
    } else {
        return;
    }
    result.textContent = "";
    result.style.opacity = "0";
}

const changeHandler = (e) => {
    let result;
    if (e.target.tagName == "TEXTAREA") {
        result = e.target.nextElementSibling.querySelector(".result");
    } else if (e.target.tagName == "INPUT" && e.target.type == "radio") {
        result = e.target.closest("fieldset").nextElementSibling.querySelector(".result");
    } else {
        return;
    }

    const table_column = e.target.dataset.column,
          id = e.target.dataset.id,
          value = e.target.value;

    execProcess("update","PUT",{id:id,table_column:table_column,value:value}).then( (data) => {
        result.textContent = data.message;
        result.style.color = data.color;
        result.style.opacity = "1";

        if (deployWebsite) {
            if (data.color==="red") {
                deployWebsite.disabled = true;
                deployWebsite.style.opacity = "0.2";
            } else {
                deployWebsite.disabled = false;
                deployWebsite.style.opacity = "1";           
            }
        }

        if (addWebsite) {
            if (data.color==="red") {
                addWebsite.disabled = true;
                addWebsite.style.opacity = "0.2";
            } else if (document.querySelector("#domain_name").value) {
                addWebsite.disabled = false;
                addWebsite.style.opacity = "1";           
            }
        }        
    });
}

/*
 **  LIST VIEW
 */
listBtn.addEventListener("click",  () => {
    if (cards.style.display === "grid") {
        cards.style.display = "none";
        articleList.style.display = "grid";
        const websiteId = website.dataset.id;
        execProcess( "website-list/"+websiteId,"GET").then( (data) => {
            articleList.replaceChildren();
            articleList.insertAdjacentHTML('afterbegin',data.content);
        });
    } else {
        cards.style.display = "grid";
        articleList.style.display = "none";
    }
});

/*
**  CLOSE ALL DIALOGS
*/
document.querySelectorAll("button.close").forEach((button) => {
    button.addEventListener("click", (e) => {
        if (gIntervalId) {
            clearInterval(gIntervalId);
        }
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
        container.addEventListener("touchstart",cardHandler);
    } else {
        container.addEventListener("click",cardHandler);
    }
    container.addEventListener("input",inputHandler);
    container.addEventListener("focusin",focusHandler);
    container.addEventListener("change",changeHandler);
    

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
            
            if (method==="GET") {
                response = await fetch(url, {method: method, headers: {"Apex-Session": session}});
            } else {
                response = await fetch(url, {method: method, headers: {"Apex-Session": session}, body: JSON.stringify(input)});
            }

            if (!response.ok) {
                throw new Error("Network response was not OK");
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
                        const colon = heading.indexOf(":")+1;
                        heading = heading.substring(colon).trimStart();
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
 ** COMMON DROPDOWN CLICK HANDLER
 */
document.addEventListener("click", (e) => {
    let open = e.target.matches(".show-dropdown") && e.target.nextElementSibling.classList.contains("visible");

    document.querySelectorAll(".dropdown-items.visible").forEach((dropdown) => {
        dropdown.classList.toggle("visible",false);
        dropdown.querySelectorAll(".delete-confirm").forEach((btn) => {
            btn.remove();
        });
    });
    
    if (!open && e.target.matches(".show-dropdown")) {
        e.target.nextElementSibling.classList.toggle("visible");
    }
})

/*
 ** CARD CLICK HANDLER
 */
const cardHandler = (e) => {

    const card = e.srcElement.closest(".card");

    if (!card) return;

    const id = card.dataset.id;

    if (e.target.matches(".new-before")) {
        add_content(e.target, "beforebegin");
    } else if (e.target.matches(".new-after")) {
        add_content(e.target, "afterend");
    } else if (e.target.matches(".show-gallery")) {
        show_gallery(id);                                
    } else if (e.target.matches(".delete")) {
        delete_table(id, e);
    } else if (e.target.matches(".upload-media")) {
        upload_media(id);
    } else if (e.target.matches(".edit-text")) {
        edit_text(id,e.srcElement);          
    } else if (e.target.matches(".publish")) {
        publish_article(id, e.srcElement);  
    } else if (e.target.matches(".unpublish")) {
        unpublish_article(id, e.srcElement);                                 
    //} else if (e.target.matches(".delete-asset")) {
    //    delete_asset(id, e.target);                                 
    } else if (e.target.matches(".fullscreen")) {
        showFullScreen(e);                                 
    }
}

/* ************************************************* 
 **
 **                 GALLERY CODE
 **
 * ************************************************/

const enableKeydown = (event) => {
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
    //if (e.target.tagName !== "IMG") return;
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
 ** GENERATE SIGNATURE FOR CLOUDINARY SUSCRIBER TO ENABLE SECURE MEDIA UPLOAD
 */
const getCldSignature = async (callback, params_to_sign) => {
    execProcess("cld-signature","POST",params_to_sign).then( (data) => {
        callback(data.signature);
    });
};

/* 
 ** CREATE CLOUDINARY UPLOAD WIDGET -  OPENED FOR EACH UPLOAD
 */
const widget=cloudinary.createUploadWidget(
    { 
        uploadSignature: getCldSignature,
        clientAllowedFormats: ['image','video','audio'],
        sources: [
            "local",
            "url",
            "camera",
            "image_search",
            "google_drive",
            "facebook",
            "dropbox",
            "instagram",
            "unsplash",
            "shutterstock"
        ],
        defaultSource: "local",
        googleApiKey: "AIzaSyCUob7BOkIEqwI6ZeBgaTUd8mb_-r5kW0Y",
        dropboxAppKey: "7i2pqj2wc3p47by",
        use_filename: true,
        preBatch: (cb, data) => {
            const maxLength = 248;
            let errors=0;
            for (i=0; i<data.files.length; i++) {
                if (data.files[i].name.length>maxLength) {
                    errors++;
                }
            }
            if (errors>0) {
                alert("Files names selected for upload must be no greater than " + maxLength + " characters in length");
                cb({cancel: true}); 
            } else { 
                cb({}); 
            }
        }
    },
    (error, result) => {
        if (error) {
            popupOpen("FAILURE IN CLOUDINARY UPLOAD", error.message);
        }
        if (result.info.files && result.event === "queues-end") { 
            let metadata = {
                images: []
            }
            result.info.files.forEach((item) => {
                if (item.uploadInfo) {
                    metadata.images.push({
                        "public_id": item.uploadInfo.public_id,
                        "bytes": item.uploadInfo.bytes,
                        "resource_type": item.uploadInfo.resource_type,
                        "width": item.uploadInfo.width,
                        "height": item.uploadInfo.height,
                        "format": item.uploadInfo.format,
                        "cld_cloud_name": item.uploadInfo.url.split("/")[3],
                        "article_id": item.uploadInfo.tags[0],
                        "website_id": website.dataset.id
                    });
                }
            });
            execProcess("cld-upload","POST",metadata).then( (data) => {
                let li = document.querySelector("[data-id='" + data.articleId + "']");
                if (!li) {
                    li = enable_card_zero(data.articleId);
                }
                let nomedia = li.querySelector("button.no-media.upload-media");
                if (nomedia) {
                    const img = document.createElement("img");
                    img.src = data.imgurl;
                    nomedia.replaceWith(img);
                }
                li.querySelector(".show-gallery").disabled = false;
                li.querySelector(".updated-date").textContent = data.updated;
            }).then ( () => {
                const list = cards.querySelectorAll(".card:not([data-id='-1'])");
                execProcess("website-list/" + website.dataset.id, "PUT", {dbid_string: Array.from(list, (id) => id.dataset.id).join(":")} ).then( () => {
                    console.log("Website articles reordered");
                });
            });
        };
    }
);

/* 
 ** ENABLE DRAG AND DROP OF GALLERY IMAGES TO RE-ORDER
 */
new Sortable(galleryList, {
    animation: 150,
    ghostClass: 'drag-in-progress',
    store: {
        set: async function (sortable) {
            execProcess("thumbnails","PUT", {dbid_string: sortable.toArray().join(":")} ).then( (data) => {
                if (data.url) {
                    const li = document.querySelector("[data-id='" + data.articleId + "']");
                    li.querySelector("img").src = data.url;
                    li.querySelector(".updated-date").textContent = data.updated;
                }
                galleryList.replaceChildren();
                galleryList.insertAdjacentHTML('afterbegin',data.content);
            });
        }
    }
});

/* 
 ** ENABLE DRAG AND DROP OF WEBSITE ARTICLES TO RE-ORDER
 */

new Sortable(articleList, {
    animation: 150,
    ghostClass: 'drag-in-progress',
    store: {
        set: async function (sortable) {
            execProcess("website-list/" + website.dataset.id, "PUT", {dbid_string: sortable.toArray().join(":")} ).then( () => {
                console.log("articleList reordered");
            });
        }
    }
});

/* 
 ** SIGN OUT
 */
const signout = document.querySelector(".signout");
signout.addEventListener('click',  () => {
    if (gExpiredSession) {
        window.location.href = gHomeUrl;
        return;
    }
    execProcess("signout","DELETE").then( () => {
        window.location.href = gHomeUrl;
    }).catch( ()=>window.location.href = gHomeUrl);
});

/* 
 ** RICH TEXT EDITOR AUTOSAVE FEATURE FUNCTION TO SEND UPDATED TEXT TO DATABASE. RETURNS data.articleId IF ARTICLE ROW WAS CREATED.
 */
let editor_status;
const editor_status_text = document.querySelector("#editor-status");

const saveData = async ( data ) => {
    
    if (editor_status==="init") {
        editor_status="ok";
        return Promise.resolve();
    }
    const pendingActions = editor.plugins.get( 'PendingActions' );
    const action = pendingActions.add( 'Saving changes' );

    editor_status_text.textContent = "Saving content ...";
    const word_count = document.querySelector(".ck-word-count__words").textContent;
    
    const title = document.querySelector(".ck > h1").textContent;
    await execProcess("article/"+gArticleId, "PUT",  {edit_text: data, title: title, word_count: word_count}).then( (data) => {
        pendingActions.remove( action );
        editor_status_text.textContent = "Saving content .." + data.words + " saved";
        update_card_elements(data);
    }).catch( (error) => console.error(error));
}


let editor;

ClassicEditor.create(document.querySelector("#editor"), {
        toolbar: [ 'heading', '|', 'bold', 'italic', 'link', 'bulletedList', 'numberedList', 'blockQuote','insertImage','codeBlock' ],
        autosave: {
            waitingTime: 2000,
            save( editor ) {
                return saveData( editor.getData() );
            }
        },
        title: {
            placeholder: 'Enter title for article'
        },
        placeholder: 'Enter article content',
        wordCount: {displayCharacters: false}
    })
    .then( (newEditor) => {
        editor = newEditor;
        const wordCountPlugin = editor.plugins.get( 'WordCount' );
        const wordCountWrapper = document.getElementById( 'word-count' );
        wordCountWrapper.appendChild( wordCountPlugin.wordCountContainer );

        const imgFileSelector = document.querySelector("input[type=file]");
        const imgBtn = imgFileSelector.previousElementSibling;
        imgBtn.disabled=true;
    })
    .catch(error => {
        console.error(error);
    });

/* 
 ** CARD 0 HAS CONTENT - MEDIA OR TEXT - SO ENABLE BUTTONS AND SET ARTICLE ID IN DROPDOWN LIST
 */
const enable_card_zero = (articleId) => {
    li = document.querySelector("[data-id='0']");
    li.dataset.id = articleId;
    li.querySelectorAll(".dropdown-items button:disabled").forEach((btn) => {
        btn.disabled = false;
    });
    gArticleId=articleId;
    return li;
}

if (window.location.hash === "#_=_"){
    history.replaceState 
        ? history.replaceState(null, null, window.location.href.split("#")[0])
        : window.location.hash = "";
}

/* 
 ** ADD NEW CARD
 */
const add_content = (target, position) => {
  if (cards.querySelector("[data-id='0']")) {
        popupOpen("No need for that","... add content to the card you already created");
        return;
  }
  const selected_card = target.closest(".card");
  const clone = cards.querySelector("[data-id='-1']").cloneNode(true);
  clone.dataset.id = "0";
  selected_card.insertAdjacentElement(position, clone);
};

/* 
 ** EDIT WEBSITE
 */
document.querySelectorAll(".edit-website").forEach(button => {
    button.addEventListener('click',  e => {
        const websiteId = e.target.dataset.id;
        popupOpen("EDIT WEBSITE - "+websiteId,"not implemented yet");
    });
});

/* 
 ** CREATE NEW WEBSITE (OR COPY IF ID>0)
 */
addWebsite.addEventListener('click',  (e) => {
    const formdata = Object.fromEntries(new FormData(website));
    execProcess("website/" + website.dataset.id,"POST", formdata).then( (data) => {
        e.target.style.display = "none";
        deployWebsite.style.display = "block";
        deployWebsite.disabled = true;

        // TODO - enable delete website nutton in dropdown

        website.dataset.id = data.websiteid;
        const inputs = website.elements;
        for (let i = 0; i < inputs.length; i++) {
            inputs[i].dataset.id = data.websiteid;
        }
    });
});

/* 
 ** DELETE WEBSITE
 */
/*
deleteWebsite.addEventListener('click',  (e) => {
    execProcess("website/" + website.dataset.id, "DELETE").then( (data) => {
        e.target.style.display = "none";
        deployWebsite.style.display = "none";
        website.dataset.id = "";
        const inputs = website.elements;
        for (let i = 0; i < inputs.length; i++) {
            inputs[i].dataset.id = "";
            if (inputs[i].type === "textarea") {
                inputs[i].value= "";
            }
        }
    });
});
*/

/* 
 ** DEPLOY WEBSITE
 */
deployWebsite.addEventListener('click',  () => {
    execProcess("deploy/" + website.dataset.id,"POST").then( (data) => {
        popupOpen("Website deployment",data.status);
        if (gIntervalId) {
            clearInterval(gIntervalId);
        }
        gIntervalId = setInterval(getDeploymentStatus,2000,websiteId);
    });
});

getDeploymentStatus = (websiteid) => {
    const status = popup.querySelector("p");
    execProcess("deploy-status/" + websiteid,"GET").then( (data) => {
        if (data.status) {
            status.replaceChildren();
            status.insertAdjacentHTML('afterbegin',data.status);
            if (data.completed) {
                clearInterval(gIntervalId);
            }
        }
    });
}

/* 
 ** UPLOAD MEDIA TO CLOUDINARY
 */
const upload_media = (articleId) => {
    execProcess( "cld-details/"+articleId,"GET").then( (data) => {
        widget.open();
        widget.update({tags: [data.articleId], cloudName: data.cloudname, api_key: data.apikey,  maxImageFileSize: data.maxImageFileSize, maxVideoFileSize: data.maxVideoFileSize});
    });
}

/* 
 ** GET CONTENT FOR RICH TEXT EDITOR 
 */
const editorDialog = document.querySelector("dialog.editor");

const edit_text = (articleId,button) => {
    const pendingActions = editor.plugins.get( 'PendingActions' );
    if ( pendingActions.hasAny ) {
        return;
    }
    if (articleId === "0") {
        const websiteId = document.querySelector("form").dataset.id;
        execProcess( "article/"+articleId,"POST",{websiteid:websiteId}).then( (data) => {
            enable_card_zero(data.articleId);
            editor.setData("");
            editor_status = "init";
            editor_status_text.textContent = "";
            editorDialog.showModal();
        });
    } else {
        execProcess( "article/"+articleId,"GET").then( (data) => {
            gArticleId = articleId;
            editor_status = "init";
            editor_status_text.textContent = "";
            if (data.content) {
                editor.setData(data.content);
            } else {
                editor.setData("");
            }
            editorDialog.showModal();
        });
    }
}

/* 
 ** UPDATE CARD ELEMENTS AFTER SAVING TEXT
 */
const update_card_elements = (data) => {
    // depending on whether any content was saved
    // exchange <br> and <h4> with <button> and <p>
    const li = document.querySelector("[data-id='" + gArticleId + "']");
    let br = li.querySelector("br"),
        button = li.querySelector("button.no-media.edit-text"),
        h4 = li.querySelector('h4'),
        p = li.querySelector('p'),
        span = li.querySelector(".word-count");

    if (data.title) {
        if (!h4) {
            h4 = document.createElement("h4");
            h4.classList.add("edit-text","title")
            br.replaceWith(h4);
        }
        h4.textContent = data.title;
    } else {
        if (h4) {
            br = document.createElement("br");
            h4.replaceWith(br);
        }
    }

    if (data.excerpt) {
        if (!p) {
            p = document.createElement("p");
            p.textContent = data.excerpt;
            const span = document.createElement("span");
            span.classList.add("word-count");
            span.textContent = data.words;
            p.append(span);
            button.replaceWith(p);
        } else {
            p.textContent = data.excerpt;
            const span = document.createElement("span");
            span.classList.add("word-count");
            span.textContent = data.words;
            p.append(span);
        }
    } else {
        if (p) {
            button = document.createElement("button");
            button.textContent = "CREATE TEXT";
            button.classList.add("edit-text","no-media");
            p.replaceWith(button);                
        }
    }
    li.querySelector(".updated-date").textContent = data.updated; 
};

/*
**  REMOVE CARD FROM DOM
*/
const remove_card = (articleId) => {
    let li = document.querySelector("[data-id='" + articleId + "']");
    li.replaceChildren();
    li.remove();
}

/*
 ** DELETE WEBSITE / ARTICLE / ASSET / USER - REQUIRES CONFIRMATION
 */
const delete_table = (id, e) => {

    e.stopPropagation();
    e.target.style.cursor = "none";

    if (e.target.nextElementSibling) return;

    const li = e.target.closest("li");

    let btn = document.createElement("button");
    btn.setAttribute("type", "button");
    btn.classList.add("delete-confirm");
    btn.dataset.id = id;
    btn.dataset.table = e.target.dataset.table;
    btn.style.width = "100%";
    btn.style.color = "white";
    btn.style.backgroundColor = "red";
    btn.style.borderRadius = "1ch";
    btn.style.padding = "2ch 0 2ch 0";
    btn.style.opacity = "1";
    btn.style.scale = "1";
    btn.style.transition = "all 1s linear";

    btn.textContent = "CONFIRM DELETE";
    btn.addEventListener("click", (e) => {
        e.stopPropagation();
        console.log("DELETE ",e.target.dataset.table,e.target.dataset.id);
        execProcess("delete","DELETE",{id:e.target.dataset.id,table_name:e.target.dataset.table}).then( (data) => {
            e.target.style.opacity = "0";
            e.target.style.scale = "0.5";
            setTimeout(() => {
                let dropdown = e.target.closest(".dropdown-items");
                e.target.closest("li").remove();
                if (dropdown.childElementCount === 0) {
                    dropdown.classList.remove("visible");
                }
            }, 1000);
            e.target.closest(".card").style.filter = "blur(5px)";
        });
    });

    li.append(btn);

    /*
    if (articleId === "0") {
        remove_card(articleId);
        return;
    }
    */
}

/*
 ** PUBLISH ARTICLE.
 */
const publish_article = (articleId, button) => {
    execProcess( "publish/"+articleId, "PUT").then( (data) => {
        if (data.message) {
            popupOpen("UNABLE TO PUBLISH ARTICLE", data.message);
        } else {
            button.classList.remove("publish");
            button.classList.add("unpublish");
            button.textContent = "Unpublish";
        }
    });
}

/*
 ** UNPUBLISH ARTICLE.
 */
const unpublish_article = (articleId, button) => {
    execProcess( "unpublish/"+articleId, "PUT").then( () => {
        button.classList.remove("unpublish");
        button.classList.add("publish");
        button.textContent = "Publish";
    });
}

/* *******************************
** START OF THUMBNAIL GALLERY CODE 
*  *******************************/

/* 
 ** DELETE ASSET AND UPDATE THUMBNAIL GALLERY
 */
const delete_asset = (id, button) => {
    execProcess( "asset/"+id, "DELETE").then( (data) => {
        if (Number(data.nb)===0) {
            location.replace(location.href);
            return;
        }

        galleryList.replaceChildren();
        galleryList.insertAdjacentHTML('afterbegin',data.content);
        galleryInstruction.textContent = data.instruction;
        
        let card = cards.querySelector("[data-id='" + data.articleId + "']"),
                cover_img = card.querySelector("img"),
                show_gallery = card.querySelector(".show-gallery"),
                updated_date = card.querySelector(".updated-date"),
                first_thumbnail = galleryList.children[0].querySelector("img");
        
        if (cover_img.src !== first_thumbnail.src) {
            cover_img.src = first_thumbnail.src;
        }
        updated_date.textContent = data.updated;
        show_gallery.textContent = "1/" + data.nb;
    });
}
