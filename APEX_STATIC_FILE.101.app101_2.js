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
      addContent = document.querySelector(".add-content"),
      listBtn = document.querySelector(".list-view"),
      list = document.querySelector(".list"),
      cards = document.querySelector(".cards"),
      popup = document.querySelector("dialog.popup"),
      popupClose = popup.querySelector("button.close"),
      popupConfirm = popup.querySelector("button.confirm"),
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
 **  LIST VIEW
 */
listBtn.addEventListener("click",  () => {
    if (cards.style.display === "grid") {
        cards.style.display = "none";
        listBtn.innerHTML = "&#9783;";
        addContent.disabled = true;
        addContent.style.opacity = 0.2;
        list.style.display = "block";
    } else {
        cards.style.display = "grid";
        list.style.display = "none";
        listBtn.innerHTML = "&#9776;";
        addContent.disabled = false;
        addContent.style.opacity = 1;
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

    if (e.target.matches(".show-gallery")) {
        show_gallery(articleId);                     
    } else if (e.target.matches(".preview")) {
        preview_article(articleId, e.srcElement);                  
    } else if (e.target.matches(".delete")) {
        delete_article(articleId);
    } else if (e.target.matches(".upload-media")) {
        upload_media(articleId);
    } else if (e.target.matches(".edit-text")) {
        edit_text(articleId,e.srcElement);          
    } else if (e.target.matches(".publish")) {
        publish_article(articleId, e.srcElement);  
    } else if (e.target.matches(".unpublish")) {
        unpublish_article(articleId, e.srcElement);                                 
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
            alertBoxOpen("FAILURE IN CLOUDINARY UPLOAD", error.message);
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
                        "website_id": cards.dataset.websiteid
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
                li.querySelector(".show-gallery").innerHTML = data.nbAssets;
                li.querySelector(".show-gallery").disabled = false;
                li.querySelector(".updated-date").textContent = data.updated;
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
        editor.ui.focusTracker.on( 'change:isFocused', ( evt, data, isFocused ) => {
            console.log( `The editor is focused: ${ isFocused }.` );
        } );
    })
    .catch(error => {
        console.error(error);
    });

/*
window.addEventListener("DOMContentLoaded", () => {
    if (navigator.maxTouchPoints > 1) {
            cards.addEventListener("touchstart",cardHandlerAuth);
            galleryList.addEventListener("touchstart",assetHandlerAuth);
    } else {
        cards.addEventListener("click",cardHandlerAuth);
        galleryList.addEventListener("click",assetHandlerAuth);
    }
});
*/


/* 
 ** CARD 0 HAS CONTENT - MEDIA OR TEXT - SO ENABLE BUTTONS AND SET ARTICLE ID IN DROPDOWN LIST
 */
const enable_card_zero = (articleId) => {
    li = document.querySelector("[data-id='0']");
    li.dataset.id = articleId;
    li.querySelector(".fa-id-card").textContent = articleId;
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
 ** SET ADJACENT <span> TO SHOW SUCCESSFUL OUTCOME
 */
const makeSuccess = (el) => {
    el.nextElementSibling.classList.add("fa", "fa-check");
    el.nextElementSibling.textContent = "Updated successfully";
}

/* 
 ** ADD NEW CARD
 */
addContent.addEventListener('click',  e => {
    // check that there isn't already a new card - i.e. the 2nd card with data-id="0" meaning that no content has yet been added to it
    if (cards.childElementCount>1 && cards.children[1].dataset.id === "0") {
        popupOpen("No need to do that","... you already opened a new card");
        return;
    }
    let first_card = document.querySelector(".card:first-child");
    let clone = first_card.cloneNode(true);
    first_card.style.display = "grid";
    first_card.insertAdjacentElement('beforebegin',clone);
    first_card.dataset.id = "0";
    first_card.querySelector(".fa-id-card").textContent = "0";
});

/* 
 ** SHOW WEBSITE ARTILES
 */
document.querySelectorAll(".show-website").forEach(button => {
    button.addEventListener('click',  e => {
        execProcess("website/" + e.target.dataset.websiteid,"GET").then( (data) => {
            cards.dataset.websiteid = e.target.dataset.websiteid;
            cards.replaceChildren();
            cards.insertAdjacentHTML('afterbegin',data.content);
        });
    });
});

/* 
 ** EDIT WEBSITE
 */
document.querySelectorAll(".edit-website").forEach(button => {
    button.addEventListener('click',  e => {
        execProcess("website/" + e.target.dataset.websiteid,"GET").then( (data) => {
            document.getElementById("domain-name").value=data.domain_name;
            document.getElementById("contact-email").value=data.contact_email;
            document.getElementById(data.image_dimension).checked=true;
            document.getElementById(data.template).checked=true;
            website.showModal();
        });
    });
});

/* 
 ** CREATE NEW WEBSITE
 */
document.querySelectorAll(".add-website").forEach(button => {
    button.addEventListener('click',  e => {
        website.showModal();
    });
});

/* 
 ** CHARACTER COUNTER FOR FORM INPUT ELEMENTS
 */
document.querySelectorAll("input[type='text'").forEach(input => {
    input.addEventListener('input',  e => {
        const maxchars = e.target.getAttribute("maxlength");
        const counter = e.target.nextElementSibling;
        let numOfEnteredChars = e.target.value.length;
        counter.textContent = numOfEnteredChars + "/" + maxchars;
    });
});

/* 
 ** DEPLOY WEBSITE
 */

document.querySelectorAll(".deploy-website").forEach(button => {
    button.addEventListener('click',  e => {
        execProcess("deploy/" + e.target.dataset.websiteid,"POST").then( (data) => {
            popupOpen("Website deployment",data.status);
            if (gIntervalId) {
                clearInterval(gIntervalId);
            }
            gIntervalId = setInterval(getDeploymentStatus,2000,e.target.dataset.websiteid);
        });
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
 ** UPLOAD MEDIA. PROMPT FOR CLOUDINARY API KEY IF NON-SUBSCRIBER
 */
const upload_media = (articleId) => {
    execProcess( "cld-details/"+articleId,"GET").then( (data) => {
        if (data.cldapikey==="Y") {
            widget.open();
            widget.update({tags: [data.articleId], cloudName: data.cloudname, api_key: data.apikey,  maxImageFileSize: data.maxImageFileSize, maxVideoFileSize: data.maxVideoFileSize});
            return;
        }
        const dialog = document.querySelector(".cldapikey");
        const promise = new Promise(function(resolve, reject) {
            dialog.showModal();
            dialog.onclose = resolve;
        });
        promise.then(function(response) {
            widget.open();
            widget.update({tags: [data.articleId], cloudName: data.cloudname, api_key: data.apikey,  maxImageFileSize: data.maxImageFileSize, maxVideoFileSize: data.maxVideoFileSize});
        });
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
        execProcess( "article/"+articleId,"POST",{websiteid:cards.dataset.websiteid}).then( (data) => {
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

popupConfirm.addEventListener("click",  (e) => {
    const articleId = e.target.dataset.id,
          template = e.target.dataset.template,
          method = e.target.dataset.method;

    execProcess( template + "/" + articleId, method, {websiteid:cards.dataset.websiteid}).then( () => {
        if (template === "article" && method === "DELETE") {
            remove_card(articleId);
            e.target.dataset.id = "";
        }
        popup.close();
    });
});

/*
 ** DELETE ARTICLE. REQUIRES CONFIRMATION IN CLICK HANDLER IF CONTAINS CONTENT
 */
const delete_article = (articleId) => {
    if (articleId === "0") {
        remove_card(articleId);
        return;
    }
    let li = document.querySelector("[data-id='" + articleId + "']"),
        title = li.querySelector(".title");
    if (title) {
        popup.querySelector("h2").textContent = title.textContent;
    } else {
        popup.querySelector("h2").textContent = "<NO TITLE>";
    }
    
    popup.querySelector("p").textContent = "Are you sure you want to delete this card?";
    popupConfirm.style.display = "block";
    popupConfirm.dataset.id = articleId;
    popupConfirm.dataset.template = "article";
    popupConfirm.dataset.method = "DELETE";
    popup.showModal();
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

/* 
 ** HANDLE CARD ACTIONS THAT UPDATE CONTENT
 */
const cardHandlerAuth = (e) => {
    const card = e.srcElement.closest(".card");
    if (!card) return;

    const articleId = card.dataset.id;

    if (e.target.matches(".delete")) {
        delete_article(articleId);
    } else if (e.target.matches(".upload-media")) {
        upload_media(articleId);
    } else if (e.target.matches(".edit-text")) {
        edit_text(articleId,e.srcElement);          
    } else if (e.target.matches(".publish")) {
        publish_article(articleId, e.srcElement);  
    } else if (e.target.matches(".unpublish")) {
        unpublish_article(articleId, e.srcElement);                                 
    }
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

/* 
 ** DELETE ASSET AND UPDATE THUMBNAIL GALLERY
 */
const update_asset = (id, li) => {
    const altText = li.querySelector("#alt-text").value,
          description = li.querySelector("#description").value;
    execProcess( "asset/"+id, "PUT", {alttext: altText, description: description}).then( (data) => {
        if (data.alt_text_updated) {
            li.querySelector("[for='alt-text'] > span").textContent = " - updated successfully";
        } else {
            li.querySelector("[for='alt-text'] > span").textContent = "";
        }
        if (data.description_updated) {
            li.querySelector("[for='description'] > span").textContent = " - updated successfully";
        } else {
            li.querySelector("[for='description'] > span").textContent = "";
        }       
    });
}

/* 
 ** HANDLE ASSET ACTIONS THAT UPDATE CONTENT
 */
const assetHandlerAuth = (e) => {

    const item = e.target.closest(".card");
    if (!item) return;

    const id = item.dataset.id;

    if (e.target.matches(".delete-asset")) {
        delete_asset(id, e.target);                                 
    } else if (e.target.matches(".update-asset")) {
        update_asset(id, item); 
    }
}
