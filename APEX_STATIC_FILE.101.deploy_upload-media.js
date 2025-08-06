/* 
 ** CREATE AND OPEN CLOUDINARY UPLOAD WIDGET
 */

import { bodydata } from "deploy_elements";
import { callAPI, handleError } from "deploy_callAPI";

let widget;

const createWidget =  () => {
    const arrayToken = localStorage.getItem("refresh").split(".");
    const parsedToken = JSON.parse(atob(arrayToken[1]));
    const cloudName = parsedToken.cld_cloud_name;
    const uploadPreset = parsedToken.cld_upload_preset;
    
    console.log("createWidget",cloudName,uploadPreset);
    widget=cloudinary.createUploadWidget(
    { 
        uploadPreset: uploadPreset,
        cloudName: cloudName,
        multiple: false,
        cropping: true,
        singleUploadAutoClose: false,
        clientAllowedFormats: 'image',
        maxFiles: 1
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
            callAPI("upload-media/:ID/:PAGE","PUT",metadata)
                .then( () => {
                    console.log("Uploaded MEDIA metadata successfully");
                })
                .catch((error) => {
                    handleError(error);
                });
        }
    });
};

const loadScript = async (url) => {
    return new Promise((resolve, reject) => {
        if (widget) {
            resolve("Widget already created");
            return;
        }

        let script = document.createElement('script');

        script.addEventListener('load', () => {
            createWidget();
            resolve("Cloudinary Upload Widget created");
        });

        script.addEventListener('error', () => {
            reject("Cloudinary upload widget script failed to load");
        });

        script.src = url;
        document.head.appendChild(script);
  });
}

export const init = () => {
    loadScript("https://upload-widget.cloudinary.com/latest/global/all.js")
        .then((result) => {
            console.log(result);
            widget.open();
            widget.update({tags: [bodydata.articleid]});
        })
        .catch((error) => handleError(error));
}