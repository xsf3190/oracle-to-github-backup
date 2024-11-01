let gWebsiteId = 0,
    gArticleId = 0,
    gWebsiteEnv,
    gWebsiteDemo,
    gFullImage,
    gIntervalId,
    gExpiredSession = false;

const apex_app_id = document.querySelector("#pFlowId").value,
      apex_page_id = document.querySelector("#pFlowStepId").value,
      apex_session = document.querySelector("#pInstance").value,
      nb_websites = document.querySelector("#nb-websites").value,
      wrapper = document.querySelector(".wrapper"),
      logDialog = document.querySelector("dialog.log"),
      logContent = logDialog.querySelector(".content"),
      websiteNav = wrapper.querySelector(".website-nav"),
      pageNav = wrapper.querySelector(".page-nav"),
      popup = document.querySelector("dialog.popup"),
      popupClose = popup.querySelector("button.close"),
      galleryList = wrapper.querySelector(".gallery-list"),
      galleryFull = wrapper.querySelector(".gallery-overlay"),
      galleryFullImg = galleryFull.querySelector("img"),
      galleryFullCounter = galleryFull.querySelector("span.counter"),
      galleryFullClose = galleryFull.querySelector("button.close-fullscreen"),
      galleryFullPrev = galleryFull.querySelector("button.prev"),
      galleryFullNext = galleryFull.querySelector("button.next");

/*
**  TRY TO PREVENT "LEAVE SITE - SAVE CHANGES" MESSAGE ON AUTOMATIC LOGOUT
*/
window.addEventListener('beforeunload', function (event) {
    event.stopImmediatePropagation();
});

/*
**  ENABLE USER TO CLEAR TEXT CONTENT
*/
const clearInput = (e) => {
    if (e.target.tagName == "TEXTAREA" || e.target.tagName == "INPUT") {
        if (e.target.value && !e.target.classList.contains("clear-input--touched")) {
            e.target.classList.add("clear-input--touched")
        } else if (!e.target.value && e.target.classList.contains("clear-input--touched")) {
            e.target.classList.remove("clear-input--touched")
        }
    }
}

/*
**  COUNT CHARACTER ENTERED IN TEXT FIELDS
*/
const inputHandler = (e) => {
    if (e.target.matches(".fluid")) return;

    clearInput(e);

    const counter = e.target.parentElement.querySelector(".charcounter");
    if (!counter) return;

    if (e.target.tagName !== "TEXTAREA" && e.target.tagName !== "INPUT") return;

    if (e.target.id==="domain_name") {
        e.target.value = e.target.value.replace(/[^a-z0-9.]/gi, "");
    };

    const maxchars = e.target.getAttribute("maxlength");
    
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
    if (e.target.matches(".fluid")) return;

    clearInput(e);

    let result;
    if (e.target.tagName == "TEXTAREA" || e.target.tagName == "INPUT" || e.target.tagName == "SELECT") {
        result = e.target.parentElement.querySelector(".result");
    } else if (e.target.tagName == "INPUT" && e.target.type == "radio") {
        result = e.target.closest("fieldset").nextElementSibling.querySelector(".result");
    }
    if (result) {
        result.textContent = "";
        result.style.opacity = "0";
    }
}

/*
**  HANDLE FORM FIELD CHANGE. UPDATE DATABASE IF PASSES ANY VALIDATION CHECK
*/
const changeHandler = (e) => {
    if (e.target.matches(".page-nav") || e.target.matches(".dropdown-items")) return; /* Ignore custom events raised by sorted.js */

    if (e.target.matches(".color")) {
        websiteColors(e.target.id, e.target.value);
        return;
    }

    if (e.target.matches(".fluid")) {
        websiteFontSize(e.target.id, e.target.value);
        return;
    }

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

        if (data.color==="red") return;

        /* Update UI if domain name or navigation label are changed */

        switch (table_column) {
            case 'website_article.navigation_label' :
                if (data.new_article_id) {
                    gArticleId = data.new_article_id;
                    pageNav.insertAdjacentHTML('beforeend',data.nav_label);
                    pageNav.querySelector("[data-id='"+data.new_article_id+"'] > a").click();
                } else {
                    pageNav.querySelector("[data-id='"+gArticleId+"'] > a").textContent = value;
                }
                break;
            case 'website.domain_name' :
                websiteNav.querySelectorAll(".edit-website[data-id='"+data.websiteid+"']").forEach ((item) => {
                    item.parentElement.remove();
                })
                if (websiteNav.querySelector("hr + hr")) {
                    websiteNav.querySelector("hr + hr").remove();
                }
                if (data.message==="Created OK") {
                    pageNav.replaceChildren();
                    galleryList.replaceChildren();
                }
                websiteNav.querySelector(".dropdown-items").insertAdjacentHTML('afterbegin',data.dropdown);
                websiteNav.querySelector(".edit-website[data-id='"+data.websiteid+"']").click();
                if (websiteNav.querySelector(".dropdown-items").childElementCount>1) {
                    websiteNav.querySelector(".show-dropdown").style.display = "block";
                }
                break;
            case 'website.font' :
                websiteFont(data.font_family, data.font_url);
                break;
        }
    });
}

/*
 **  EDIT WEBSITE
 */
const edit_website = (e) => {
    gWebsiteId = e.target.dataset.id;
    gWebsiteEnv = e.target.dataset.env;

    const env = e.target.querySelector("span").textContent;
    const domain = e.target.dataset.domain;
    const selected = websiteNav.querySelector(".selected");

    let url = "https://" + domain;
    
    if (env==="TEST") {
        url = url.replace(".","-")  +  ".netlify.app";
    }

    selected.textContent = domain;
    selected.href = url;

    websiteNav.querySelector(".deploy-website > span").textContent = env;
    websiteNav.querySelector(".visits > span").textContent = env;
    websiteNav.querySelector(".performance > span").textContent = env;

    websiteNav.querySelector("a").style.textDecorationLine = "revert";

    execProcess( "website/"+gWebsiteId,"GET").then( (data) => {
        pageNav.replaceChildren();
        if (data.nav_labels) {
            pageNav.insertAdjacentHTML('afterbegin',data.nav_labels);
        }
        galleryList.replaceChildren();

        editor_status = "init";
        editor_status_text.textContent = "";
        editor.setData("");
        if (!editor.isReadOnly) {
            editor.enableReadOnlyMode( 'lock-id' );
        }
    });
};

/* 
 ** DEPLOY WEBSITE
 */
const deploy_website = (e) => { 
    const pages = pageNav.querySelectorAll("div[data-id]"),
          list = Array.from(pages, (page) => page.dataset.id);

    if (list.length===0) return;

    execProcess("deploy","POST",{"websiteid":gWebsiteId,"env":gWebsiteEnv,"list":list.join(":")}).then( (data) => {
        logContent.replaceChildren();
        logContent.insertAdjacentHTML('afterbegin',data.content);
        logDialog.showModal();
        if (data.stop) return;
        if (gIntervalId) {
            clearInterval(gIntervalId);
        }
        gIntervalId = setInterval(getDeploymentStatus,2000,gWebsiteId, gWebsiteEnv);
    });
};

/* 
 ** CANCEL DEPLOYMENT
 */
const cancel_deploy = (e) => { 
    const site_id = e.target.dataset.site_id;
    if (!site_id) return;
    execProcess("deploy-status/"+websiteid+","+siteid,"DELETE").then( (data) => {
        if (data.content) {
            logContent.querySelector("ol.deploy").insertAdjacentHTML('beforeend',data.content);
        }
        if (data.completed) {
            clearInterval(gIntervalId);
        }
    });
};

getDeploymentStatus = (websiteid, env) => {
    execProcess("deploy-status/"+websiteid+","+env,"GET").then( (data) => {
        if (data.content) {
            logContent.querySelector("ol.deploy").insertAdjacentHTML('beforeend',data.content);
        }
        if (data.completed) {
            clearInterval(gIntervalId);
            const a = websiteNav.querySelector("a"),
                  domain = a.textContent;
                  
            if (!a.hasAttribute("href")) {
                if (env==="TEST") {
                    a.href = "https://" + domain + ".netlify.app";
                } else {
                    a.href = "https://" + domain;
                }
            }
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
    console.log("apex_app_id",apex_app_id);
    console.log("apex_page_id",apex_page_id);
    console.log("apex_session",apex_session);

    if (navigator.maxTouchPoints > 1) {
        wrapper.addEventListener("touchstart",clickHandler);
    } else {
        wrapper.addEventListener("click",clickHandler);
    }
    logContent.addEventListener("input",inputHandler);
    logContent.addEventListener("focusin",focusHandler);
    logContent.addEventListener("change",changeHandler);
    
    gWebsiteId = websiteNav.dataset.id;
    gWebsiteEnv = websiteNav.dataset.env;
    gNetlifySiteId = websiteNav.querySelector(".deploy-website").dataset.site_id;

    if (nb_websites==="0") {
        console.log("NEW USER");
        pageNav.querySelector(".nav-label").click();
    }
    /*
    if (checkPerformance()) {
        const observer = new PerformanceObserver(perfObserver);
        observer.observe({ type: "resource", buffered: true });
    }*/
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
        
        /*
        if (!wrapper.querySelector(".ck-source-editing-button").matches(".ck-off")) {
            popupOpen("Click Source button",".. cannot switch pages when in Source editing mode");
            return;
        }
        */
        const id = e.target.parentElement.dataset.id,
              nav = e.target.closest("nav");
        
        /* Don't set "selected" class on Blog and Media drowdown items */
        if (!e.target.classList.contains("subpage")) {
            selected_nav(nav,id);
        }

        if (nav.matches(".page-nav")) {
            gArticleId = id;
            edit_text(e);
        }
    } else if (e.target.matches(".api-keys")) {
        api_keys(e); 
    } else if (e.target.matches(".account-usage")) {
        account_usage(e); 
    } else if (e.target.matches(".edit-website")) {
        edit_website(e); 
    } else if (e.target.matches(".go-live")) {
        go_live(); 
    } else if (e.target.matches(".visits")) {
        get_visits(e); 
    } else if (e.target.matches(".more-visits")) {
        more_visits(e); 
    } else if (e.target.matches(".performance")) {
        get_performance(e); 
    } else if (e.target.matches(".clear-input")) {
        clear_input(e); 
    } else if (e.target.matches(".new-website")) {
        new_website(); 
    } else if (e.target.matches(".website-options")) {
        website_options();
    } else if (e.target.matches(".use_eyedropper")) {
        eye_dropper(e);
    } else if (e.target.matches(".save-fluid-types")) {
        save_fluid_types(e);
    } else if (e.target.matches(".save-colors")) {
        save_colors(e);
    } else if (e.target.matches(".media-options")) {
        media_options(e);
    } else if (e.target.matches(".page-options")) {
        page_options();
    } else if (e.target.matches(".new-page")) {
        new_page(e);   
    } else if (e.target.matches(".new-blog")) {
        new_collection(e);   
    } else if (e.target.matches(".new-media")) {
        new_collection(e);     
    }  else if (e.target.matches(".new-product")) {
        new_collection(e);     
    } else if (e.target.matches(".show-subpages")) {
        show_subpages(e);   
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
    } else if (e.target.matches(".delete-article")) {
        delete_article(e);   
    } else if (e.target.matches(".delete-website")) {
        delete_website();
    } else if (e.target.matches(".delete-media")) {
        delete_media(e);
    } else if (e.target.matches(".delete-user")) {
        delete_user();
    } else if (e.target.matches(".expand")) {
        showFullScreen(e);                                 
    } else if (e.target.matches(".copy-url")) {
        copy_url(e); 
    } else if (e.target.matches(".copy-html")) {
        copy_html(e);             
    } else if (e.target.matches(".deploy-website")) {
        deploy_website(e);
    } else if (e.target.matches(".cancel-deploy")) {
        cancel_deploy(e);
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
    const color = await eyeDropper.open();
    if (color.sRGBHex) {
        const ele = e.target.parentElement.nextElementSibling;
        ele.value = color.sRGBHex;
        websiteColors(ele.id, color.sRGBHex);
    }
};

/*
**  SAVE FLUID TYPE PARAMETERS TO DATABASE
*/
const save_fluid_types = () => {
    ['min_font_size','min_width_px','min_scale','max_font_size','max_width_px','max_scale'].forEach(type => {
        const ele = document.getElementById(type);
        const result = ele.parentElement.querySelector(".result");

        execProcess("dml","PUT",{id:ele.dataset.id, table_column:ele.dataset.column, value:ele.value}).then( (data) => {
            result.textContent = data.message;
            result.style.color = data.color;
            result.style.opacity = "1";
        });
    });
}

/*
**  SAVE VALID COLORS TO DATABASE - NOTE THAT COMMON CHANGE HANDLER DOES NOT APPLY BECAUSE OF CONTRAST CHECK TEXT/BACKGROUND
*/
const save_colors = () => {
    let valid = true;
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    let contrast1, contrast2;

    const luminance = (r, g, b) => {
        const a = [r, g, b].map(function (v) {
            v /= 255;
            return v <= 0.03928 ? v / 12.92 : Math.pow( (v + 0.055) / 1.055, 2.4 );
        });
        return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
    }

    ['color_text','color_background','color_primary'].forEach(id => {
        const ele = document.getElementById(id);
        const value = ele.value.replace(shorthandRegex, function(m, r, g, b) {
            return r + r + g + g + b + b;
        });
        const arr = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(value);
        const result = ele.parentElement.querySelector(".result");
        if (arr) {
            result.textContent = "";
            if (id==="color_text") {
                contrast1=arr;
            } else if (id==="color_background") {
                contrast2=arr;
            }
        } else {
            valid = false;
            result.textContent = "INVALID COLOR";
            result.style.color = "red";
            result.style.opacity = "1";
        }
    });

    if (!valid) return;

    /* Calculate WCAG color contract ratio */
    const luminance1 = luminance(parseInt(contrast1[1], 16), parseInt(contrast1[2], 16), parseInt(contrast1[3], 16)),
          luminance2 = luminance(parseInt(contrast2[1], 16), parseInt(contrast2[2], 16), parseInt(contrast2[3], 16)),
          ratio = luminance1 > luminance2 ? ((luminance2 + 0.05) / (luminance1 + 0.05)) : ((luminance1 + 0.05) / (luminance2 + 0.05));

    let rating;

    if (ratio < 1/7) {
        rating = "AAA PASS";
    } 
    else if (ratio < 1/4.5) {
        rating = "AA PASS";
    } else {
        rating = "CONTRAST FAIL";
        valid = false;
    }

    ['color_text','color_background'].forEach(id => {
        const ele = document.getElementById(id);
        const result = ele.parentElement.querySelector(".result");
        result.textContent = rating;
        result.style.opacity = "1";
        result.style.color = valid ? "green" : "red";
    });

    if (!valid) return;

    /* All colors valid - update database */

    ['color_text','color_background','color_primary'].forEach(color => {
        const ele = document.getElementById(color);
        const result = ele.parentElement.querySelector(".result");

        execProcess("dml","PUT",{id:ele.dataset.id, table_column:ele.dataset.column, value:ele.value}).then( (data) => {
            result.textContent = color==="color_primary" ? data.message : data.message + " - " + rating;
            result.style.color = data.color;
            result.style.opacity = "1";
        });
    });
}

/*
 **  COPY URL
 */
const copy_url = async (e) => {
    const src = e.target.closest("figure").querySelector("img").src;
    try {
        await navigator.clipboard.writeText(src);
        const result = e.target.nextSibling;
        result.innerHTML = "COPIED &#10004;";
        result.style.color = "green";
        result.style.margin = "1em";
    } catch (err) {
        popupOpen('Failed to copy URL!', err)
    }
};

/*
 **  COPY HTML SNIPPET TO INCLuDE FEATURED SUB-ARTICLES
 */
const copy_html = async (e) => {
    const html = '<article class="featured full-width" data-id="' + gArticleId + '"></article>';
    try {
        await navigator.clipboard.writeText(html);
        const result = e.target.nextSibling;
        result.innerHTML = "COPIED &#10004;";
        result.style.color = "green";
        result.style.margin = "1em";
        result.style.opacity = "1";
    } catch (err) {
        popupOpen('Failed to copy HTML!', err)
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

    const widths = img.dataset.dimensions.split(':');

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
            "unsplash",
            "shutterstock"
        ],
        defaultSource: "local",
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
                        "website_id": gWebsiteId,
                        "article_id": item.uploadInfo.tags[0]
                    });
                }
            });
            execProcess("cld-upload","POST",metadata).then( (data) => {
                galleryList.replaceChildren();
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
            execProcess("reorder/" + gArticleId, "PUT", {table_name: "asset", dbid_string: sortable.toArray().join(":")} ).then( (data) => {
                console.log("article assets sorted!");
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
            execProcess("reorder/" + gWebsiteId, "PUT", {table_name: "website_article", dbid_string: sortable.toArray().join(":")} ).then( () => {
                console.log("website pages reordered");
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
 ** API KEYS AND SECRETS
 */
const api_keys = () => {
    execProcess( "keys","GET").then( (data) => {
        logContent.replaceChildren();
        logContent.insertAdjacentHTML('afterbegin',data.content);
        logDialog.showModal();
    });
};

/*
 ** ACCOUNT USAAGE
 */
const account_usage = () => {
    execProcess( "usage","GET").then( (data) => {
        logContent.replaceChildren();
        logContent.insertAdjacentHTML('afterbegin',data.content);
        logDialog.showModal();
    });
};

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
    const content = document.querySelectorAll(".ck-editor__editable_inline > :is(h2,h3,h4,p,blockquote,ol,ul):nth-child(-n+4):not(:empty)");
    
    let title, excerpt;
    if (content.length>0) {
        title = content[0].textContent;
        for (let i=1; i < content.length; i++) {
            if (content[i].tagName.substring(0,1) != "H") {
                excerpt = content[i].textContent;
                let period = excerpt.indexOf(".");
                if (period>1) {
                    excerpt = excerpt.substring(0,period);
                }
                break;
            }
        }
    }

    await execProcess("article/"+gArticleId, "PUT",  {body_html: data, title: title, excerpt: excerpt, word_count: word_count}).then( (data) => {
        pendingActions.remove( action );
        editor_status_text.textContent = data.message;
        editor_status_text.style.color = "green";
    }).catch( (error) => console.error(error));
}

/* 
 ** CONFIGURE CKEDITOR
 */
let editor;


/*
 ** SET FONT FOR WEBSIITE DEMO
 */
const websiteFont = (font_family, font_url) => {
    const fontFile = new FontFace(font_family,font_url);
    document.fonts.add(fontFile);
    fontFile.load();
    document.fonts.ready.then(()=>{
        console.log("font " + font_family + " loaded");
        gWebsiteDemo.style.setProperty("--font-family",font_family);
        gWebsiteDemo.querySelector("h1").textContent = `${font_family}`;
        gWebsiteDemo.querySelector("h2").textContent = "heading2";
        gWebsiteDemo.querySelector("h3").textContent = "heading3";
        gWebsiteDemo.querySelector("p").textContent = "paragraph";
    });
}

/*
 ** SET FONT SIZE FOR WEBSIITE DEMO
 */
const websiteFontSize = (id, value) => {
    const min_font_size = document.getElementById("min_font_size").value,
          min_width_px = document.getElementById("min_width_px").value,
          min_scale = document.getElementById("min_scale").value,
          max_font_size = document.getElementById("max_font_size").value,
          max_width_px = document.getElementById("max_width_px").value,
          max_scale = document.getElementById("max_scale").value;

    const minWidth = min_width_px / 16;
    const maxWidth = max_width_px / 16;
    const round = (number, decimals=10000) => {
        return Math.round(number * decimals) / decimals;
    }

    for (let i=-2; i<6; i++) {
        let minFont,maxFont;
        if (i<0) {
            minFont = min_font_size/(min_scale**Math.abs(i));
            maxFont = max_font_size/(max_scale**Math.abs(i));
        } else {
            minFont = min_font_size*(min_scale**i); 
            maxFont = max_font_size*(max_scale**i);
        }
        const slope = (maxFont - minFont) / (maxWidth - minWidth);
        const yAxisIntersection = -minWidth * slope + minFont;
        const clamp = `clamp(${round(minFont)}rem,${round(yAxisIntersection)}rem + ${round(slope * 100)}cqi,${round(maxFont)}rem)`;
        gWebsiteDemo.style.setProperty("--step-" + i, clamp);
    }
}

/* 
 ** SET COLORS FOR WEBSIITE DEMO
 */
const websiteColors = (color, value) => {
    switch (color) {
        case 'color_text' :
            gWebsiteDemo.style.setProperty("--color", value);
            break;
        case 'color_background' :
            gWebsiteDemo.style.setProperty("--background", value);
            break;
        case 'color_primary' :
            gWebsiteDemo.style.setProperty("--background-primary", value);
            break;
    }
}


const resize = () => {
    const span = gWebsiteDemo.querySelector("span");
    span.textContent = gWebsiteDemo.offsetWidth + "px";
}

/* 
 ** GET WEBSIITE OPTIONS
 */
const website_options = () => {
    if (gWebsiteId===0) return;
    execProcess( "website-options/"+gWebsiteId+","+gWebsiteEnv,"GET").then( (data) => {
        logContent.replaceChildren();
        logContent.insertAdjacentHTML('afterbegin',data.content);
        logDialog.showModal();
        gWebsiteDemo = logContent.querySelector(".demo-container");
        websiteFont(data.font_family, data.font_url);
        data.fluid_types.forEach((obj) => {
            gWebsiteDemo.style.setProperty(obj.property,obj.value);
        })

        websiteColors("color_text",data.color_text);
        websiteColors("color_background",data.color_background);
        websiteColors("color_primary",data.color_primary);

        resize();
        new ResizeObserver(resize).observe(gWebsiteDemo);
    });
}

/* 
 ** GET MEDIA OPTIONS
 */
const media_options = (e) => {
    execProcess( "media-options/"+e.target.closest("li").dataset.id,"GET").then( (data) => {
        logContent.replaceChildren();
        logContent.insertAdjacentHTML('afterbegin',data.content);
        logDialog.showModal();
    });
}

/* 
 ** GET PAGE OPTIONS
 */
const page_options = (e) => {
    execProcess( "page-options/"+gWebsiteId+","+gArticleId,"GET").then( (data) => {
        logContent.replaceChildren();
        logContent.insertAdjacentHTML('afterbegin',data.content);
        logDialog.showModal();
    });
}

/* 
 ** GO LIVE
 */
const go_live = () => {
    execProcess( "website/"+gWebsiteId,"PUT").then( (data) => {
        if (data.message) {
            popupOpen("ERROR REQUESTING GO-LIVE", data.message);
            return;
        }
        websiteNav.querySelectorAll(".edit-website[data-id='"+gWebsiteId+"']").forEach ((item) => {
            item.parentElement.remove();
        });
        websiteNav.querySelector(".dropdown-items").insertAdjacentHTML('afterbegin',data.dropdown);
        popupOpen("ADD FOLLOWING DNS SERVERS FOR YOUR DOMAIN", data.dns_servers);
    });
}

/* 
 ** GET WEBSIITE VISITS
 */
const get_visits = (e) => {
    execProcess( "visits/"+gWebsiteId+","+gWebsiteEnv,"GET").then( (data) => {
        logContent.replaceChildren();
        logContent.insertAdjacentHTML('afterbegin',data.content);
        logDialog.showModal();
    });
}

/* 
 ** GET MORE WEBSIITE VISITS
 */
const more_visits = (e) => {
    const next = Number(e.target.dataset.offset)+Number(e.target.dataset.rows);
    const total =  e.target.dataset.total;
    const tbody = e.target.closest("p").previousElementSibling.querySelector("tbody");
    const span = e.target.previousElementSibling;

    execProcess( "visits/"+gWebsiteId+","+gWebsiteEnv+","+next,"GET").then( (data) => {
        tbody.insertAdjacentHTML('beforeend',data.visits);
        e.target.dataset.offset=next;
        span.textContent = data.progress;
        if (data.progress.includes(total)) {
            e.target.disabled=true;
        }     
    });
}

/* 
 ** GET WEBSIITE PRFORMANCE METRICS
 */
const get_performance = (e) => {
    execProcess( "performance/"+gWebsiteId+","+gWebsiteEnv,"GET").then( (data) => {
        logContent.replaceChildren();
        logContent.insertAdjacentHTML('afterbegin',data.content);
        logDialog.showModal();
    });
}

/*
 **  NEW WEBSITE
 */
const new_website = () => {
    execProcess( "website-options/0,TEST","GET").then( (data) => {
        logContent.replaceChildren();
        logContent.insertAdjacentHTML('afterbegin',data.content);
        logDialog.showModal();
    });
};

/* 
 ** CREATE NEW WEBSIITE PAGE. INSERTED AFTER SELECTED PAGE
 */
const new_page = (e) => {
    if (!gWebsiteId) {
        popupOpen("CANNOT DO THAT YET","Select a Website first");
        return;
    };
    execProcess( "page-options/"+gWebsiteId+",0","GET").then( (data) => {
        logContent.replaceChildren();
        logContent.insertAdjacentHTML('beforeend',data.content);
        logDialog.showModal();
    });
}

/* 
 ** CREATE NEW SUB PAGE
 */
const new_collection = (e) => {
    const selected = pageNav.querySelector(".selected"),
          parent = selected.closest("div").dataset.id,
          label = selected.textContent;

    let placeholder;
    if (e.target.classList.contains("new-media")) {
        placeholder = 'Upload Media for new ' + label;
    } else {
        placeholder = 'Enter content for new ' + label;
    }
    execProcess( "collection/"+parent,"POST").then( (data) => {
        gArticleId = data.article_id;
        editor_status = "init";
        editor_status_text.textContent = "";
        editor.setData("");
        editor.editing.view.document.getRoot( 'main' ).placeholder =  placeholder;
        galleryList.replaceChildren();
        if (editor.isReadOnly) {
            editor.disableReadOnlyMode( 'lock-id' );
        }
    });
}

/* 
 ** SHOW SUB PAGES. RETURNED AS AN ORDERED LIST OF ITEMS TO BE INSERTED IN DROPDOWN COMPONENT
 */
const show_subpages = (e) => {

    const parent = e.target.closest("[data-id]"),
          parent_id = parent.dataset.id,
          collection = e.target.dataset.collection;

    /* Set "selected" class on corresponding nav-label if not already selected */
    if (!parent.querySelector("a.selected")) {
        selected_nav(pageNav, parent_id);
    }

    execProcess( "articles/"+gWebsiteEnv+","+parent_id+","+gArticleId,"GET").then( (data) => {
        if (data.html) {
            gArticleId = parent_id;
            editor_status = "init";
            editor_status_text.textContent = data.updated_date;
            editor.setData(data.html);
            if (editor.isReadOnly) {
                editor.disableReadOnlyMode( 'lock-id' );
            }
        }
        galleryList.replaceChildren();
        if (data.thumbnails) {
            galleryList.insertAdjacentHTML('afterbegin',data.thumbnails);
            lazyload();
        }

        const list = e.target.nextElementSibling;

        if (!data.content) {
            popupOpen("NO "+collection+" PAGES YET","Click NEW " + collection + " to create");
            list.classList.toggle("visible", false);
            return;
        }

        const nav = pageNav.getBoundingClientRect(),
              button = e.target.getBoundingClientRect();
          
        if (collection==="BLOG" || collection==="PRODUCT") {
            if (button.x - nav.x < (nav.x + nav.width - button.x)) {
                list.style.left = "0";
                list.style.right = "auto";
                list.style.maxWidth = `${nav.x + nav.width - button.x}px`;
            } else {
                list.style.right = "0";
                list.style.left = "auto";
                list.style.maxWidth = `${button.x - nav.x}px`;
                list.style.top = "3.5ch";
            }
        } else {
            list.style.left = `-${button.x - nav.x}px`;
            list.style.right = "auto";
            list.style.top = "3.5ch";
            list.style.maxWidth = `${nav.width}px`;
            list.classList.add("gallery-list");
        }
        list.replaceChildren();
        list.insertAdjacentHTML('afterbegin',data.content);
        /* 
        **  ENABLE DRAG AND DROP 
        */
        new Sortable(list, {
            sort: true,
            animation: 150,
            ghostClass: 'drag-in-progress',
            store: {
                set: async function (sortable) {
                    execProcess("reorder/" + gArticleId, "PUT", {table_name: "article", dbid_string: sortable.toArray().join(":")} ).then( () => {
                        console.log("sub pages reordered");
                    });
                }
            }
        });
    });
}

/* 
 ** UPLOAD MEDIA TO CLOUDINARY
 */
const upload_media = () => {
    if (!gArticleId) {
        popupOpen("CANNOT DO THAT YET","Select a PAGE then upload media");
        return;
    }
    execProcess( "cld-details","GET").then( (data) => {
        widget.open();
        widget.update({tags: [gArticleId], cloudName: data.cloudname, api_key: data.apikey,  maxImageFileSize: data.maxImageFileSize, maxVideoFileSize: data.maxVideoFileSize, googleApiKey: data.googleApiKey});
    });
}

/* 
 ** ASSIGN "selected" CLASS TO CLICKED NAV ITEM. UPDATE UI ACCORDINGLY
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
 ** GET SELECTED ARTICLE CONTENT FOR RICH TEXT EDITOR. REPLACE GALLERY. 
 */
const edit_text = (e) => {
    execProcess( "article/"+gArticleId,"GET").then( (data) => {
        if (data.readonly) {
            editor.enableReadOnlyMode( 'lock-id' );
            editor_status_text.textContent = data.updated_date + " - EDIT IN CODEPEN";
        } else {
            editor.disableReadOnlyMode( 'lock-id' );
            editor_status_text.textContent = data.updated_date
        }
        editor_status = "init";        
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
            js: data.js,
            editors: "110"
        };
        const input = form.querySelector("[name='data']");
        //let JSONstring = JSON.stringify(formdata);
            //.replace(/"/g, "&quot;")
            //.replace(/'/g, "&apos;");
        input.value = JSON.stringify(formdata);
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

    execProcess( "codepen/"+gWebsiteId+","+gArticleId,"POST",file).then( (data) => {
        if (data.html) {
            editor_status = "init";        
            editor.setData(data.html);
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
delete_media = (e) => {
    const id = e.target.closest("details").dataset.id;
    execProcess("dml","DELETE",{table_name: "asset", asset_id: id}).then( () => {
        galleryList.querySelector("[data-id='"+id+"']").remove();
        logDialog.close();
    });
}

/*
 ** DELETE PAGE, I.E WEBSITE_ARTICLE
 */
delete_page = () => {
    execProcess("dml","DELETE",{table_name: "website_article", website_id: gWebsiteId, article_id: gArticleId}).then( (data) => {
        if (data.message) {
            editor_status_text.textContent = data.message;
            logDialog.close();
            return;
        }
        let selected = pageNav.querySelector("[data-id='"+gArticleId+"']");
        gArticleId = 0;
        selected.remove();
        editor_status = "init";
        editor_status_text.textContent = "PAGE DELETED";
        editor.setData("");
        editor.enableReadOnlyMode( 'lock-id' );
        galleryList.replaceChildren();
        logDialog.close();
    });
}

/*
 ** DELETE ARTICLE - I.E SUBPAGE LIKE BLOG  OR MEDiA ITEM
 */
delete_article = () => {
    execProcess("dml","DELETE",{table_name: "article", article_id: gArticleId}).then( () => {
        gArticleId = 0;
        editor_status = "init";
        editor_status_text.textContent = "SUB-PAGE DELETED";
        editor.setData("");
        editor.enableReadOnlyMode( 'lock-id' );
        galleryList.replaceChildren();
        logDialog.close();
    });
}

/*
 ** DELETE WEBSITE
 */
const delete_website = () => {
    execProcess("dml","DELETE",{table_name: "website", website_id: gWebsiteId, website_env: gWebsiteEnv}).then( () => {
        websiteNav.querySelector("a").style.textDecorationLine = "line-through";
        websiteNav.querySelector(".edit-website[data-id='"+gWebsiteId+"'][data-env='"+gWebsiteEnv+"']").parentElement.remove();
        if (websiteNav.querySelector("hr + hr")) {
            websiteNav.querySelector("hr + hr").remove();
        }
        if (websiteNav.querySelector(".dropdown-items").childElementCount===0) {
            websiteNav.querySelector(".show-dropdown").style.display = "none";
        }
        gWebsiteId = 0;

        pageNav.replaceChildren();
        editor_status = "init";
        editor_status_text.textContent = "WEBSITE DELETED";
        editor.setData("");
        editor.enableReadOnlyMode( 'lock-id' );
        galleryList.replaceChildren();
        logDialog.close();
    });
}

/*
 ** DELETE USER
 */
const delete_user = () => {
    execProcess("dml","DELETE",{table_name: "users"}).then( (data) => {
        if (data.deleted===0) {
            document.querySelector(".signout").click();
        } else {
            popupOpen("Delete Websites", "To avoid inadvertent loss, delete your websites first");
        }
    });
}