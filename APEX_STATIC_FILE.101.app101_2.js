let gWebsiteId,
    gArticleId,
    gBrowser,
    gFullImage,
    gIntervalId,
    gExpiredSession = false;

const apex_app_id = document.querySelector("#pFlowId").value,
      apex_page_id = document.querySelector("#pFlowStepId").value,
      apex_session = document.querySelector("#pInstance").value,
      wrapper = document.querySelector(".wrapper"),
      logDialog = document.querySelector("dialog.log"),
      logContent = logDialog.querySelector(".content"),
      websiteDialog = document.querySelector("dialog.website-options"),
      websiteContent = websiteDialog.querySelector(".content"),
      pageDialog = document.querySelector("dialog.page-options"),
      pageContent = pageDialog.querySelector(".content"),
      deployButtons = wrapper.querySelector(".deploy-buttons > div"),
      websiteNav = wrapper.querySelector(".website-nav"),
      pageNav = wrapper.querySelector(".page-nav"),
      cards = wrapper.querySelector(".cards"),
      popup = document.querySelector("dialog.popup"),
      popupClose = popup.querySelector("button.close"),
      galleryList = wrapper.querySelector(".gallery-list"),
      galleryFull = wrapper.querySelector(".gallery-overlay"),
      galleryFullImg = galleryFull.querySelector("img"),
      galleryFullCounter = galleryFull.querySelector("span.counter"),
      galleryFullClose = galleryFull.querySelector("button.close-fullscreen"),
      galleryFullPrev = galleryFull.querySelector("button.prev"),
      galleryFullNext = galleryFull.querySelector("button.next"),
      galleryFullCloseFieldset = galleryFull.querySelector("button.close-fieldset"),
      galleryFullLegend = galleryFull.querySelector("legend > span"),
      galleryFullDimensions = galleryFull.querySelectorAll("fieldset button.dimensions");

/*
**  TEXT INPUT COMPONENT
*/
const inputHandler = (e) => {
    if (!e.target.matches(".cms")) return;
    if (e.target.tagName !== "TEXTAREA" && e.target.tagName !== "INPUT") return;

    if (e.target.id==="domain_name") {
        e.target.value = e.target.value.replace(/[^a-z0-9.]/gi, "");
    };

    const maxchars = e.target.getAttribute("maxlength");
    const counter = e.target.parentElement.querySelector(".charcounter");
    let numOfEnteredChars = e.target.value.length;

    if (maxchars) {
        counter.textContent = numOfEnteredChars + "/" + maxchars;
    } else {
        counter.textContent = numOfEnteredChars;
        return;
    }

    if (numOfEnteredChars === Number(maxchars)) {
        counter.style.color = "red";
    } else {
        counter.style.color = "initial";
    }
}

const focusHandler = (e) => {
    if (!e.target.matches(".cms")) return;

    let result;
    if (e.target.tagName == "TEXTAREA" || e.target.tagName == "INPUT" || e.target.tagName == "SELECT") {
        result = e.target.parentElement.querySelector(".result");
    } else if (e.target.tagName == "INPUT" && e.target.type == "radio") {
        result = e.target.closest("fieldset").nextElementSibling.querySelector(".result");
    }
    result.textContent = "";
    result.style.opacity = "0";
}

const changeHandler = (e) => {
    if (!e.target.matches(".cms")) return;
    let result;
    if (e.target.tagName == "INPUT" && e.target.type == "radio") {
        result = e.target.closest("fieldset").nextElementSibling.querySelector(".result");
    } else {
        result = e.target.parentElement.querySelector(".result");
    }

    const table_column = e.target.dataset.column,
          id = e.target.dataset.id,
          value = e.target.value;

    execProcess("dml","PUT",{id:id,table_column:table_column,value:value}).then( (data) => {
        result.textContent = data.message;
        result.style.color = data.color;
        result.style.opacity = "1";

        if (data.deploy_buttons) {
            deployButtons.replaceChildren();
            deployButtons.insertAdjacentHTML('afterbegin',data.deploy_buttons);
        }

        /* Update UI if domain name or rnavigation label are change */

        switch (table_column) {
            case 'website_article.navigation_label' :
                pageNav.querySelector("[data-id='"+gArticleId+"'] > a").textContent = value;
                break;
            case 'website.domain_name' :
                websiteNav.querySelector("[data-id='"+gWebsiteId+"'] > a").textContent = value;
                break;
            case 'website.color_dark' :
                websiteContent.querySelector(".demo").style.color = value;
                break;
            case 'website.color_light' :
                websiteContent.querySelector(".demo").style.background = value;
                break;
            case 'website.color_primary' :
                websiteContent.querySelector(".demo>section").style.background = value;
                break;
            case 'website.font' :
                const fontFile = new FontFace(data.font_family,data.font_url);
                document.fonts.add(fontFile);
                fontFile.load().then(()=>{
                    console.log("font " + data.font_family + " loaded");
                    websiteContent.querySelector(".demo").style.fontFamily = data.font_family;
                    const font = websiteContent.querySelector("[data-column='website.font']");
                    const selectedFont = font.options[font.selectedIndex].text;
                    websiteContent.querySelector(".demo>p").textContent = `I'm "${selectedFont}" dark-coloured text in light background`;
                });
                break;
        }
    });
}

/*
 **  EDIT WEBSITE
 */
const edit_website = () => {
    execProcess( "website/"+gWebsiteId,"GET").then( (data) => {
        deployButtons.replaceChildren();
        deployButtons.insertAdjacentHTML('afterbegin',data.deploy_buttons);

        pageNav.replaceChildren();
        
        editor_status = "init";
        editor_status_text.textContent = "";

        if (data.nav_labels) {
            pageNav.insertAdjacentHTML('afterbegin',data.nav_labels);
            gArticleId = data.selected; 
            if (data.html) {
                editor.setData(data.html);
                editor_status_text.textContent = data.updated_date;
            } else {
                editor.setData("");
            }
            galleryList.replaceChildren();
            if (data.thumbnails) {
                galleryList.insertAdjacentHTML('afterbegin',data.thumbnails);
                lazyload();
            }
        } else {
            gArticleId = 0;
            editor.setData("");
            galleryList.replaceChildren();
        }
    });
};

/* 
 ** DEPLOY WEBSITE
 */
const deploy_website = (e) => { 
    const site_id = e.target.dataset.site_id;
    if (!site_id) return;
    execProcess("deploy","POST",{"websiteid":gWebsiteId,"siteid":site_id,"url":e.target.textContent}).then( (data) => {
        logContent.replaceChildren();
        logContent.insertAdjacentHTML('afterbegin',data.content);
        logDialog.showModal();
        if (data.stop) return;
        if (gIntervalId) {
            clearInterval(gIntervalId);
        }
        gIntervalId = setInterval(getDeploymentStatus,2000,gWebsiteId, site_id);
    });
};

getDeploymentStatus = (websiteid, siteid) => {
    execProcess("deploy-status/"+websiteid+","+siteid,"GET").then( (data) => {
        if (data.content) {
            logContent.querySelector("ol.deploy").insertAdjacentHTML('beforeend',data.content);
        }
        if (data.completed) {
            clearInterval(gIntervalId);
        }
    });
}

/*
**  CLOSE DIALOGS
*/
document.querySelectorAll("button.close").forEach((button) => {
    button.addEventListener("click", (e) => {
        if (gIntervalId) {
            clearInterval(gIntervalId);
        }
        e.stopPropagation();
        if (e.target.dataset.sqlcode) {
            if (Number(e.target.dataset.sqlcode) === -20000) {
                console.log("button.close click handler finds sqlcode=20000");
                window.location.href = gHomeUrl;
            }
        }
        e.target.closest("dialog").close();
    });
});

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

window.addEventListener("DOMContentLoaded", () => {
    console.log("DOMContentLoaded");
    
    console.log("apex_app_id",apex_app_id);
    console.log("apex_page_id",apex_page_id);
    console.log("apex_session",apex_session);

    let browser = bowser.getParser(window.navigator.userAgent),
        browserName = browser.getBrowserName(),
        browserVersion = browser.getBrowserVersion();

    gBrowser = browserName + "," + browserVersion;
    console.log("gBrowser",gBrowser);

    if (navigator.maxTouchPoints > 1) {
        wrapper.addEventListener("touchstart",clickHandler);
    } else {
        wrapper.addEventListener("click",clickHandler);
    }
    wrapper.addEventListener("input",inputHandler);
    wrapper.addEventListener("focusin",focusHandler);
    wrapper.addEventListener("change",changeHandler);
    

    if (checkPerformance()) {
        const observer = new PerformanceObserver(perfObserver);
        observer.observe({ type: "resource", buffered: true });
    }

    /* display last updated website and article */
    gWebsiteId = websiteNav.querySelector("a.selected") ?  websiteNav.querySelector("a.selected").closest("div").dataset.id : 0;
    gArticleId = pageNav.querySelector("a.selected") ? pageNav.querySelector("a.selected").closest("div").dataset.id : 0;
    console.log("gWebsiteId,gArticleId",gWebsiteId,gArticleId);

    if (gArticleId > 0) {
        edit_text();
        lazyload();
    }
});

const lazyload = () => {
    const images = document.querySelectorAll('[data-src]');
    const config = {rootMargin: '0px 0px 50px 0px',threshold: 0};

    let observer = new IntersectionObserver(function (entries, self) {
        entries.forEach(entry => {
        if (entry.isIntersecting) {
            // console.log(`Image ${entry.target.src} is in the viewport!`);
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
    }
}

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
                        "window_innerwidth": window.innerWidth, "browser":gBrowser, "servertiming": entry.serverTiming}
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
            } else if (input instanceof File) {
                response = await fetch(url, {method: method, headers: {"Apex-Session": session}, body: input});
            } else {
                response = await fetch(url, {method: method, headers: {"Apex-Session": session}, body: JSON.stringify(input)});
            }

            if (!response.ok) {
                if (response.status===404) {
                    popupOpen(response.status, method+" "+url);
                    /*reject("https response =" +response.status);*/
                } else {
                    const data = await response.json();
                    popupOpen(data.action, data.cause);
                }
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
 **  CLICK HANDLER
 */
const clickHandler = (e) => {

    let open = e.target.matches(".show-dropdown") && e.target.nextElementSibling.classList.contains("visible");

    document.querySelectorAll(".dropdown-items.visible").forEach((dropdown) => {
        dropdown.classList.toggle("visible",false);
    });
    
    if (!open && e.target.matches(".show-dropdown")) {
        e.target.nextElementSibling.classList.toggle("visible");
    }

    if (e.target.matches(".nav-label")) {
        e.preventDefault();
        if (e.target.matches(".selected")) return;
        if (!wrapper.querySelector(".ck-source-editing-button").matches(".ck-off")) {
            popupOpen("Click Source button",".. cannot switch pages when in Source editing mode");
            return;
        }
        const id = e.target.parentElement.dataset.id,
              nav = e.target.closest("nav");

        selected_nav(nav,id);

        if (nav.matches(".website-nav")) {
            gWebsiteId = id;
            edit_website();
        } else if (nav.matches(".page-nav")) {
            gArticleId = id;
            edit_text();
        }
    } else if (e.target.matches(".visits")) {
        get_visits(e); 
    } else if (e.target.matches(".clear-input")) {
        clear_input(e); 
    } else if (e.target.matches(".new-website")) {
        new_website(); 
    } else if (e.target.matches(".website-options")) {
        website_options();
    } else if (e.target.matches(".use_eyedropper")) {
        eye_dropper(e);
    } else if (e.target.matches(".page-options")) {
        page_options();
    } else if (e.target.matches(".new-page")) {
        new_page(e);   
    } else if (e.target.matches(".edit-codepen")) {
        edit_codepen();   
    } else if (e.target.matches(".upload-codepen")) {
        upload_codepen();     
    } else if (e.target.matches(".restore-article")) {
        /*restore_article();*/
        console.log("restore article content");                                                                                                           
    } else if (e.target.matches(".upload-media")) {
        upload_media();                            
    } else if (e.target.matches(".delete-page")) {
        delete_page();
    } else if (e.target.matches(".delete-website")) {
        delete_website();
    } else if (e.target.matches(".delete-asset")) {
        delete_asset(e);
    } else if (e.target.matches(".delete-user")) {
        delete_user();
    } else if (e.target.matches(".expand")) {
        showFullScreen(e);                                 
    } else if (e.target.matches(".copy")) {
        copy_url(e);                                 
    } else if (e.target.matches(".deploy-website")) {
        deploy_website(e);
    } else if (e.target.matches(".saveBtn")) {
        console.log("saveBtn clicked - do nothing!");
    }
}

/*
 **  CLEAR INPUT
 */
const clear_input = (e) => {
    const input = e.target.previousElementSibling;
    input.value = "";
    input.focus();
};

/*
 **  START EYEDROPPER API TO SELECT COLOR FROM SCREEN
 */
const eye_dropper = async (e) => {
    const eyeDropper = new EyeDropper();
    const result = await eyeDropper.open();
    if (result.sRGBHex) {
        const input = e.target.parentElement.nextElementSibling;
        
        input.value = result.sRGBHex;
        
        execProcess("dml","PUT",{id:input.dataset.id,table_column:input.dataset.column,value:input.value}).then( (data) => {
            const result = e.target.closest(".input-wrapper").querySelector(".result");
            result.textContent = data.message;
            result.style.color = data.color;
            result.style.opacity = "1";

            /* simulate "change" event */
            const demo = websiteContent.querySelector(".demo");

            switch (input.dataset.column) {
                case 'website.color_dark': 
                    demo.style.color = input.value;
                    break;
                case 'website.color_light': 
                    demo.style.background = input.value;
                    break;
                case 'website.color_primary':
                    demo.querySelector("section").style.background = input.value;
                    break;
            }
            
        });
    }
};

/*
 **  COPY URL
 */
const copy_url = async (e) => {
    const li = e.target.closest("li"),
          src = li.querySelector("img").src;
    try {
        await navigator.clipboard.writeText(src);
        popupOpen("Image URL copied to clipboard","... can be inserted into document");
    } catch (err) {
        popupOpen('Failed to copy URL!', err)
    }
};

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
        const li =e.target.closest("li");
        gFullImage = li.querySelector(".fullscreen");
        setImgSrc(gFullImage);
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
    if (!img.src) {
        img.src = img.getAttribute('data-src');
    }
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
                        "article_id": item.uploadInfo.tags[0]
                    });
                }
            });
            execProcess("cld-upload","POST",metadata).then( (data) => {
                console.log("uloaded media to cloudinry");
                galleryList.insertAdjacentHTML('afterbegin',data.thumbnails);
                lazyload();
            });
        };
    }
);

/* 
 ** ENABLE DRAG AND DROP OF GALLERY IMAGES TO RE-ORDER
 */
new Sortable(galleryList, {
    sort: true,
    animation: 150,
    ghostClass: 'drag-in-progress',
    //multiDrag: true,
    store: {
        set: async function (sortable) {
            execProcess("thumbnails","PUT", {dbid_string: sortable.toArray().join(":")} ).then( (data) => {
                console.log("sorted!");
            });
        }
    }
});

/* 
 **  DRAG AND DROP WEBSITE ARTICLES TO RE-ORDER
 */
new Sortable(pageNav, {
    sort: true,
    animation: 150,
    ghostClass: 'drag-in-progress',
    store: {
        set: async function (sortable) {
            execProcess("reorder-articles/" + gWebsiteId, "PUT", {dbid_string: sortable.toArray().join(":")} ).then( () => {
                console.log("pages reordered");
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
        console.log("User clicked Log Off");
        window.location.href = gHomeUrl;
    }).catch( ()=>{
        console.log("Log Off click handler caught error");
        window.location.href = gHomeUrl;
    })
});

/*
 ** TECHNICAL LOG
 */
const sessionLog = document.querySelector(".session-log");
sessionLog.addEventListener('click',  () => {
    execProcess("log/"+apex_session,"GET").then( (data) => {
        logContent.replaceChildren();
        logContent.insertAdjacentHTML('afterbegin',data.content);
        logDialog.showModal();
    });
});

/*
 ** LOAD GOOGLE FONTS. ADMIN FUNCTION
 */
const load_fonts = document.querySelector(".load-fonts");
if (load_fonts) {
    load_fonts.addEventListener('click',  () => {
        execProcess("load-fonts","PUT").then( (data) => {
            logContent.replaceChildren();
            logContent.insertAdjacentHTML('afterbegin',data.content);
            logDialog.showModal();
        });
    });
}

/* 
 ** RICH TEXT EDITOR AUTOSAVE FEATURE FUNCTION TO SEND UPDATED TEXT TO DATABASE.
 */
let editor_status,
    editor_status_text;

const saveData = async ( data ) => {
    
    if (editor_status==="init") {
        editor_status="ok";
        return Promise.resolve();
    }
    if (!gArticleId) {
        editor_status_text.textContent = "New Page enables editor";
        editor_status_text.style.color = "red";
        return Promise.resolve();
    }

    const pendingActions = editor.plugins.get( 'PendingActions' );
    const action = pendingActions.add( 'Saving changes' );

    editor_status_text.textContent = "...";

    const word_count = document.querySelector(".ck-word-count__words").textContent;
    const title = document.querySelector(".ck > h1").textContent;
    await execProcess("article/"+gArticleId, "PUT",  {body_html: data, title: title, word_count: word_count}).then( (data) => {
        pendingActions.remove( action );
        editor_status_text.textContent = data.message;
        editor_status_text.style.color = "green";
    }).catch( (error) => console.error(error));
}

/* 
 ** CONFIGURE CKEDITOR
 */
let editor;

ClassicEditor.create(document.querySelector("#editor"), {
        toolbar: ['heading', '|', 'undo', 'redo', 'selectAll', '|', 'horizontalLine', 'bold', 'italic', 'alignment', 'link', 'bulletedList', 'numberedList', 'blockQuote','codeBlock','insertImage', 'sourceEditing'],
        ui: {
            viewportOffset: {
                top: 0
            }
        },
        alignment: {
            options: [ 'left', 'right', 'center', 'justify' ]
        },
        autosave: {
            waitingTime: 2000,
            save( editor ) {
                return saveData( editor.getData() );
            }
        },
        title: {
            placeholder: 'Page title (optional)'
        },
        placeholder: 'Page content',
        wordCount: {displayCharacters: true},
        list: {
            properties: {
                styles: true,
                startIndex: true,
                reversed: true
            }
        },
        htmlSupport: {
            allow: [
                {
                    name: /.*/,
                    attributes: true,
                    classes: true,
                    styles: true
                }
            ]
        },
        image: {
            insert: {
                type: 'auto',
                integrations: ['url']
            }
        }
    })
    .then( (newEditor) => {
        editor = newEditor;
        const wordCountPlugin = editor.plugins.get( 'WordCount' );
        const wordCountWrapper = document.getElementById( 'word-count' );
        wordCountWrapper.appendChild( wordCountPlugin.wordCountContainer );
        editor.editing.view.document.on( 'drop', ( evt, data ) => {
			// Stop execute next callbacks.
			evt.stop();
	
			// Stop the default event action.
			data.preventDefault();
		}, { priority: 'high' } );
	
		editor.editing.view.document.on( 'dragover', ( evt, data ) => {
			evt.stop();
			data.preventDefault();
		}, { priority: 'high' } );

        const toolbar = wrapper.querySelector(".ck-toolbar__items");
        toolbar.insertAdjacentHTML('afterend','<span id="editor-status"></span>');
        editor_status = "init";
        editor_status_text = wrapper.querySelector("#editor-status");
    })
    .catch(error => {
        console.error(error);
    });




if (window.location.hash === "#_=_"){
    history.replaceState 
        ? history.replaceState(null, null, window.location.href.split("#")[0])
        : window.location.hash = "";
}

const handleInputChange = (e) => {
    if (e.target.value && !e.target.classList.contains("clear-input--touched")) {
        e.target.classList.add("clear-input--touched")
    } else if (!e.target.value && e.target.classList.contains("clear-input--touched")) {
        e.target.classList.remove("clear-input--touched")
    }
}

/* 
 ** GET WEBSIITE OPTIONS
 */
const website_options = () => {
    execProcess( "website-options/"+gWebsiteId,"GET").then( (data) => {
        websiteContent.replaceChildren();
        websiteContent.insertAdjacentHTML('afterbegin',data.content);
        websiteContent.querySelectorAll("input,textarea").forEach((input) => {
            input.addEventListener("focus", handleInputChange);
            input.addEventListener("input", handleInputChange);
        });
        websiteDialog.showModal();
    });
}

/* 
 ** GET PAGE OPTIONS
 */
const page_options = () => {
    execProcess( "page-options/"+gWebsiteId+","+gArticleId,"GET").then( (data) => {
        pageContent.replaceChildren();
        pageContent.insertAdjacentHTML('afterbegin',data.content);
        pageDialog.showModal();
    });
}

/* 
 ** GET WEBSIITE VISITS
 */
const get_visits = (e) => {
    const websiteid = e.target.dataset.id ? e.target.dataset.id : gWebsiteId;
    execProcess( "visits/"+websiteid + "," + e.target.dataset.domain,"GET").then( (data) => {
        logContent.replaceChildren();
        logContent.insertAdjacentHTML('afterbegin',data.content);
        logDialog.showModal();
    });
}

/*
 **  NEW WEBSITE
 */
const new_website = () => {
    execProcess( "website/"+gWebsiteId,"POST").then( (data) => {
        const selected = websiteNav.querySelector("[data-id='"+gWebsiteId+"']");
        
        if (selected) {
            selected.querySelector("a.selected").classList.remove("selected");
            selected.insertAdjacentHTML('afterend',data.nav_label);
        } else {
            websiteNav.insertAdjacentHTML('afterbegin',data.nav_label);
        }

        gWebsiteId = data.website_id;
        editor_status = "init";
        editor_status_text.textContent = "";
        editor.setData("");
        galleryList.replaceChildren();
        website_options();
    });
};

/* 
 ** CREATE NEW WEBSIITE PAGE. INSERTED AFTER SELECTED PAGE
 */
const new_page = (e) => {
    execProcess( "article/"+gWebsiteId+","+gArticleId,"POST").then( (data) => {
        /* gArticleId points to currently selected page */
        const selected = pageNav.querySelector("[data-id='"+gArticleId+"']");
        
        if (selected) {
            selected.querySelector("a.selected").classList.remove("selected");
            selected.insertAdjacentHTML('afterend',data.nav_label);
        } else {
            pageNav.insertAdjacentHTML('afterbegin',data.nav_label);
        }

        gArticleId = data.article_id;
        editor_status = "init";
        editor_status_text.textContent = "";
        editor.setData("");
        galleryList.replaceChildren();
        page_options();
    });
}

/* 
 ** UPLOAD MEDIA TO CLOUDINARY
 */
const upload_media = () => {
    if (gArticleId===0) {
        popupOpen("CANT DO THAT YET","Click NEW PAGE first");
        return;
    }
    execProcess( "cld-details","GET").then( (data) => {
        widget.open();
        widget.update({tags: [gArticleId], cloudName: data.cloudname, api_key: data.apikey,  maxImageFileSize: data.maxImageFileSize, maxVideoFileSize: data.maxVideoFileSize});
    });
}

/* 
 ** ASSIGN "selected" CLASS TO CLICKED NAV ITEM
 */
const selected_nav = (nav, id) => {
    nav.querySelectorAll("a").forEach((link) => {
        link.classList.remove("selected");
        if (link.parentElement.dataset.id === id) {
            link.classList.add("selected");
        }
    });
}

/* 
 ** GET SELECTED ARTICLE CONTENT FOR RICH TEXT EDITOR 
 */
const edit_text = () => {
    execProcess( "article/"+gArticleId,"GET").then( (data) => {
        editor_status = "init";
        editor_status_text.textContent = data.updated_date;
        if (data.html) {
            editor.setData(data.html);
        } else {
            editor.setData("");
        }
        galleryList.replaceChildren();
        if (data.thumbnails) {
            galleryList.insertAdjacentHTML('afterbegin',data.thumbnails);
            lazyload();
        }
    });
}

/* 
 ** GET WEBSITE ARTICLE ASSETS TO OPEN IN CODEPEN
 */
const edit_codepen = () => {
    const form = wrapper.querySelector("[action='https://codepen.io/pen/define']");

    execProcess( "codepen/"+gArticleId,"GET").then( (data) => {
        let formdata = {
            title: data.domain_name,
            html: data.html,
            css: data.css,
            js: data.js
        };
        const input = form.querySelector("[name='data']");
        let JSONstring = JSON.stringify(formdata)
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&apos;");
        input.value = JSONstring;
        form.submit();
    });
}

/* 
 ** UPLOAD ZIPFILE EXPORTED TO LOCAL FILESYSTEM FROM CODEPEN
 */
const upload_codepen = async () => {
    const options = {
        types: [
        {
            description: "Zip",
            accept: {
            "application/zip": ".zip",
            }
        },
        ],
        excludeAcceptAllOption: true,
        startIn: "downloads",
    };

    let fileHandle;
 
    [fileHandle] = await window.showOpenFilePicker(options);
    
    const file = await fileHandle.getFile();

    execProcess( "content/"+gWebsiteId+","+gArticleId,"POST",file).then( (data) => {
        if (data.html_updated) {
            editor.setData(data.html_updated);
        }
        popupOpen("CODEPEN UPLOAD COMPLETED",data.message);
    });
}

/* 
 ** RESTORE ARTICLE CONTENT TO BEFORE LOGIN
 */
const restore_article = () => {
    execProcess( "restore-article/"+gArticleId,"PUT").then( () => {
        pageNav.querySelector("a.selected").click();
    });
}

/*
 ** DELETE MEDIA ASSET
 */
delete_asset = (e) => {
    const asset = e.target.closest("li");
    execProcess("dml","DELETE",{table_name: "asset", asset_id: asset.dataset.id}).then( () => {
        asset.remove();
    });
}

/*
 ** DELETE PAGE
 */
delete_page = () => {
    execProcess("dml","DELETE",{table_name: "website_article", website_id: gWebsiteId, article_id: gArticleId}).then( () => {
        let selected = pageNav.querySelector("[data-id='"+gArticleId+"']");
        /* selected points to page we just removed from database. Need to get next article in navigation  */
        if (selected.previousElementSibling) {
            gArticleId = selected.previousElementSibling.dataset.id;
        } else if (selected.nextElementSibling) {
            gArticleId = selected.nextElementSibling.dataset.id;
        } else {
            gArticleId = 0;
        }
        selected.remove();
        selected = pageNav.querySelector("[data-id='"+gArticleId+"']");
        if (selected) {
            selected.querySelector("a").classList.add("selected");
            edit_text();
        } else {
            editor_status = "init";
            editor_status_text.textContent = "";
            editor.setData("");
        }
        galleryList.replaceChildren();
        pageDialog.close();
    });
}

/*
 ** EXECUTE DELETE WEBSITE / WEBSITE_ARTICLE / ASSET / USER
 */
const delete_website = () => {
    console.log("before delete",gWebsiteId);
    execProcess("dml","DELETE",{table_name: "website", website_id: gWebsiteId}).then( () => {
        let selected = websiteNav.querySelector("[data-id='"+gWebsiteId+"']");
        /* selected points to website we just removed from database. Need to get next article in navigation  */
        if (selected.previousElementSibling) {
            gWebsiteId = selected.previousElementSibling.dataset.id;
        } else if (selected.nextElementSibling) {
            gWebsiteId = selected.nextElementSibling.dataset.id;
        } else {
            gWebsiteId = 0;
        }
        selected.remove();
        if (gWebsiteId === 0) {
            editor_status = "init";
            editor_status_text.textContent = "";
            editor.setData("");
        } else {
            websiteNav.querySelector("[data-id='"+gWebsiteId+"'] > a").click();
        }
        galleryList.replaceChildren();
        websiteDialog.close();
    });
}

/*
 ** EXECUTE DELETE WEBSITE / WEBSITE_ARTICLE / ASSET / USER
 */
const delete_user = () => {
    execProcess("dml","DELETE",{table_name: "users"}).then( (data) => {
        if (data.deleted===0) {
            document.querySelector(".signout").click();
        } else {
            popupOpen("Delete Websites", "To avoid inadvertent loss, you should delete your websites first");
        }
    });
}