/* 
 ** INITIALIZE CLOUDINARY UPLOAD WIDGET
 */

import { bodydata } from "deploy_elements";
import { callAPI, handleError } from "deploy_callAPI";

let endpoint;

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
export const widget=cloudinary.createUploadWidget(
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
        use_filename: true,
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
                    console.log("Uploaded MEDIA metadata successfully");
                })
                .catch((error) => {
                    handleError(error);
                });
        };
    }
);