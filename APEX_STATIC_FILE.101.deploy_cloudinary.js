/* 
 ** INITIALIZE CLOUDINARY UPLOAD WIDGET
 */

import { info_dialog, bodydata } from "./deploy_elements.min.js";
import { callAPI, handleError } from "./deploy_callAPI.min.js";

let endpoint, widget;

export const init = (element) => {
    endpoint = element.dataset.endpoint;
    callAPI( endpoint,"GET","?request=details")
        .then( (data) => {
            widget.open();
            widget.update({tags: [bodydata.articleid], cloudName: data.cloudname, api_key: data.apikey,  maxImageFileSize: data.maxImageFileSize, maxVideoFileSize: data.maxVideoFileSize, googleApiKey: data.googleApiKey});
        })
        .catch((error) => {
            handleError(error);
        });
}

/* 
 ** GENERATE SIGNATURE ON SERVER FOR CLOUDINARY SUSCRIBER IN ORDER TO ENABLE SECURE MEDIA UPLOAD
 */
const getCldSignature = async (callback, params_to_sign) => {
    callAPI(endpoint, "POST", params_to_sign)
        .then((data) => {
            callback(data.signature);
        })
        .catch((error) => {
            handleError(error);
        });
};

/* 
 ** CREATE CLOUDINARY UPLOAD WIDGET
 */
const createWidget = () => {
    widget=cloudinary.createUploadWidget(
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
            for (let i=0; i<data.files.length; i++) {
                if (data.files[i].name.length>maxLength) {
                    errors++;
                }
            }
            if (errors>0) {
                handleError("Files names selected for upload must be no greater than " + maxLength + " characters in length");
                cb({cancel: true}); 
            } else { 
                cb({}); 
            }
        }
    },
    (error, result) => {
        if (error) {
            handleError("FAILURE IN CLOUDINARY UPLOAD = " + error.message);
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
            callAPI(endpoint,"PUT",metadata)
                .then( (data) => {
                    const article = info_dialog.querySelector("article");
                    article.replaceChildren();
                    article.insertAdjacentHTML('afterbegin',data.thumbnails);
                    info_dialog.showModal();
                })
                .catch((error) => {
                    handleError(error);
                });
        };
    }
)};

/* 
** Add CLOUDINARY UPLOAD WIDGET LIBRARY - THEY DON'T PROVIDE ES MODULE. BOO. 
*/
const script = document.createElement('script');
script.setAttribute('src', "https://upload-widget.cloudinary.com/latest/global/all.js");
script.onload = createWidget;
document.head.appendChild(script);