/* 
 ** GENERATE SIGNATURE FOR CLOUDINARY SUSCRIBER TO ENABLE SECURE MEDIA UPLOAD
 */
const getCldSignature = async (callback, params_to_sign) => {
    execProcess("getCldSignature",{p_clob_01: JSON.stringify(params_to_sign)}).then( (data) => {
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
                        "article_id": item.uploadInfo.tags[0]
                    });
                }
            });
            execProcess("uploadMetadata",{p_clob_01: JSON.stringify(metadata)}).then( (data) => {
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
                li.querySelector(".show-gallery").textContent = "1/" + data.nbAssets;
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

window.addEventListener("DOMContentLoaded", () => {
    if (navigator.maxTouchPoints > 1) {
            cards.addEventListener("touchstart",cardHandlerAuth);
            //galleryList.addEventListener("touchstart",showLightbox);
    } else {
        cards.addEventListener("click",cardHandlerAuth);
        //galleryList.addEventListener("click",showLightbox);
    }
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
    execProcess( "publishArticle", {x01: articleId, x02: "Y"}).then( (data) => {
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
    execProcess( "publishArticle", {x01: articleId, x02: "N"}).then( () => {
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
    } else if (e.target.matches(".copy-card")) {
        copy_card(articleId);  
    } else if (e.target.matches(".publish")) {
        publish_article(articleId, e.srcElement);  
    } else if (e.target.matches(".unpublish")) {
        unpublish_article(articleId, e.srcElement);                                 
    }
}

/*
 *  Global variables that are set throughout the code to support GALLERY and LIGHTBOX components
 */
let selectedElement,
    lastTag,
    lightbox_touchstartX = 0,
    lightbox_touchendX = 0
    timeout = false;

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