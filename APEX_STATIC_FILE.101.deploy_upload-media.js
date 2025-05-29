/* 
 ** OPEN CLOUDINARY MEDIA UPLOAD WIDGET
 */

import { bodydata } from "deploy_elements";
import { callAPI, handleError } from "deploy_callAPI";

let widget, endpoint;

export const init = (element) => {
    endpoint = element.dataset.endpoint;
    widget.open();
    widget.update({tags: [bodydata.articleid]});
}

/* 
 ** CREATE CLOUDINARY UPLOAD WIDGET
 */


const createWidget = () => {
    const arrayToken = localStorage.getItem("refresh").split(".");
    const parsedToken = JSON.parse(atob(arrayToken[1]));
    const cloudName = parsedToken.cld_cloud_name;
    const uploadPreset = parsedToken.cld_upload_preset;
    
    console.log("createWidget",cloudName,uploadPreset);
    widget=cloudinary.createUploadWidget(
    { 
        uploadPreset: uploadPreset,
        cloudName: cloudName
    },
    (error, result) => {
        if (!error && result && result.event === "success") { 
            console.log('Done! Here is the image info: ', result.info);
            let metadata = {
                images: []
            }
            metadata.images.push({
                "public_id": result.info.public_id,
                "bytes": result.info.bytes,
                "resource_type": result.info.resource_type,
                "width": result.info.width,
                "height": result.info.height,
                "format": result.info.format,
                "cld_cloud_name": result.info.url.split("/")[3],
                "article_id": result.info.tags[0]
            });
            callAPI(endpoint,"PUT",metadata)
                .then( (data) => {
                    console.log("Uploaded MEDIA metadata successfully");
                })
                .catch((error) => {
                    handleError(error);
                });
        }
    }
)};

/* 
** ADD CLOUDINARY UPLOAD WIDGET LIBRARY AND CREATE WIDGET
*/
if (!document.querySelector("head > script[src='https://upload-widget.cloudinary.com/latest/global/all.js']")) {
    const script = document.createElement('script');
    script.setAttribute('src', "https://upload-widget.cloudinary.com/latest/global/all.js");
    script.onload = createWidget;
    document.head.appendChild(script);
}