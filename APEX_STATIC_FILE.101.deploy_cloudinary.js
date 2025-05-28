import { callAPI, handleError } from "deploy_callAPI";

/* 
 ** CREATE CLOUDINARY UPLOAD WIDGET
 */
export let widget;

const createWidget = () => {
    widget=cloudinary.createUploadWidget(
    { 
        uploadPreset: 'npxwdk7x',
        cloudName: 'mrbapex'
    },
    (error, result) => {
        if (!error && result && result.event === "success") { 
            console.log('Done! Here is the image info: ', result.info);
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
            callAPI("cloudinary/:ID/:PAGE","PUT",metadata)
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
const script = document.createElement('script');
script.setAttribute('src', "https://upload-widget.cloudinary.com/latest/global/all.js");
script.onload = createWidget;
document.head.appendChild(script);