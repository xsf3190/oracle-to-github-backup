let gArticleId,
    gBrowser,
    gConnectionType,
    perfObj = {images: []};

const cards = document.querySelector(".cards"),
      galleryList = document.querySelector(".gallery-container ul"),
      popup = document.querySelector("dialog.popup"),
      popupClose = popup.querySelector("button.close"),
      popupConfirm = popup.querySelector("button.confirm"),
      preview = document.querySelector("dialog.preview"),
      previewClose = preview.querySelector("button.close")
      perftable = document.querySelector("dialog.perftable"),
      perftableClose = perftable.querySelector("button.close");

const checkPerformance = () => {
    console.log("starting checkPerformance");
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
        galleryList.addEventListener("touchstart",showLightbox);
    } else {
        cards.addEventListener("click",cardHandler);
        galleryList.addEventListener("click",showLightbox);
    }
    
    if (apex.env.APP_USER!=="nobody") {
        new Sortable(galleryList, {
            animation: 150,
            ghostClass: 'drag-in-progress',
            store: {
                set: async function (sortable) {
                    execProcess("reorderAssets",{x01: sortable.toArray().join(":")}).then( (data) => {
                        if (data.url) {
                            const li = document.querySelector("[data-id='" + data.articleId + "']");
                            li.querySelector("img").src = data.url;
                            li.querySelector(".updated-date").textContent = data.updated;
                        }
                    });
                }
            }
        });
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

/* 
 ** RICH TEXT EDITOR AUTOSAVE FEATURE FUNCTION TO SEND UPDATED TEXT TO DATABASE. RETURNS data.articleId IF ARTICLE ROW WAS CREATED.
 */
const saveData = async ( data ) => {
    execProcess("updateContent", {x01: gArticleId, x02: document.querySelector(".ck-word-count__words").textContent, 
                                  x03: document.querySelector(".ck-word-count__characters").textContent, p_clob_01: data}).then( (data) => {
        if (data.articleId) {
            enable_card_zero(data.articleId);
        }
    });

}

/* 
 ** GENERATE SIGNATURE FOR CLOUDINARY SUSCRIBER TO ENABLE SECURE MEDIA UPLOAD
 */
const getCldSignature = async (callback, params_to_sign) => {
    execProcess("getCldSignature",{p_clob_01: JSON.stringify(params_to_sign)}).then( (data) => {
        callback(data.signature);
    });
};

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
const add_card = document.querySelector(".add-card");
if (add_card) {
    add_card.addEventListener('click',  e => {
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
}

/* 
 ** COPY CARD
 */
const copy_card = (articleId) => {
    execProcess( "copyArticle",{x01: articleId}).then( (data) => {
        const li = document.querySelector("[data-id='" + articleId + "']");  //the card to copy
        const clone = li.cloneNode(true);
        clone.dataset.id=data.articleId;
        clone.querySelector(".fa-id-card").textContent = data.articleId;
        clone.querySelector(".updated-date").textContent = data.updated;
        li.insertAdjacentElement('afterend',clone);
        clone.focus();
    });
};

/* 
 ** UPLOAD MEDIA. PROMPT FOR CLOUDINARY API KEY IF NON-SUBSCRIBER
 */
const upload_media = (articleId) => {
    execProcess( "getCldDetails",{x01: articleId}).then( (data) => {
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
            console.log("response",response);
            widget.open();
            widget.update({tags: [data.articleId], cloudName: data.cloudname, api_key: data.apikey,  maxImageFileSize: data.maxImageFileSize, maxVideoFileSize: data.maxVideoFileSize});
        });
    });
}

/* 
 ** GET CONTENT FOR RICH TEXT EDITOR 
 */
const edit_text = (articleId,button) => {
    gArticleId = articleId;
    if (articleId === "0") {
        apex.item( "P2_RICH_TEXT_EDITOR" ).setValue("");
        apex.theme.openRegion("editor");
    } else {
        execProcess( "getContent", {x01: gArticleId}, {loadingIndicator:button}).then( (data) => {
            apex.item( "P2_RICH_TEXT_EDITOR" ).setValue(data.content);
            apex.theme.openRegion("editor");
            const title = document.querySelector("[data-id='" + articleId + "'] .title");
            if (title) {
                document.querySelector("#ui-id-1").textContent = title.textContent;
            } else {
                document.querySelector("#ui-id-1").textContent = "Edit Text";
            }  
        });
    }
}

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
 ** SAVE ARTICE AND CLOSE EDITOR
 */
const save_and_exit = () => {
    execProcess( "saveArticle", {x01: gArticleId}).then( (data) => {
        // depending on whether any content was saved
        // exchange <br> and <h4> with <button> and <p>
        const li = document.querySelector("[data-id='" + gArticleId + "']"),
              br = li.querySelector("br"),
              button = li.querySelector("button.no-media.edit-text"),
              h4 = li.querySelector('h4'),
              p = li.querySelector('p');

        if (data.title) {
            const span = document.createElement("span");
            span.textContent = data.words;
            if (h4) {
                h4.textContent = data.title;
                p.textContent = data.excerpt;
                p.append(span);
            } else {
                const h4_ele = document.createElement("h4"),
                      p_ele = document.createElement("p");
                h4_ele.classList.add("title","edit-text");
                h4_ele.textContent = data.title;
                br.replaceWith(h4_ele);
                p_ele.classList.add("excerpt");
                p_ele.textContent = data.excerpt;
                p_ele.append(span);
                button.replaceWith(p_ele);
            }
        } else {
            if (h4) {
                const br_ele = document.createElement("br"),
                      button_ele = document.createElement("button");
                h4.replaceWith(br_ele);
                button_ele.textContent = "CREATE TEXT";
                button_ele.classList.add("edit-text","no-media");
                p.replaceWith(button_ele);                
            }
        }
        li.querySelector(".updated-date").textContent = data.updated;
        apex.theme.closeRegion("editor");      
    });
};

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
            document.querySelector("#ui-id-2").textContent = title.textContent;
        } else {
            document.querySelector("#ui-id-2").textContent = "Gallery";
        }
    });
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
          process = e.target.dataset.process;
    execProcess( process, {x01: articleId},{loadingIndicator: e.target}).then( () => {
        if (process === "deleteArticle") {
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
    console.log("articleId",articleId)
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
    popupConfirm.dataset.process = "deleteArticle";
    popup.showModal();
}

/*
 ** PUBLISH ARTICLE.
 */
const publish_article = (articleId, button) => {
    execProcess( "publishArticle", {x01: articleId, x02: "Y"}).then( () => {
        button.classList.remove("publish");
        button.classList.add("unpublish");
        button.textContent = "Unpublish";
    });
}

/*
 ** UNPUBLISH ARTICLE.
 */
const unpublish_article = (articleId, button) => {
    execProcess( "publishArticle", {x01: articleId, x02: "N"}).then( () => {
        button.classList.remove("unpublish");
        button.classList.add("publish");
        button.textContent = "Publish";
    });
}

const cardHandler = (e) => {
    const card = e.srcElement.closest(".card");
    if (!card) return;

    const articleId = card.dataset.id;

    if (e.target.matches(".delete")) {
        delete_article(articleId);
    } else if (e.target.matches(".upload-media")) {
        upload_media(articleId);
    } else if (e.target.matches(".edit-text")) {
        edit_text(articleId,e.srcElement);        
    } else if (e.target.matches(".show-gallery")) {
        show_gallery(articleId);    
    } else if (e.target.matches(".copy-card")) {
        copy_card(articleId);  
    } else if (e.target.matches(".publish")) {
        publish_article(articleId, e.srcElement);  
    } else if (e.target.matches(".unpublish")) {
        unpublish_article(articleId, e.srcElement);                  
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
const blur = getComputedStyle(document.documentElement).getPropertyValue("--blur");

const thumbs_minus = document.querySelector("#gallery .thumbs-minus");
const thumbs_plus = document.querySelector("#gallery .thumbs-plus");

thumbs_minus.addEventListener("click", () => {
    setGalleryWidth("down",thumbs_minus,thumbs_plus);
});
thumbs_plus.addEventListener("click", () => {
    setGalleryWidth("up",thumbs_minus,thumbs_plus);
});

/*
 *  Global variables that are set throughout the code to support GALLERY and LIGHTBOX components
 */
let selectedElement,
    lastTag,
    lightbox_touchstartX = 0,
    lightbox_touchendX = 0
    timeout = false;
    //delay = 250;

const showLightbox = (e) => {
    if (e.srcElement.tagName === "IMG" && !e.srcElement.parentElement.classList.contains("deleted")) {
        selectedElement = e.srcElement;
        apex.theme.openRegion("lightbox");  
        lightbox_next.focus();
        replaceImg();
        if (!lightbox_img.requestFullscreen) {
            lightbox_fullscreen.disabled = true;
        }
    }
}

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
 **  LIST PERFORMANCE METRICS
 */
const list_performance = document.querySelector(".list-performance");
list_performance.addEventListener("click",  () => {
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

/* ************************************************* 
 **
 **                 LIGHTBOX CODE
 **
 * ************************************************/

const lightbox = document.querySelector("#lightbox .lightbox");
const lightbox_nav = lightbox.querySelector("nav");
const lightbox_form = lightbox.querySelector(".form");
const lightbox_figure = lightbox.querySelector("figure");
const lightbox_message = lightbox.querySelector("figure + span");
const lightbox_img = lightbox.querySelector("img");
const lightbox_video = lightbox.querySelector("video");
const lightbox_audio = lightbox.querySelector("audio");
const lightbox_next = lightbox.querySelector(".lightbox-nextbtn");
const lightbox_prev = lightbox.querySelector(".lightbox-prevbtn");
const lightbox_fullscreen = lightbox.querySelector(".lightbox-fullscreen");
const lightbox_update = lightbox.querySelector(".lightbox-updatebtn");
const lightbox_delete = lightbox.querySelector(".lightbox-deletebtn");
const lightbox_confirm_delete = lightbox.querySelector(".confirm-delete");
const lightbox_confirm_ok = lightbox.querySelector(".confirm-ok");
const lightbox_confirm_nok = lightbox.querySelector(".confirm-nok");
const lightbox_deleted_ok = lightbox.querySelector(".deleted-ok");
const lightbox_alt_text = lightbox.querySelector("#alt-text");
const lightbox_description = lightbox.querySelector("#description");
const lightbox_copyurl = lightbox.querySelectorAll(".lightbox-copyurlbtn");
const lightbox_filename = lightbox.querySelector(".lightbox-filename");
const lightbox_uploaded = lightbox.querySelector(".lightbox-uploaded");
const lightbox_performance = lightbox.querySelector(".lightbox-performance");

/*
**  Get count of media 
*/
const counter = () => {
    let li = selectedElement.parentElement;
    let pos = 0;
    while (null != li) {
        li = li.previousElementSibling;
        if (li != null) {
            if (li.classList.contains("deleted")) {
                pos--;
            }
        }
        pos++;
    }
    let nb = galleryList.querySelectorAll(".deleted").length;
    nb = galleryList.childElementCount - nb;
    return pos + "/" + nb;
};

const formatBytes = (bytes,decimals=0) => {
   if(bytes == 0) return '0B';
   var k = 1024,
       sizes = ['B', 'kB', 'mB', 'gB', 'TB', 'PB', 'EB', 'ZB', 'YB'],
       i = Math.floor(Math.log(bytes) / Math.log(k));
   return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + sizes[i];
}

/*
 **  Set image src url to include width transformation that is closest to target container width
 **  Array of sizes from which to select based on width parameter in current image url and currently supports 3 dimensions:
 **  1. Small  - 25% of original width - all images in the gallery component are 
 **  2. Medium - 62.5% of original width
 **  3. Large  - 100% of original  width
 */
const getURL = async (media) => {
    const dimensions = media.dataset.dimensions.split(':'),
          widths = dimensions.map(dimension => dimension.substring(dimension,dimension.indexOf("x")));
    
    let url = media.src
    
    const vw = document.fullscreenElement ? window.innerWidth : lightbox_figure.clientWidth;

    const closest = widths.reduce((prev, curr) => {
        return Math.abs(curr - vw) < Math.abs(prev - vw) ? curr : prev;
    });                              

    if (closest === widths[widths.length - 1]) {
        url = url.replace(/,w_\d+/,  "");
    } else {
        url = url.replace(/,w_\d+/,  ",w_" + closest);
    }
    if (url !== media.src) {
        await new Promise(r => {lightbox_img.onload=r; lightbox_img.src=url});
    }
};

/*
 ** Reset HTML for all elements in Lightbox 
 */
const getData = (media) => {
    const dimensions = media.dataset.dimensions.split(':'),
          widths = dimensions.map(dimension => dimension.substring(dimension,dimension.indexOf("x")));
    
    let filename = media.src.substring(media.src.lastIndexOf("/")+1),
        suffix = filename.lastIndexOf("_"),
        ellipsis = '.';
    if (suffix > 100) {
        suffix = 100;
        ellipsis = "...";
    }
    
    lightbox_figure.classList.remove("deleted");
    lightbox_filename.textContent = filename.substring(0,suffix) + ellipsis + media.dataset.format;
    lightbox_uploaded.textContent = media.dataset.uploaded + ", " + formatBytes(media.dataset.uploadedSize);

    /*
    if (!document.fullscreenElement) {
        execProcess("getPerformance", {x01:selectedElement.parentElement.dataset.id}).then((data) => {
            lightbox_performance.replaceChildren();
            lightbox_performance.insertAdjacentHTML('afterbegin',data.content);
        });
    }
    */

    document.querySelector("#ui-id-3").textContent = counter();

    lightbox_alt_text.value = media.alt;
    charCount(lightbox_alt_text);  
    lightbox_alt_text.nextElementSibling.classList.remove("fa", "fa-check");

    lightbox_description.value = media.dataset.description;
    charCount(lightbox_description);
    lightbox_description.nextElementSibling.classList.remove("fa", "fa-check");
    
    lightbox.querySelectorAll("button").forEach((btn) => {
            btn.disabled = false;
    });

    lightbox_copyurl.forEach((button, index) => {
        button.textContent = dimensions[index];
        button.dataset.text = dimensions[index];
        if (button.classList.contains("success")) {
            button.classList.remove("success");
        }
        if (index === widths.length -1) {
            button.dataset.url = media.src.replace(/,w_\d+/,  "");
        } else {
            button.dataset.url = media.src.replace(/,w_\d+/,  ",w_" + widths[index]);
        }
    });
    if (lightbox_confirm_delete) {
        lightbox_confirm_delete.style.visibility = "hidden";
        lightbox_deleted_ok.style.visibility = "hidden";
    }
};

/*
 **  Thumbnails are <img> elements with source url formatted as:
 **  Image : <img src="https://res.cloudinary.com/{account}/q_auto,f_auto,w_100/{public_id}>"
 **  Audio : <img src="https://res.cloudinary.com/{account}/video/upload/w_100,h_100,fl_waveform/{public_id}.png>"
 **  Video : <img src="https://res.cloudinary.com/{account}/video/upload/q_auto,f_auto,w_100/{public_id}.jpg>"
 */
const replaceImg = async () => {
    const media = selectedElement;

    /* set DOM data values common to all media types */
    getData(media);

    if (media.src.includes("/fl_waveform/")) {
        tagName = "audio";
    } else if (media.src.includes("/video/upload/")) {
        tagName = "video";
    } else {
        tagName = "img";
    }

    switch (tagName) {
        case "img":
            lightbox_img.src = media.src;  // show thumbnail first

            /* check whether a higher resolution image is required in fullscreen mode */
            if (document.fullscreenElement) {
                getURL(media);
            }
            
            if (lastTag !== tagName) {
                lightbox_img.style.display = "block";
                lightbox_video.style.display = "none";
                lightbox_audio.style.display = "none";
                lightbox_fullscreen.style.display = "block";
            }
            break;

        case "video":
            lightbox_video.src = media.src
                .replace(/,w_\d+/, "")
                .replace(/.jpg/,"");

            if (lastTag !== tagName) {
                lightbox_video.style.display = "block";
                lightbox_audio.style.display = "none";
                lightbox_img.style.display = "none";
                lightbox_video.controls = true;
                lightbox_fullscreen.style.display = "none";
            }
            break;
        
        case "audio":
            lightbox_img.src = media.src;
            // load the audio file which will trigger performance observer
            // observer code triggers custom event "observed" for audio and video media
            lightbox_audio.src=media.src
                .replace(/,w_\d+\/fl_waveform/, "")
                .replace(/.png/,"");
            lightbox_audio.style.display = "block";
            lightbox_img.style.display = "block";
            lightbox_video.style.display = "none";
            lightbox_audio.controls = true;
            lightbox_fullscreen.style.display = "none";
            break;
    }
    
    lastTag = tagName;
};

lightbox_next.addEventListener("click", (e) => {
    let process = true;
    while (process) {
        if (selectedElement.parentElement.nextElementSibling) {
            selectedElement = selectedElement.parentElement.nextElementSibling.firstElementChild;
        } else {
            selectedElement = selectedElement.parentElement.parentElement.firstElementChild.firstElementChild;
        }
        if (!selectedElement.parentElement.classList.contains("deleted")) {
            process = false;
        }
    }
    replaceImg();  
});

lightbox_prev.addEventListener("click", (e) => {
    let process = true;
    while (process) {    
        if (selectedElement.parentElement.previousElementSibling) {
            selectedElement = selectedElement.parentElement.previousElementSibling.firstElementChild;
        } else {
            selectedElement = selectedElement.parentElement.parentElement.lastElementChild.firstElementChild;
        }
        if (!selectedElement.parentElement.classList.contains("deleted")) {
            process = false;
        }
    }
    replaceImg();
});

enableKeydown = (event) => {
    const keyName = event.key;
    if (keyName === "Escape") {
        lightbox_close.click();
    } else if (keyName === "ArrowLeft") {
        lightbox_prev.click();
    } else if (keyName === "ArrowRight") {
        lightbox_next.click();
    }
}
/*
 **  Create click event handler on fullscreen icon to display images
 */

lightbox_fullscreen.addEventListener("click", (e) => {
    if (!document.fullscreenElement) {
        if (lightbox_img.requestFullscreen) {
            lightbox_img.requestFullscreen()
                .then(() => {
                    getURL(selectedElement);
                    window.addEventListener("keydown", enableKeydown);
                })
                .catch((err) => {
                    alert(`Error attempting to enable fullscreen mode: ${err.message} (${err.name})`);
                });
        }
    };
});

lightbox_img.addEventListener("fullscreenchange", (e) => {
    if (document.fullscreenElement) {
    } else {
        window.removeEventListener("keydown", enableKeydown);
        lightbox_fullscreen.focus();
    }
});

lightbox_copyurl.forEach(button => button.addEventListener('click', async e => {
    if (!navigator.clipboard) {
        console.error("Clipboard API not available");
        return;
    }
    // add class to the selected element after removing it from all other siblings
    const copiedClass = "success";
    let selected = e.currentTarget,
        parent = selected.parentElement;

    for (const child of parent.children) {
        if (child.classList.contains(copiedClass)) {
            child.classList.remove(copiedClass);
            child.innerHTML = child.dataset.text;
        }
    }
    selected.classList.add(copiedClass);

    const text = selected.dataset.url;
    try {
        await navigator.clipboard.writeText(text);
        selected.innerHTML = "COPIED";
    } catch (err) {
        console.error('Failed to copy URL!', err)
    }
}));


/*
 **  Calculate character count and display beneath the input element.
 **  The maxlength attribute is set in the element's html definition by the PLSQL procedure called to create the page
 */
const charCount = (element) => {
    let currentLength = element.value.length;
    if (currentLength == 0) {
        element.nextElementSibling.textContent = null;
        return;
    }
    
    let maxlength = element.getAttribute("maxlength");
    element.nextElementSibling.textContent = currentLength + "/" + maxlength; 
    if (currentLength >= maxlength) {
        element.nextElementSibling.style.color = "red";
    } else {
        element.nextElementSibling.style.color = "currentColor";
    }
}

/*
 **  Create handler on "input" event for all elements with "input" class - i.e. <yextarea> and <input type="text">
 */
lightbox.querySelectorAll("textarea").forEach((input) => {
    input.addEventListener("input", function() {
        charCount(this);
    });
});

/*
 **  Create click event handler for the "UPDATE" button
 */
if (lightbox_update) {
    lightbox_update.addEventListener("click", (e) => {
        execProcess( "updateAsset", {x01: selectedElement.parentElement.dataset.id, x02: lightbox_alt_text.value, x03: lightbox_description.value}).then( (data) => {
            if (selectedElement.alt !== lightbox_alt_text.value) {
                makeSuccess(lightbox_alt_text);
                selectedElement.alt = lightbox_alt_text.value;
            }
            if (selectedElement.dataset.description !== lightbox_description.value) {
                makeSuccess(lightbox_description);
                selectedElement.dataset.description = lightbox_description.value;           
            }
        });
    });
}

/*
 **  Create click event handler for the "DELETE" button
 **  - set currently displayed media to blur
 */
if (lightbox_delete) {
    lightbox_delete.addEventListener("click", (e) => {
        lightbox_confirm_delete.style.visibility = "visible";
    });
}

if (lightbox_confirm_ok) {
    lightbox_confirm_ok.addEventListener("click", (e) => {
        if (lightbox_figure.classList.contains("deleted")) {
            return;
        }
        execProcess( "deleteAsset", {x01: selectedElement.parentElement.dataset.id},{loadingIndicator:lightbox_confirm_ok}).then( (data) => {
            selectedElement.removeEventListener("click",showLightbox);
            lightbox_figure.classList.add("deleted");
            selectedElement.parentElement.classList.add("deleted");
            lightbox_confirm_delete.style.visibility = "hidden";
            lightbox_deleted_ok.style.visibility = "visible";

            let title=document.querySelector("#ui-id-3"),
                nb = Number(title.textContent.split("/").pop()) - 1;
            
            title.textContent = "x/" + nb;
            
            lightbox_form.querySelectorAll("button").forEach((btn) => {
                btn.disabled = true;
            });

            /* update card gallery count and possibly the image on the home page */
            let card = cards.querySelector("[data-id='" + data.articleId + "']"),
                img = card.querySelector("img"),
                show_gallery = card.querySelector(".show-gallery"),
                updated_date = card.querySelector(".updated-date");

            updated_date.textContent = data.updated;
            
            if (nb === 0) {
                lightbox_nav.querySelectorAll("button").forEach((btn) => {
                    btn.disabled = true;
                });
                let nomedia = document.createElement("button");
                nomedia.textContent = "UPLOAD MEDIA";
                nomedia.classList.add("no-media","upload-media");
                img.replaceWith(nomedia);
                show_gallery.disabled = true;
                show_gallery.textContent = "0/0"
            } else {
                show_gallery.textContent = "1/" + nb;
            }
            if (data.url) {
                img.src = data.url;
            }
            
        });
    });
}

if (lightbox_confirm_nok) {
    lightbox_confirm_nok.addEventListener("click", (e) => {
        lightbox_confirm_delete.style.visibility = "hidden";
    });
}

lightbox.addEventListener("touchstart", (e) => {
  lightbox_touchstartX = e.changedTouches[0].screenX;
});

lightbox.addEventListener("touchend", (e) => {
  lightbox_touchendX = e.changedTouches[0].screenX;
  if (lightbox_touchendX < lightbox_touchstartX) {
    lightbox_next.click();
  } else {
    lightbox_prev.click();
  }
});

window.addEventListener(
  "touchstart",
  function touched() {
    document.body.classList.add("touch");
    window.removeEventListener("touchstart", touched, false);
  },
  false
);