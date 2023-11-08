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
      logDialog = document.querySelector("dialog.log"),
      logContent = logDialog.querySelector(".content"),
      website = document.querySelector("form.website"),
      domainName = website.querySelector("#domain_name"),
      domainNameResult = domainName.nextElementSibling.querySelector(".result"),
      contactEmail = website.querySelector("#contact_email"),
      newWebsite = website.querySelector(".new-website"),
      copyWebsite = website.querySelector(".copy-website"),
      deployButtons = website.querySelector(".deploy-buttons > div"),
      newContent = document.querySelector(".new-content"),
      cards = document.querySelector(".cards"),
      popup = document.querySelector("dialog.popup"),
      popupClose = popup.querySelector("button.close"),
      confirm = container.querySelector("dialog.delete-confirm"),
      confirmation = confirm.querySelector(".confirmation"),
      editorContainer = document.querySelector("div.editor"),
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

    if (e.target.id==="domain_name") {
        e.target.value = e.target.value.replace(/[^a-z0-9.]/gi, "");
    };

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

    execProcess("dml","PUT",{id:id,table_column:table_column,value:value}).then( (data) => {
        result.textContent = data.message;
        result.style.color = data.color;
        result.style.opacity = "1";
        if (data.website_id) {
            website.dataset.id = data.website_id;
            const inputs = website.elements;
            for (let i = 0; i < inputs.length; i++) {
                if (inputs[i].type === "textarea" || inputs[i].type === "radio") {
                    inputs[i].dataset.id = data.website_id;
                }
            }
            const li = e.target.previousElementSibling.querySelector(".dropdown-items .separator");
            li.insertAdjacentHTML('afterend',data.dropdown);
            newContent.disabled = false;
            copyWebsite.disabled = false;
        }
        if (data.deploy_buttons) {
            deployButtons.replaceChildren();
            deployButtons.insertAdjacentHTML('afterbegin',data.deploy_buttons);
        }
    });
}

/*
 **  RESET PAGE ELEMENTS WHEN USER CLICKS NEW OR DELETE WEBSITE
 */
const resetWebsite = () => {
    website.dataset.id = "";
    const inputs = website.elements;
    for (let i = 0; i < inputs.length; i++) {
        if (inputs[i].type === "textarea") {
            inputs[i].dataset.id = "";
            inputs[i].value = "";
            const maxchars = inputs[i].getAttribute("maxlength"),
                  result = inputs[i].nextElementSibling.querySelector(".result"),
                  charcounter = inputs[i].nextElementSibling.querySelector(".charcounter");
            charcounter.textContent = "0/" + maxchars;
            result.textContent = "";
        } else if (inputs[i].type === "radio") {
            inputs[i].dataset.id = "";
            inputs[i].checked = false;
            const result = inputs[i].closest(".radio-wrapper").querySelector(".result");
            result.textContent = "";
        }
    }
    cards.querySelectorAll(".card").forEach((card) => {
        card.classList.add("fade-out");
    });
}

/*
 **  NEW WEBSITE
 */
newWebsite.addEventListener("click",  () => {
    resetWebsite();
    
    setTimeout( () => {
        cards.replaceChildren();
        domainName.focus();
    },1000);
});

/*
 **  COPY WEBSITE
 */
copyWebsite.addEventListener("click",  () => {
    const websiteId = website.dataset.id;
    execProcess( "website/"+websiteId,"POST").then( (data) => {
        domainName.value = data.domain_name;
        
        website.querySelectorAll("[data-id]").forEach((item) => {
            item.dataset.id=data.website_id;
        });        
        
        cards.querySelectorAll("[data-id*=',']").forEach((item) => {
            const original_id = item.dataset.id;
            item.dataset.id=original_id.replace(websiteId+",",data.website_id+",");
        });

        website.dataset.id=data.website_id;
        
        domainNameResult.style.opacity = "1";
        domainNameResult.textContent = "WEBSITE COPIED";
        //domain_name.focus();
    });
});

/*
 **  NEW CONTENT
 */
newContent.addEventListener("click",  () => {
    gArticleId = 0;
    editor.setData("");
    editor_status = "init";
    editor_status_text.textContent = "";
    editorContainer.style.display = "block";
});

/*
 **  EDIT WEBSITE
 */
const edit_website = (e) => {
    execProcess( "website/"+e.target.dataset.id,"GET").then( (data) => {
        resetWebsite();
        
        website.dataset.id = e.target.dataset.id;
        const inputs = website.elements;
        for (let i = 0; i < inputs.length; i++) {
            if (inputs[i].type === "textarea" || inputs[i].type === "radio") {
                inputs[i].dataset.id = e.target.dataset.id;
            }
        }

        domainName.value = data.domain_name;
        contactEmail.value = data.contact_email ? data.contact_email : "";

        for (let i = 0; i < inputs.length; i++) {
            if (inputs[i].type === "textarea") {
                inputs[i].nextElementSibling.querySelector(".charcounter").textContent = inputs[i].value.length + "/" + inputs[i].getAttribute("maxlength");
            }
        }

        if (data.template) {
            document.getElementById(data.template).checked = true;
        }
        deployButtons.replaceChildren();
        deployButtons.insertAdjacentHTML('afterbegin',data.deploy_buttons);

        newContent.disabled = false;

        cards.replaceChildren();
        if (data.cards) {
            cards.insertAdjacentHTML('afterbegin',data.cards);
            lazyload();
        }
    });
};

/* 
 ** DEPLOY WEBSITE - template must be selected
 */
const deploy_website = (e) => {

    if (!domainName.value) {
        domainNameResult.textContent = "MUST HAVE A DOMAIN NAME";
        domainNameResult.style.opacity = "1";
        domainNameResult.style.color = "red";
        return;
    }

    const template = website.querySelector("[name='template']:checked");
    if (!template) {
        let templateResult = website.querySelector("[name='template']").closest("fieldset").nextElementSibling.querySelector(".result");
        templateResult.textContent = "SELECT TEMPLATE FOR DEPLOYMENT";
        templateResult.style.opacity = "1";
        templateResult.style.color = "red";
        return;
    }
 
    execProcess("deploy","POST",{"websiteid":website.dataset.id,"siteid":e.target.dataset.site_id}).then( () => {
        popupOpen("Building "+e.target.textContent,"Checking content...");
        if (gIntervalId) {
            clearInterval(gIntervalId);
        }
        gIntervalId = setInterval(updateDeploymentStatus,3000,website.dataset.id, e.target.dataset.site_id);
    });
};

updateDeploymentStatus = (websiteid, siteid) => {
    const status = popup.querySelector("p");
    execProcess("deploy-status/"+websiteid,"PUT",{"site_id":siteid}).then( (data) => {
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
 **  CONTENT VIEW OPTIONS
 */
document.querySelectorAll("button.view-option").forEach((button) => {
    button.addEventListener("click",  (e) => {
        execProcess( "website-list/"+website.dataset.id + "?view="+e.target.dataset.view,"GET").then( (data) => {
            cards.replaceChildren();
            cards.insertAdjacentHTML('afterbegin',data.content);
            cards.querySelectorAll("textarea").forEach( (textarea,indx) => {
                if (e.target.dataset.view==="nav" && indx===0) return;
                if (!textarea.value) {
                    const result = textarea.nextElementSibling.querySelector(".result");
                    result.textContent = "MUST HAVE A VALUE";
                    result.style.opacity = "1";
                    result.style.color = "red";
                }
            });
        });
    });
});

/*
**  CLOSE EDITOR 
*/
document.querySelector("button.close-editor").addEventListener("click", (e) => {
    editorContainer.style.display = "none";
});

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

    if (!website.dataset.id) {
        website.querySelector(".new-website").click();
        popupOpen("WELCOME","Enter Domain name. Choose template. Create content. Deploy.");
    }

    lazyload();
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
                const data = await response.json();
                popupOpen(data.action, data.cause);
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
        lazyload();
        gArticleId = articleId;
    });
};

/*
 ** CARD CLICK HANDLER
 */
const cardHandler = (e) => {

    let open = e.target.matches(".show-dropdown") && e.target.nextElementSibling.classList.contains("visible");

    document.querySelectorAll(".dropdown-items.visible").forEach((dropdown) => {
        dropdown.classList.toggle("visible",false);
    });
    
    if (!open && e.target.matches(".show-dropdown")) {
        e.target.nextElementSibling.classList.toggle("visible");
    }

    const card = e.srcElement.closest(".card");
    let id;

    if (card) {
        id = card.dataset.id;
    } else {
        id = website.dataset.id;
    }

    if (e.target.matches(".show-gallery")) {
        show_gallery(id);                                
    } else if (e.target.matches(".delete")) {
        delete_object(id, e);
    } else if (e.target.matches(".confirmation")) {
        delete_object_confirm(e);
    } else if (e.target.matches(".upload-media")) {
        upload_media(id);
    } else if (e.target.matches(".edit-text")) {
        edit_text(id,e.srcElement);          
    } else if (e.target.matches(".publish")) {
        publish_article(id, e.srcElement);  
    } else if (e.target.matches(".unpublish")) {
        unpublish_article(id, e.srcElement);                                                             
    } else if (e.target.matches(".fullscreen")) {
        showFullScreen(e);                                 
    } else if (e.target.matches(".edit-website")) {
        edit_website(e);
    } else if (e.target.matches(".deploy-website")) {
        deploy_website(e);
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
        //console.log("data",data);
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
                    newArticle = true;
                }
                let nomedia = li.querySelector("button.no-media.upload-media");
                if (nomedia) {
                    const img = document.createElement("img");
                    img.src = data.imgurl;
                    img.classList.add("show-gallery");
                    nomedia.replaceWith(img);
                }
                li.querySelector(".nb-assets").textContent = data.nbAssets;
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
 ** ENABLE DRAG AND DROP OF WEBSITE ARTICLES TO RE-ORDER
 */

new Sortable(cards, {
    animation: 150,
    ghostClass: 'drag-in-progress',
    store: {
        set: async function (sortable) {
            execProcess("website-list/" + website.dataset.id, "PUT", {dbid_string: sortable.toArray().join(":")} ).then( () => {
                console.log("cards reordered");
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

const sessionLog = document.querySelector(".session-log");
sessionLog.addEventListener('click',  () => {
    execProcess("log/"+apex_session,"GET").then( (data) => {
        logContent.replaceChildren();
        logContent.insertAdjacentHTML('afterbegin',data.content);
        logDialog.showModal();
    });
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

    editor_status_text.textContent = "Saving content ... ";
    const word_count = document.querySelector(".ck-word-count__words").textContent;
    
    const title = document.querySelector(".ck > h1").textContent;
    await execProcess("article/"+gArticleId, "PUT",  {website_id: website.dataset.id, edit_text: data, title: title, word_count: word_count}).then( (data) => {
        pendingActions.remove( action );
        editor_status_text.textContent = "Saved " + data.words;
        if (gArticleId === 0) {
            gArticleId = data.articleId;
            cards.insertAdjacentHTML('afterbegin',data.new_card);
        }
    }).catch( (error) => console.error(error));
}


let editor;

ClassicEditor.create(document.querySelector("#editor"), {
        toolbar: [ 'heading', '|', 'undo', 'redo', 'selectAll', '|', 'horizontalLine', 'bold', 'italic', 'link', 'bulletedList', 'numberedList', 'blockQuote','insertImage','codeBlock','style', ],
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
        wordCount: {displayCharacters: false},
        list: {
            properties: {
                styles: true,
                startIndex: true,
                reversed: true
            }
        },
        style: {
            definitions: [
                {
                    name: 'Enclosed list item',
                    element: 'li',
                    classes: [ 'with-border' ]
                },
            ]
        }
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


if (window.location.hash === "#_=_"){
    history.replaceState 
        ? history.replaceState(null, null, window.location.href.split("#")[0])
        : window.location.hash = "";
}


/* 
 ** UPLOAD MEDIA TO CLOUDINARY
 */
const upload_media = (articleId) => {
    if (!website.dataset.id) {
        popupOpen("CANT DO THAT YET","Need a Domain Name");
        return;
    }
    execProcess( "cld-details","GET").then( (data) => {
        widget.open();
        widget.update({tags: [articleId], cloudName: data.cloudname, api_key: data.apikey,  maxImageFileSize: data.maxImageFileSize, maxVideoFileSize: data.maxVideoFileSize});
    });
}

/* 
 ** GET CONTENT FOR RICH TEXT EDITOR 
 */
//const editorDialog = document.querySelector("dialog.editor");


const edit_text = (articleId,button) => {
    const pendingActions = editor.plugins.get( 'PendingActions' );
    if ( pendingActions.hasAny ) {
        return;
    }
    execProcess( "article/"+articleId,"GET").then( (data) => {
        gArticleId = articleId;
        editor_status = "init";
        editor_status_text.textContent = "";
        if (data.content) {
            editor.setData(data.content);
        } else {
            editor.setData("");
        }
        editorContainer.style.display = "block";
    });
}

/*
**  REMOVE CARD FROM DOM
*/
const remove_card = (articleId) => {
    let li = document.querySelector("[data-id='" + articleId + "']");
    li.replaceChildren();
    li.remove();
}

/*
 ** DELETE WEBSITE / WEBSITE_ARTICLE / ASSET / USER - REQUIRES CONFIRMATION
 */
const delete_object = (id, e) => {
    confirmation.dataset.table = e.target.dataset.table;
    confirm.querySelector("h2").textContent = e.target.dataset.table;
    if (id) {
        confirm.querySelector("p").textContent = id;
        confirmation.dataset.id = id;
    } else {
        confirm.querySelector("p").textContent = e.target.dataset.id;
        confirmation.dataset.id = e.target.dataset.id;
    }
    confirm.showModal();
}

const delete_object_confirm = (e) => {
    let pk={};
    pk.table_name = e.target.dataset.table;
    if (pk.table_name === "website_article") {
        pk.article_id = e.target.dataset.id;
        pk.website_id = website.dataset.id;
    } else {
        pk.id = e.target.dataset.id;
    }

    execProcess("dml","DELETE",pk).then( () => {
        let ele;
        switch (pk.table_name) {
            case "website_article":
                ele = cards.querySelector("[data-id='" + pk.article_id + "']");
                ele.classList.add("fade-out");
                break;
            case "asset":
                ele = gallery.querySelector("[data-id='" + pk.id + "']");
                ele.classList.add("fade-out");
                break;
            case "website":
                ele = website.querySelector("[data-id='" + pk.id + "']");
                resetWebsite();
                setTimeout( () => {
                    cards.replaceChildren();
                    domainNameResult.style.opacity = "1";
                    domainNameResult.style.color = "green";
                    domainNameResult.textContent = "WEBSITE DELETED OK";
                    deployButtons.replaceChildren();
                    newContent.disabled = true;
                },1000);
                break;                    
        }
        ele.remove();
    });
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
